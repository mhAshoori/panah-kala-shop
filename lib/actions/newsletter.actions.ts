'use server';

import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { withActionMessage } from '../action-messages';
import { getValidUserId } from '../auth-helpers';
import { rateLimit } from '../rate-limit';
import { headers } from 'next/headers';
import type { ActionState } from '@/types';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/** Public: subscribe an email to the newsletter (footer form). */
export async function subscribeNewsletter(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const ip = (await headers()).get('x-forwarded-for') ?? 'local';
    const rl = rateLimit(`newsletter:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      throw new Error(await withActionMessage('tooManyAttempts'));
    }

    const parsed = subscribeSchema.safeParse({
      email: formData.get('email'),
    });
    if (!parsed.success) {
      throw new Error(await withActionMessage('invalidValue'));
    }

    const email = parsed.data.email.toLowerCase();
    await prisma.subscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    return { success: true, message: await withActionMessage('subscribed') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

/** Signed-in user: unsubscribe (profile toggle). */
export async function unsubscribeNewsletter(): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error(await withActionMessage('sessionExpired'));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      await prisma.subscriber.deleteMany({
        where: { email: user.email.toLowerCase() },
      });
    }

    return { success: true, message: await withActionMessage('unsubscribed') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}
