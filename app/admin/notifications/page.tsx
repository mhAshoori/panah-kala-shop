import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { prisma } from '@/db/prisma';
import {
  NOTIFY_ADMIN_EMAIL_KEY,
  NOTIFY_ADMIN_MOBILE_KEY,
  NOTIFY_EMAIL_ENABLED_KEY,
  NOTIFY_SMS_ENABLED_KEY,
  getNotifications,
} from '@/lib/notifications';
import { parsePageSize } from '@/lib/constants';
import AdminNotificationsClient from './admin-notifications-client';

export const metadata: Metadata = { title: 'اعلان‌ها | پناه کالا' };

const AdminNotificationsPage = async (props: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) => {
  const { page, size } = await props.searchParams;
  const t = await getTranslations('admin');
  const savedSize = await prisma.setting
    .findUnique({ where: { key: 'notificationsPageSize' } })
    .then((s) => Number(s?.value))
    .catch(() => NaN);
  const defaultSize =
    Number.isInteger(savedSize) && savedSize >= 10 && savedSize <= 100
      ? savedSize
      : 12;
  const pageSize = parsePageSize(size, defaultSize);

  const [list, settingsRows] = await Promise.all([
    getNotifications({ page: Number(page) || 1, limit: pageSize }),
    prisma.setting.findMany({
      where: {
        key: {
          in: [
            NOTIFY_EMAIL_ENABLED_KEY,
            NOTIFY_SMS_ENABLED_KEY,
            NOTIFY_ADMIN_EMAIL_KEY,
            NOTIFY_ADMIN_MOBILE_KEY,
          ],
        },
      },
    }),
  ]);
  const values = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]));

  return (
    <div className='space-y-6'>
      <h1 className='h2-bold'>{t('notifications')}</h1>

      <AdminNotificationsClient
        rows={list.rows}
        unread={list.unread}
        totalPages={list.totalPages}
        currentPage={Number(page) || 1}
        pageSize={pageSize}
        settings={{
          notifyEmailEnabled: values[NOTIFY_EMAIL_ENABLED_KEY] === 'true',
          notifySmsEnabled: values[NOTIFY_SMS_ENABLED_KEY] === 'true',
          notifyAdminEmail: values[NOTIFY_ADMIN_EMAIL_KEY] ?? '',
          notifyAdminMobile: values[NOTIFY_ADMIN_MOBILE_KEY] ?? '',
        }}
      />
    </div>
  );
};

export default AdminNotificationsPage;
