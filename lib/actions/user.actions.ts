'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth, signIn, signOut } from '@/auth';
import { CredentialsSignin } from '@auth/core/errors';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { hashSync, compareSync } from 'bcrypt-ts-edge';
import { createHash, randomBytes } from 'crypto';
import { headers } from 'next/headers';
import {
  signUpFormSchema,
  paymentMethodSchema,
  updateProfileSchema,
  updateUserSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validator';
import { formatError } from '../utils';
import { PAGE_SIZE } from '../constants';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import { getValidUserId } from '../auth-helpers';
import { recordNotification } from '../notifications';
import { rateLimit } from '../rate-limit';
import { normalizeIranMobile } from '../phone';
import { OTP_TTL_MS } from '@/auth';
import { generateOtpCode } from '@/lib/otp';
import { isSmsConfigured, sendVerificationSms } from '@/lib/sms/smsir';
import { checkSmsOtp } from '@/lib/sms/verify-otp';
import type { PhoneAccountStatus } from '@/lib/phone-otp-intent';
import { OTP_RESEND_COOLDOWN_SECONDS } from '@/lib/constants';
import { issueContactCode, validateContactChange } from '../contact';
import type { ContactType } from '../contact';
import { sendEmail } from '@/lib/email/mailer';
import { APP_NAME } from '../constants';
import type { ActionState } from '@/types';

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
 * Change the signed-in user's password. Accounts with an existing password
 * must confirm the current one; OAuth/SMS-only accounts set their first
 * password without it.
 */
export async function changePassword(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });
    if (!parsed.success) {
      throw new Error(formatError(parsed.error));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(await withActionMessage('sessionExpired'));

    if (user.password) {
      const { currentPassword } = parsed.data;
      if (!currentPassword || !compareSync(currentPassword, user.password)) {
        throw new Error(await withActionMessage('wrongCurrentPassword'));
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashSync(parsed.data.newPassword, 10) },
    });

    return { success: true, message: await withActionMessage('passwordChanged') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Request a password-reset email. Always reports success (no user probing). */
export async function requestPasswordReset(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get('email'),
    });
    if (!parsed.success) {
      throw new Error(formatError(parsed.error));
    }

    const ip =
      (await headers()).get('x-forwarded-for') ?? 'local';
    const rl = rateLimit(`pwreset:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      throw new Error(await withActionMessage('tooManyAttempts'));
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      await prisma.verificationToken.create({
        data: {
          identifier: `pwreset:${email}`,
          token: hashResetToken(token),
          expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const link = `${siteUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await sendEmail({
        to: email,
        subject: APP_NAME + ' — ' + (await withActionMessage('resetEmailSubject')),
        html: resetEmailHtml(link),
      });
    }

    return { success: true, message: await withActionMessage('resetEmailSent') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Complete a password reset with the emailed token. */
export async function resetPassword(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = resetPasswordSchema.safeParse({
      token: formData.get('token'),
      newPassword: formData.get('newPassword'),
      confirmPassword: formData.get('confirmPassword'),
    });
    if (!parsed.success) {
      throw new Error(formatError(parsed.error));
    }

    const email = String(formData.get('email') ?? '').toLowerCase();
    const identifier = `pwreset:${email}`;
    const hashed = hashResetToken(parsed.data.token);

    const row = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token: hashed } },
    });
    if (!row || row.expires < new Date()) {
      throw new Error(await withActionMessage('resetLinkInvalid'));
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashSync(parsed.data.newPassword, 10) },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token: hashed } },
      }),
    ]);

    return { success: true, message: await withActionMessage('passwordReset') };
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

    // Uniqueness excluding the current user — before sending codes
    const conflict = await prisma.user.findFirst({
      where:
        type === 'email'
          ? { email: normalizedNew, NOT: { id: userId } }
          : { mobile: normalizedNew, NOT: { id: userId } },
    });
    if (conflict) throw new Error(await withActionMessage('accountExists'));

    // Adding a FIRST contact: no previous contact exists, so only the new
    // contact needs its code. Otherwise both old + new codes are issued.
    if (currentContact) {
      const oldOk = await issueContactCode(type, 'old', currentContact);
      if (!oldOk) throw new Error(await withActionMessage('otpSendFailed'));
    }
    const newOk = await issueContactCode(type, 'new', normalizedNew);
    if (!newOk) throw new Error(await withActionMessage('otpSendFailed'));

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
    // getValidUserId (DB-truth) — an undefined id would make Prisma ignore
    // the filter entirely and match the first user in the table
    const userId = await getValidUserId();
    if (!userId) throw new Error('User not found');

    const currentUser = await prisma.user.findFirst({
      where: { id: userId },
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

// Get user by ID. Server actions are public RPC — this must never return
// sensitive fields (incl. passwordHash) to an arbitrary caller. The profile/
// checkout pages resolve the id server-side; admins may look anyone up.
export async function getUserById(userId: string) {
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';
  if (!isAdmin && session?.user?.id !== userId) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      image: true,
      role: true,
      banned: true,
      paymentMethod: true,
      nationalId: true,
      cardNumber: true,
      sheba: true,
      birthDate: true,
      password: isAdmin,
    },
  });

  if (!user) throw new Error('User not found');
  return user;
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
 * Auth.js v5 with `redirect: false` does NOT throw on a bad credentials
 * submit — it converts CredentialsSignin into a returned URL pointing at the
 * error page with `?error=...`. So "no exception thrown" proves nothing; the
 * only reliable success test is whether the returned URL carries an error or
 * points back at sign-in.
 *
 * Shared by both providers so they cannot drift into disagreeing again — the
 * credentials path used to check this and the SMS path silently assumed
 * success, which is what made phone sign-up fail without a word.
 */
function signInUrlIndicatesFailure(result: unknown): boolean {
  if (typeof result !== 'string') return false; // undefined/odd shape = success
  try {
    const url = new URL(result, 'http://localhost');
    return url.searchParams.has('error') || /sign-in/i.test(url.pathname);
  } catch {
    return false; // non-URL result — treat as success
  }
}

/**
 * Perform a credentials sign-in against Auth.js with redirect disabled.
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
    return !signInUrlIndicatesFailure(result);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof CredentialsSignin) return false;

    // Stale/unreadable session cookie (JWTSessionError etc.): clear the
    // cookies so the NEXT request succeeds, then ask the client to retry.
    await clearAuthCookies();
    throw new RetryableSignInError();
  }
}

/**
 * SMS-OTP sign-in against the 'sms' provider. This is the one place the code
 * is spent: it calls the provider, whose authorize() consumes the OTP. The
 * returned URL is inspected because Auth.js reports a failed credential as a
 * URL, not a throw — checking only for exceptions reported every failure as
 * success.
 */
async function establishSmsSession(
  phone: string,
  code: string
): Promise<boolean> {
  try {
    // Must target the 'sms' provider — the credentials provider expects
    // email/password and would always fail here.
    const result = await signIn('sms', { phone, code, redirect: false });
    return !signInUrlIndicatesFailure(result);
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

    // Resend cool-down, separate from the bucket above: with codes living only
    // 2 minutes, two mistyped attempts can exhaust a 3-per-10-minutes limit
    // and lock a shopper out of a legitimate retry. This one paces resends
    // without consuming their request budget.
    const cooldown = rateLimit(
      `otpcooldown:${phone}`,
      1,
      OTP_RESEND_COOLDOWN_SECONDS * 1000
    );
    if (!cooldown.allowed) {
      return {
        success: false,
        message: await withActionMessage('tooManyAttempts', {
          seconds: cooldown.retryAfterSeconds ?? OTP_RESEND_COOLDOWN_SECONDS,
        }),
      };
    }

    // Real gateway when configured, fixed master code otherwise.
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
        token: createHash('sha256').update(code).digest('hex'),
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
): Promise<{ account: PhoneAccountStatus }> {
  // Public action — throttle so it can't be used to enumerate registered
  // mobile numbers at scale.
  //
  // 'unknown', NOT 'none': the throttle returns before the lookup runs, and
  // reporting "unregistered" on the strength of a check that never happened is
  // a false statement that also pushes the shopper into a duplicate-account
  // error on sign-up.
  const rl = rateLimit(`phonecheck:${phone.slice(-10)}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return { account: 'unknown' };

  const normalized = normalizeIranMobile(phone);
  if (!normalized) return { account: 'none' };

  try {
    const user = await prisma.user.findFirst({
      where: { mobile: normalized },
      select: { id: true, banned: true },
    });
    return {
      account: !user ? 'none' : user.banned ? 'banned' : 'active',
    };
  } catch {
    return { account: 'unknown' };
  }
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

// Ban / unban a user (admin; cannot ban yourself or other admins)
export async function setUserBanned(id: string, banned: boolean) {
  try {
    const session = await requireAdmin();

    if (session.user?.id === id) {
      throw new Error(await withActionMessage('cannotBanSelf'));
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (target?.role === 'admin') {
      throw new Error(await withActionMessage('cannotBanAdmin'));
    }

    await prisma.user.update({ where: { id }, data: { banned } });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${id}`);

    return {
      success: true,
      message: await withActionMessage(banned ? 'userBanned' : 'userUnbanned'),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Customer 360 (admin): profile + order/review/address aggregates
export async function getCustomerProfile(id: string) {
  await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      role: true,
      banned: true,
      image: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          totalPrice: true,
          isPaid: true,
          isDelivered: true,
        },
      },
      _count: { select: { orders: true, reviews: true, addresses: true } },
    },
  });
  if (!user) return null;

  const totals = await prisma.order.aggregate({
    where: { userId: id, isPaid: true },
    _sum: { totalPrice: true },
  });

  return JSON.parse(
    JSON.stringify({
      ...user,
      totalSpent: totals._sum.totalPrice ?? 0,
    })
  ) as {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    role: string;
    banned: boolean;
    image: string | null;
    createdAt: Date;
    orders: {
      id: string;
      createdAt: Date;
      // Whole Toman integer since 005-money-int-migration.
      totalPrice: number;
      isPaid: boolean;
      isDelivered: boolean;
    }[];
    _count: { orders: number; reviews: number; addresses: number };
    totalSpent: number;
  };
}

// Register a new user, then sign them in
export async function signUpUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // A new shopper always lands on their profile, whichever mode they registered
  // with, so there is no callback to honour here.
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

    if (mode === 'phone') {
      // Authorize BEFORE creating the account — a wrong code must never leave
      // an unverified user row behind (which would then block re-signup with
      // "account exists"). checkSmsOtp, not consumeSmsOtp: spending the code
      // here would leave nothing for the session step below to verify, which
      // is exactly the double-consume that broke phone sign-up.
      const phoneE164 = `+98${mobile}`;
      const verdict = await checkSmsOtp(phoneE164, otpCode);
      if (verdict !== 'valid') {
        return {
          success: false,
          message: await withActionMessage(
            verdict === 'expired' ? 'otpExpired' : 'invalidOtp'
          ),
        };
      }
    }

    const created = await prisma.user.create({
      data: {
        name,
        email: email || null,
        mobile: mobile ? `+98${mobile}` : null,
        password: password ? hashSync(password, 10) : null,
      },
    });

    recordNotification({
      type: 'signup',
      title: 'ثبت‌نام جدید',
      body: `ثبت‌نام کاربر ${name || mobile || email}`,
      data: { userId: created.id },
    });

    const established =
      mode === 'email'
        ? await establishCredentialsSession(email, password)
        : // Establishes the session and spends the code — the one place it
          // is consumed, and it is spent exactly once per attempt.
          await establishSmsSession(`+98${mobile}`, otpCode);

    if (!established) {
      // Rare: the account is real and stays. Never roll it back — the shopper
      // can sign in with a fresh code. Told via toast, not a redirect that
      // would explain nothing.
      return {
        success: false,
        message: await withActionMessage('accountCreatedNotSignedIn'),
        toast: 'accountCreatedNotSignedIn',
      };
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
  redirect('/user/profile');
}

function resetEmailHtml(link: string): string {
  return `<!doctype html><html dir="rtl" lang="fa"><body style="font-family:Tahoma,Arial,sans-serif;background:#f6f6f6;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center">
<h2 style="color:#111">${APP_NAME}</h2>
<p style="color:#333;line-height:1.8">درخواست بازیابی رمز عبور برای حساب شما ثبت شد. برای انتخاب رمز جدید روی دکمه زیر بزنید:</p>
<p style="margin:24px 0"><a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block">بازیابی رمز عبور</a></p>
<p style="color:#888;font-size:12px;line-height:1.8">این لینک ۱۵ دقیقه اعتبار دارد. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.</p>
</div></body></html>`;
}