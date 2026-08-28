'use server';

import { redirect } from 'next/navigation';
import { auth, signIn, signOut } from '@/auth';
import { CredentialsSignin } from '@auth/core/errors';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { hashSync } from 'bcrypt-ts-edge';
import {
  shippingAddressSchema,
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
import type { ActionState, ShippingAddress } from '@/types';

// Update the signed-in user's profile (name only; email is fixed)
export async function updateProfile(user: { name: string; email: string }) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id as string },
    });
    if (!currentUser) throw new Error('User not found');

    const profile = updateProfileSchema.parse(user);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { name: profile.name },
    });

    return {
      success: true,
      message: 'User updated successfully',
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

// Update the signed-in user's shipping address
export async function updateUserAddress(data: ShippingAddress) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id as string },
    });

    if (!currentUser) throw new Error('User not found');

    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { address },
    });

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
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
 * Perform a credentials sign-in against Auth.js with redirect disabled and
 * inspect the resulting URL: a failed attempt resolves to the configured
 * error page (`?error=...`) instead of throwing, so we detect that here.
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
    if (typeof result !== 'string') return false;
    try {
      const url = new URL(result, 'http://localhost');
      if (url.searchParams.has('error')) return false;
      if (/(sign-in|sign-in)/i.test(url.pathname)) return false;
    } catch {
      /* non-URL result — treat as success path below */
    }
    return true;
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof CredentialsSignin) return false;
    throw error;
  }
}

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/';
  try {

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
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
  redirect(callbackUrl);
}

// Sign user out
export async function SignOutUser() {
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

    const parsed = signUpFormSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    });
    if (!parsed.success) {
      return { success: false, message: formatError(parsed.error) };
    }

    const { name, email, password } = parsed.data;
    await prisma.user.create({
      data: { name, email, password: hashSync(password, 10) },
    });

    const ok = await establishCredentialsSession(email, password);
    if (!ok) {
      // Account exists but auto sign-in failed — send to sign-in page.
      redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return { success: false, message: formatError(error) };
  }
  redirect(callbackUrl);
}