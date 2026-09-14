import { prisma } from '@/db/prisma';
import { sendEmail } from './email/mailer';
import { sendSmsText } from './sms/smsir';
import type { Order } from '@/types';

async function readSetting(key: string): Promise<string | null> {
  try {
    const s = await prisma.setting.findUnique({ where: { key } });
    return s?.value ?? null;
  } catch {
    return null;
  }
}

// Setting keys (admin-editable at /admin/notifications)
export const NOTIFY_EMAIL_ENABLED_KEY = 'notifyEmailEnabled';
export const NOTIFY_SMS_ENABLED_KEY = 'notifySmsEnabled';
export const NOTIFY_ADMIN_EMAIL_KEY = 'notifyAdminEmail';
export const NOTIFY_ADMIN_MOBILE_KEY = 'notifyAdminMobile';

// Fire-and-forget notifier for a new order: always creates an in-panel
// notification row; email/SMS channels only fire when admin enabled them.
export async function notifyAdminNewOrder(order: Order): Promise<void> {
  try {
    const itemCount = order.orderItems?.length ?? 0;
    const buyer =
      order.user?.name ??
      (order.shippingAddress as { fullName?: string } | null)?.fullName ??
      '—';

    await prisma.notification.create({
      data: {
        type: 'order',
        title: 'سفارش جدید',
        body: `${buyer} — ${itemCount} قلم — ${order.totalPrice} تومان`,
        data: { orderId: order.id, total: String(order.totalPrice), itemCount },
      },
    });

    const emailEnabled = (await readSetting(NOTIFY_EMAIL_ENABLED_KEY)) === 'true';
    const adminEmail = await readSetting(NOTIFY_ADMIN_EMAIL_KEY);
    if (emailEnabled && adminEmail) {
      const header =
        '<tr><th style="padding:4px 8px">کالا</th><th style="padding:4px 8px">تعداد</th><th style="padding:4px 8px">قیمت (تومان)</th></tr>';
      const rows = (order.orderItems ?? [])
        .map((it) =>
          [
            '<tr>',
            '<td style="padding:4px 8px">' +
              esc(it.name) +
              (it.variantLabel ? ' — ' + esc(it.variantLabel) : '') +
              '</td>',
            '<td style="padding:4px 8px">' + it.qty + '</td>',
            '<td style="padding:4px 8px">' + fmt(it.price) + '</td>',
            '</tr>',
          ].join('')
        )
        .join('');
      await sendEmail({
        to: adminEmail,
        subject: 'سفارش جدید ' + order.id.slice(-6) + ' — ' + fmt(order.totalPrice) + ' تومان',
        html:
          '<p>سفارش جدید از <strong>' + esc(buyer) + '</strong></p>' +
          '<table border="1" cellpadding="0" style="border-collapse:collapse">' +
          header + rows +
          '</table>' +
          '<p>جمع کل: <strong>' + fmt(order.totalPrice) + ' تومان</strong></p>' +
          '<p><a href="/order/' + order.id + '">مشاهده سفارش</a></p>',
      });
    }

    const smsEnabled = (await readSetting(NOTIFY_SMS_ENABLED_KEY)) === 'true';
    const adminMobile = (await readSetting(NOTIFY_ADMIN_MOBILE_KEY)) ?? process.env.ADMIN_MOBILE;
    if (smsEnabled && adminMobile) {
      await sendSmsText(
        adminMobile,
        `سفارش جدید ${order.id.slice(-6)} | ${buyer} | ${itemCount} قلم | جمع: ${order.totalPrice} تومان`
      );
    }
  } catch (error) {
    // Notifications must never break checkout
    console.error('[notify] new-order notify failed:', error);
  }
}

const fmt = (v: unknown) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const esc = (v: string) =>
  v.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c
  );

// Notification item shape used by the admin list page
export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
};

export async function getNotifications({
  page = 1,
  limit = 12,
}: {
  page?: number;
  limit?: number;
}) {
  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count(),
    prisma.notification.count({ where: { isRead: false } }),
  ]);
  return {
    rows: rows as NotificationDto[],
    unread,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

export async function getUnreadNotificationsCount() {
  return prisma.notification.count({ where: { isRead: false } });
}

export async function markNotificationRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead() {
  await prisma.notification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}
