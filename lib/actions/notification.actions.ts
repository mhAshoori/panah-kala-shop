'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import {
  NOTIFY_ADMIN_EMAIL_KEY,
  NOTIFY_ADMIN_MOBILE_KEY,
  NOTIFY_EMAIL_ENABLED_KEY,
  NOTIFY_SMS_ENABLED_KEY,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../notifications';
import { normalizeIranMobile } from '../phone';

export async function getAdminNotifications({
  page = 1,
  limit = 12,
}: {
  page?: number;
  limit?: number;
}) {
  await requireAdmin();
  return getNotifications({ page, limit });
}

export async function markNotificationAsRead(id: string) {
  await requireAdmin();
  await markNotificationRead(id);
  revalidatePath('/admin/notifications');
  revalidatePath('/admin');
}

export async function markAllNotificationsAsRead() {
  await requireAdmin();
  await markAllNotificationsRead();
  revalidatePath('/admin/notifications');
  revalidatePath('/admin');
}

export async function updateNotificationSettings(input: {
  notifyEmailEnabled: boolean;
  notifySmsEnabled: boolean;
  notifyAdminEmail: string;
  notifyAdminMobile: string;
}) {
  await requireAdmin();

  const email = input.notifyAdminEmail.trim();
  const mobile = input.notifyAdminMobile.trim();

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(await withActionMessage('invalidValue'));
  }
  if (mobile && !normalizeIranMobile(mobile)) {
    throw new Error(await withActionMessage('invalidValue'));
  }
  const mobileE164 = mobile ? normalizeIranMobile(mobile) ?? '' : '';

  const upserts = [
    { key: NOTIFY_EMAIL_ENABLED_KEY, value: String(!!input.notifyEmailEnabled) },
    { key: NOTIFY_SMS_ENABLED_KEY, value: String(!!input.notifySmsEnabled) },
    { key: NOTIFY_ADMIN_EMAIL_KEY, value: email },
    { key: NOTIFY_ADMIN_MOBILE_KEY, value: mobileE164 },
  ];
  await prisma.$transaction(
    upserts.map((u) =>
      prisma.setting.upsert({
        where: { key: u.key },
        create: u,
        update: { value: u.value },
      })
    )
  );

  revalidatePath('/admin/notifications');
  return { success: true as const };
}
