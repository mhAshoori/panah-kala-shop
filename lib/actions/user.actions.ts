'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
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
import { MOCK_OTP_CODE, OTP_TTL_MS } from '@/auth';
import type { ActionState } from '@/types';

// Update the signed-in user's profile (extras are optional)
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
        mobile: profile.mobile,
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
    await signIn('credentials', { phone, code, redirect: false });
    return true;
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof CredentialsSignin) return false;

    await clearAuthCookies();
    throw new RetryableSignInError();
  }
}

/**
 * Request a one-time code for a phone number. In development the code is
 * always the mock master code (123456) and is logged to the server console.
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

    // Mock SMS gateway: fixed master code, valid 5 minutes.
    // The composite PK (identifier, token) is identical for repeat requests
    // of the same mock code — clear the old row first to avoid P2002.
    await prisma.verificationToken.deleteMany({
      where: { identifier: `otp:${phone}` },
    });
    await prisma.verificationToken.create({
      data: {
        identifier: `otp:${phone}`,
        token: MOCK_OTP_CODE,
        expires: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    console.info(`[SMS:mock] OTP for ${phone}: ${MOCK_OTP_CODE}`);

    return {
      success: true,
      message: await withActionMessage('otpSent'),
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

// Sign user out — back to the sign-in page
export async function SignOutUser() {
  await signOut({ redirectTo: '/sign-in' });
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