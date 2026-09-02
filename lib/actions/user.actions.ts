'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth, signIn, signOut } from '@/auth';
import { CredentialsSignin } from '@auth/core/errors';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { hashSync } from 'bcrypt-ts-edge';
import {
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
  updateProfileSchema,
  updateUserSchema,
} from '../validator';
import { formatError } from '../utils';
import { PAGE_SIZE } from '../constants';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import { getValidUserId } from '../auth-helpers';
import { rateLimit } from '../rate-limit';
import { normalizeIranMobile } from '../phone';
import { OTP_TTL_MS } from '@/auth';
import { generateOtpCode } from '@/lib/otp';
import { isSmsConfigured, sendVerificationSms } from '@/lib/sms/smsir';
import { issueContactCode, validateContactChange } from '../contact';
import type { ContactType } from '../contact';
import type { ActionState } from '@/types';

// Update the signed-in user's profile extras (name + optional fields).
// Email/mobile are changed exclusively through updateContact (verified).
export async function updateProfile(
  user: z.infer<typeof updateProfileSchema>
) {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    const profile = updateProfileSchema.parse(user);

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: profile.name,
        nationalId: profile.nationalId || null,
        cardNumber: profile.cardNumber || null,
        sheba: profile.sheba || null,
        birthDate: profile.birthDate ? new Date(profile.birthDate) : null,
      },
    });

    return {
      success: true,
      message: await withActionMessage('userUpdated'),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Set the signed-in user's avatar. The URL comes from /api/upload, which
// only returns URLs in our own bucket — validate that before storing.
export async function updateProfileImage(imageUrl: string) {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    const bucketBase = process.env.ARVAN_PUBLIC_BASE_URL?.replace(/\/$/, '');
    const fallbackBase = `https://${process.env.ARVAN_BUCKET}.s3.${
      process.env.ARVAN_REGION ?? 'ir-thr-at1'
    }.arvanstorage.ir`;
    const ok = [bucketBase, fallbackBase]
      .filter(Boolean)
      .some((base) => imageUrl.startsWith(`${base}/`));
    if (!ok) throw new Error(await withActionMessage('invalidValue'));

    await prisma.user.update({ where: { id: userId }, data: { image: imageUrl } });
    revalidatePath('/user/profile');

    return {
      success: true,
      message: await withActionMessage('userUpdated'),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Remove the signed-in user's avatar (the stored object stays in the bucket
// under a random key; no other row references it).
export async function clearProfileImage() {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    await prisma.user.update({ where: { id: userId }, data: { image: null } });
    revalidatePath('/user/profile');

    return {
      success: true,
      message: await withActionMessage('userUpdated'),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/**
 * Change the signed-in user's email or mobile — requires BOTH verification
 * codes (previous contact + new contact) and runs atomically. Codes are
 * issued by requestContactChangeCode and verified against the server-side
 * pending map (never stored in the DB).
 */
export async function updateContact(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    const type = (formData.get('type') as ContactType) ?? 'email';
    if (type !== 'email' && type !== 'mobile') {
      throw new Error(await withActionMessage('invalidValue'));
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mobile: true },
    });

    const result = validateContactChange({
      type,
      oldCode: (formData.get('oldCode') as string) ?? '',
      newValue: (formData.get('newValue') as string) ?? '',
      newCode: (formData.get('newCode') as string) ?? '',
      currentValue:
        type === 'email' ? currentUser?.email ?? null : currentUser?.mobile ?? null,
    });
    if (!result.ok) {
      throw new Error(await withActionMessage(result.messageKey));
    }

    // Uniqueness excluding the current user
    const conflict = await prisma.user.findFirst({
      where:
        type === 'email'
          ? { email: result.value, NOT: { id: userId } }
          : { mobile: `+98${result.value.replace('+98', '')}`, NOT: { id: userId } },
    });
    if (conflict) throw new Error(await withActionMessage('accountExists'));

    const data =
      type === 'email' ? { email: result.value } : { mobile: `+98${result.value}` };

    // Atomic: the contact swap must fully succeed or fully fail
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data }),
    ]);

    revalidatePath('/user/profile');
    revalidatePath('/', 'layout');

    return {
      success: true,
      message:
        type === 'email'
          ? await withActionMessage('emailUpdated')
          : await withActionMessage('mobileUpdated'),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/**
 * Send the verification codes for a contact change: one to the CURRENT
 * contact (proves the account owner) and one to the NEW contact (proves the
 * new address is owned). Rate limited per user per contact type.
 */
export async function requestContactChangeCode(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    const type = (formData.get('type') as ContactType) ?? 'email';
    const newValueRaw = ((formData.get('newValue') as string) ?? '').trim();

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mobile: true },
    });

    // Validate the NEW value up front so bad input fails before any send
    const normalizedNew =
      type === 'mobile' ? normalizeIranMobile(newValueRaw) : isValidEmailShape(newValueRaw) ? newValueRaw.trim().toLowerCase() : null;
    if (!normalizedNew) {
      return {
        success: false,
        message: await withActionMessage(
          type === 'email' ? 'invalidEmail' : 'invalidPhone'
        ),
      };
    }

    const rl = rateLimit(`contact-change:${userId}:${type}`, 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      return {
        success: false,
        message: await withActionMessage('tooManyAttempts', {
          seconds: rl.retryAfterSeconds ?? 60,
        }),
      };
    }

    const currentContact =
      type === 'email' ? currentUser?.email ?? null : currentUser?.mobile ?? null;
    if (!currentContact) {
      throw new Error(await withActionMessage('sessionExpired'));
    }

    // Uniqueness excluding the current user — before sending codes
    const conflict = await prisma.user.findFirst({
      where:
        type === 'email'
          ? { email: normalizedNew, NOT: { id: userId } }
          : { mobile: normalizedNew, NOT: { id: userId } },
    });
    if (conflict) throw new Error(await withActionMessage('accountExists'));

    const [oldOk, newOk] = await Promise.all([
      issueContactCode(type, 'old', currentContact),
      issueContactCode(type, 'new', normalizedNew),
    ]);
    if (!oldOk || !newOk) {
      throw new Error(await withActionMessage('otpSendFailed'));
    }

    return { success: true, message: await withActionMessage('otpSentReal') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

function isValidEmailShape(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Update the signed-in user's preferred payment method
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>
) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id as string },
    });
    if (!currentUser) throw new Error('User not found');

    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { paymentMethod: paymentMethod.type },
    });

    return { success: true, message: await withActionMessage('userUpdated') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get user by ID
export async function getUserById(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });

  if (!user) throw new Error('User not found');
  return user;
}

const messages = {
  en: {
    invalidCredentials: 'Invalid email or password',
    unexpected: 'Something went wrong',
  },
  fa: {
    invalidCredentials: 'ایمیل یا رمز عبور اشتباه است',
    unexpected: 'خطایی رخ داد',
  },
} as const;

type LoginMessageKey = keyof typeof messages.en;

async function msg(key: LoginMessageKey): Promise<string> {
  const locale = ((await getLocale()) as 'fa' | 'en') ?? 'en';
  return messages[locale]?.[key] ?? messages.en[key];
}

// Next.js control-flow exceptions must be rethrown inside server actions
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/**
 * Thrown when signIn() fails for a non-credential reason — almost always a
 * stale session cookie that Auth.js cannot decrypt. The action clears the
 * cookies and the client transparently retries once.
 */
class RetryableSignInError extends Error {}

async function clearAuthCookies() {
  try {
    const store = await cookies();
    for (const name of [
      'authjs.session-token',
      '__Secure-authjs.session-token',
    ]) {
      store.delete(name);
    }
  } catch {
    /* cookie store unavailable — nothing to clear */
  }
}

/**
 * Perform a credentials sign-in against Auth.js with redirect disabled.
 * Success detection: signIn() only throws CredentialsSignin on BAD
 * credentials. If it resolves — regardless of its return shape (some
 * platforms return undefined) — the session cookie was written.
 * Returns true when a session cookie has been established.
 */
async function establishCredentialsSession(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    // Only an explicit error parameter means failure. Missing/odd return
    // shapes are success — the reload behavior proved the cookie is set.
    if (typeof result === 'string') {
      try {
        const url = new URL(result, 'http://localhost');
        if (url.searchParams.has('error')) return false;
        if (/sign-in/i.test(url.pathname)) return false;
      } catch {
        /* non-URL result — treat as success */
      }
    }
    return true;
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof CredentialsSignin) return false;

    // Stale/unreadable session cookie (JWTSessionError etc.): clear the
    // cookies so the NEXT request succeeds, then ask the client to retry.
    await clearAuthCookies();
    throw new RetryableSignInError();
  }
}

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/';
  try {
    // Brute-force guard: 5 attempts / 5 minutes per email
    const emailRaw =
      (formData.get('email') as string | null)?.toLowerCase() || 'unknown';
    const rl = rateLimit(`signin:${emailRaw}`, 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      return {
        success: false,
        message: await withActionMessage('tooManyAttempts', {
          seconds: rl.retryAfterSeconds ?? 60,
        }),
      };
    }

    const parsed = signInFormSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    if (!parsed.success) {
      return { success: false, message: formatError(parsed.error) };
    }

    const ok = await establishCredentialsSession(
      parsed.data.email,
      parsed.data.password
    );
    if (!ok) {
      return {
        success: false,
        message: await msg('invalidCredentials'),
      };
    }

    // Admins land on the admin panel unless a specific path was requested
    if (callbackUrl === '/') {
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { role: true },
      });
      if (user?.role === 'admin') redirect('/admin');
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof RetryableSignInError) {
      // Auth cookies were cleared — the client retries once automatically
      return { success: false, message: '', retry: true };
    }
    return { success: false, message: formatError(error) };
  }
  redirect(callbackUrl);
}

/**
 * SMS-OTP sign-in against the 'sms' provider. Same no-throw success
 * detection as the credentials flow.
 */
async function establishSmsSession(
  phone: string,
  code: string
): Promise<boolean> {
  try {
    // Must target the 'sms' provider — the credentials provider expects
    // email/password and would always fail here.
    await signIn('sms', { phone, code, redirect: false });
    return true;
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof CredentialsSignin) return false;

    await clearAuthCookies();
    throw new RetryableSignInError();
  }
}

/**
 * Request a one-time code for a phone number. Sends via SMS.ir when
 * SMSIR_API_KEY + SMSIR_OTP_TEMPLATE_ID are configured; otherwise (dev/CI)
 * stores the fixed master code 123456 and logs it to the server console.
 * Rate limited: 3 requests / 10 minutes per phone.
 */
export async function requestPhoneOtp(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    // Accepts 09…, 9…, +989… — stored/compared as +989XXXXXXXXX
    const phone = normalizeIranMobile(
      (formData.get('phone') as string | null) ?? ''
    );
    if (!phone) {
      return {
        success: false,
        message: await withActionMessage('invalidPhone'),
      };
    }

    const rl = rateLimit(`otp:${phone}`, 3, 10 * 60 * 1000);
    if (!rl.allowed) {
      return {
        success: false,
        message: await withActionMessage('tooManyAttempts', {
          seconds: rl.retryAfterSeconds ?? 60,
        }),
      };
    }

    // Real gateway when configured, fixed master code otherwise. Valid 5 min.
    const code = isSmsConfigured() ? generateOtpCode() : '123456';
    const sent = await sendVerificationSms(phone, code);
    if (!sent.ok) {
      return {
        success: false,
        message: await withActionMessage('otpSendFailed'),
      };
    }

    // The composite PK (identifier, token) is identical for repeat requests
    // of the same code — clear the old row first to avoid P2002.
    await prisma.verificationToken.deleteMany({
      where: { identifier: `otp:${phone}` },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: `otp:${phone}`,
        token: code,
        expires: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    if (!isSmsConfigured()) {
      console.info(`[SMS:dev-fallback] OTP for ${phone}: ${code}`);
    }

    return {
      success: true,
      message: await withActionMessage(
        isSmsConfigured() ? 'otpSentReal' : 'otpSent'
      ),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Check whether a mobile number belongs to a registered user (used by the
// sign-in "send code" step so unregistered numbers get pointed to sign-up)
export async function checkPhoneRegistered(
  phone: string
): Promise<{ registered: boolean }> {
  const normalized = normalizeIranMobile(phone);
  if (!normalized) return { registered: false };

  const user = await prisma.user.findFirst({
    where: { mobile: normalized },
    select: { id: true },
  });
  return { registered: !!user };
}

// Sign user out — back to the homepage with a fresh guest cart cookie
export async function SignOutUser() {
  try {
    (await cookies()).delete('sessionCartId');
  } catch {
    /* cookie store unavailable */
  }
  await signOut({ redirectTo: '/' });
}

// Get all users for the admin table with optional name/email search + pagination
export async function getAllUsers({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query?: string;
}) {
  await requireAdmin();

  const queryFilter =
    query && query.trim() !== ''
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { email: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {};

  const data = await prisma.user.findMany({
    where: queryFilter,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.user.count({ where: queryFilter });

  return {
    data: JSON.parse(JSON.stringify(data)) as {
      id: string;
      name: string;
      email: string;
      role: string;
      createdAt: Date;
    }[],
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Update a user's name and role (admin)
export async function updateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const user = updateUserSchema.parse({
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      role: formData.get('role') as string,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { name: user.name, role: user.role },
    });

    return { success: true, message: await withActionMessage('userUpdated') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete a user (admin; cannot delete yourself)
export async function deleteUser(id: string) {
  try {
    const session = await requireAdmin();

    if (session.user?.id === id) {
      throw new Error(await withActionMessage('cannotDeleteSelf'));
    }

    await prisma.user.delete({ where: { id } });

    return { success: true, message: await withActionMessage('userDeleted') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Register a new user, then sign them in
export async function signUpUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/';
  try {
    // Abuse guard: 3 sign-ups / hour per email
    const emailRaw =
      (formData.get('email') as string | null)?.toLowerCase() || 'unknown';
    const rl = rateLimit(`signup:${emailRaw}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return {
        success: false,
        message: await withActionMessage('tooManyAttempts', {
          seconds: rl.retryAfterSeconds ?? 60,
        }),
      };
    }

    const parsed = signUpFormSchema.safeParse({
      name: formData.get('name') ?? '',
      mode: formData.get('mode') ?? 'email',
      email: (formData.get('email') as string | null) ?? '',
      mobile: normalizeIranMobile(
        (formData.get('mobile') as string | null) ?? ''
      )?.replace('+98', '') ?? '',
      password: (formData.get('password') as string | null) ?? '',
      confirmPassword: (formData.get('confirmPassword') as string | null) ?? '',
      otpCode: (formData.get('otpCode') as string | null) ?? '',
    });
    if (!parsed.success) {
      return { success: false, message: formatError(parsed.error) };
    }

    const { name, mode, email, mobile, password, otpCode } = parsed.data;

    // Duplicate guard with a friendly message (when a value is provided)
    const dupConditions = [];
    if (email) dupConditions.push({ email });
    if (mobile) dupConditions.push({ mobile });
    if (dupConditions.length > 0) {
      const existing = await prisma.user.findFirst({
        where: { OR: dupConditions },
      });
      if (existing) {
        return {
          success: false,
          message: await withActionMessage('accountExists'),
        };
      }
    }

    await prisma.user.create({
      data: {
        name,
        email: email || null,
        mobile: mobile ? `+98${mobile}` : null,
        password: password ? hashSync(password, 10) : null,
      },
    });

    if (mode === 'email') {
      const ok = await establishCredentialsSession(email, password);
      if (!ok) {
        // Account exists but auto sign-in failed — send to sign-in page.
        redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } else {
      // OTP sign-up: sign in via the SMS provider (mobile normalized)
      const ok = await establishSmsSession(`+98${mobile}`, otpCode);
      if (!ok) {
        redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    }

    // New users complete their profile next
    redirect('/user/profile');
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof RetryableSignInError) {
      return { success: false, message: '', retry: true };
    }
    return { success: false, message: formatError(error) };
  }
  redirect(callbackUrl);
}