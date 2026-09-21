'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { NOTIFICATION_HREF, type NotificationKind } from '@/lib/notification-events';
import { withActionMessage } from '@/lib/action-messages';
import type { AdminActivityEvent } from '@/lib/notify';

// Toast poller feed reads the RECORDED notification rows (one bounded query,
// ≤ 20 rows) instead of reconstructing events from 5 source tables.

export async function saveNotificationsPageSize(value: number): Promise<void> {
  await requireAdmin();
  const n = Math.round(Number(value));
  if (!Number.isInteger(n) || n < 10 || n > 100) {
    throw new Error(await withActionMessage('invalidValue'));
  }
  await prisma.setting.upsert({
    where: { key: 'notificationsPageSize' },
    create: { key: 'notificationsPageSize', value: String(n) },
    update: { value: String(n) },
  });
  revalidatePath('/admin/notifications');
}

export async function fetchAdminActivitySince(
  sinceIso: string
): Promise<{ success: true; events: AdminActivityEvent[] } | { success: false }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false };
  }

  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) since.setTime(0);

  const rows: { id: string; type: string; data: unknown; createdAt: Date }[] =
    await prisma.notification.findMany({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const events: AdminActivityEvent[] = rows.map((n) => {
    const kind = n.type as NotificationKind;
    const data = (n.data ?? null) as {
      productName?: string;
      orderId?: string;
    } | null;
    return {
      id: `log:${n.id}`,
      kind,
      href: NOTIFICATION_HREF[kind] ?? '/admin',
      createdAtIso: n.createdAt.toISOString(),
      refId:
        data?.productName ??
        data?.orderId ??
        undefined,
    };
  });

  return { success: true, events };
}
