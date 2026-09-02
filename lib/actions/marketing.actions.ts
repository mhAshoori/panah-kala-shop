'use server';

import { requireAdmin } from '@/lib/auth-guard';
import { prisma } from '@/db/prisma';
import { revalidatePath } from 'next/cache';
import { withActionMessage } from '../action-messages';
import { formatError } from '../utils';
import { z } from 'zod';
import type { ActionState } from '@/types';
import {
  sendOfferBroadcast,
  type OfferEmailInput,
} from '../email/marketing';

const offerSchema = z.object({
  subject: z.string().min(3).max(120),
  title: z.string().min(3).max(80),
  body: z.string().min(3).max(1000),
  couponCode: z.string().max(40).optional(),
  discountLine: z.string().max(80).optional(),
  ctaPath: z.string().max(200).optional(),
});

/**
 * Broadcast a special offer (e.g. weekend campaign) to all customers who
 * have an email address. Admin-only; chunked delivery via the SMTP provider.
 */
export async function sendSpecialOffer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const parsed = offerSchema.safeParse({
      subject: (formData.get('subject') as string) ?? '',
      title: (formData.get('title') as string) ?? '',
      body: (formData.get('body') as string) ?? '',
      couponCode: ((formData.get('couponCode') as string) ?? '').trim() || undefined,
      discountLine: ((formData.get('discountLine') as string) ?? '').trim() || undefined,
      ctaPath: ((formData.get('ctaPath') as string) ?? '').trim() || undefined,
    });
    if (!parsed.success) {
      throw new Error(await withActionMessage('invalidValue'));
    }

    const users = await prisma.user.findMany({
      where: { email: { not: null } },
      select: { email: true },
    });
    const recipients = users
      .map((u) => u.email)
      .filter((e): e is string => !!e);

    if (recipients.length === 0) {
      throw new Error(await withActionMessage('noEmailRecipients'));
    }

    const result = await sendOfferBroadcast(
      recipients,
      parsed.data as OfferEmailInput
    );

    revalidatePath('/admin');

    return {
      success: true,
      message: await withActionMessage('offerSent', {
        sent: result.sent,
        failed: result.failed,
      }),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
