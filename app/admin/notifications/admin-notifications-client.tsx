'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Pagination from '@/components/shared/pagination';
import { formatDateTime } from '@/lib/utils';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationSettings,
} from '@/lib/actions/notification.actions';
import { saveNotificationsPageSize } from '@/lib/actions/notify.actions';
import {
  NOTIFICATION_HREF,
  NOTIFICATION_TAG_KEY,
} from '@/lib/notification-events';
import type { NotificationDto } from '@/lib/notifications';

type Settings = {
  notifyEmailEnabled: boolean;
  notifySmsEnabled: boolean;
  notifyAdminEmail: string;
  notifyAdminMobile: string;
};

const PAGE_SIZE_CHOICES = [10, 25, 50, 100];

const tagStyle: Record<string, string> = {
  order: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  payment: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  signup: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  question: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  stock: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  support: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

const AdminNotificationsClient = ({
  rows,
  unread,
  totalPages,
  currentPage,
  pageSize: pageSizeProp,
  settings: initial,
}: {
  rows: NotificationDto[];
  unread: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  settings: Settings;
}) => {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<Settings>(initial);

  const pageSize = pageSizeProp;

  const changePageSize = (v: string) => {
    const n = Number(v);
    if (!PAGE_SIZE_CHOICES.includes(n)) return;
    run(
      () => saveNotificationsPageSize(n),
      undefined
    );
    // reload with the new size; Setting becomes the default on the server
    window.location.assign(`/admin/notifications?size=${n}`);
  };

  const run = (fn: () => Promise<unknown>, successMsg?: string) =>
    startTransition(async () => {
      try {
        await fn();
        if (successMsg) toast.success(successMsg);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    });

  const saveSettings = (next: Settings) => {
    setSettings(next);
    run(
      () => updateNotificationSettings({ ...next }),
      t('notifySaved')
    );
  };

  return (
    <div className='space-y-6'>
      {/* Settings card */}
      <div className='rounded-lg border bg-card p-4'>
        <p className='mb-3 text-sm font-medium'>{t('notificationSettings')}</p>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='flex items-center justify-between gap-3 rounded-lg border p-3'>
            <Label htmlFor='notify-email'>{t('notifyEmail')}</Label>
            <Switch
              id='notify-email'
              checked={settings.notifyEmailEnabled}
              onCheckedChange={(v) =>
                saveSettings({ ...settings, notifyEmailEnabled: v })
              }
              disabled={isPending}
            />
          </div>
          <div className='flex items-center justify-between gap-3 rounded-lg border p-3'>
            <Label htmlFor='notify-sms'>{t('notifySms')}</Label>
            <Switch
              id='notify-sms'
              checked={settings.notifySmsEnabled}
              onCheckedChange={(v) =>
                saveSettings({ ...settings, notifySmsEnabled: v })
              }
              disabled={isPending}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='admin-email'>{t('adminEmail')}</Label>
            <Input
              id='admin-email'
              type='email'
              dir='ltr'
              value={settings.notifyAdminEmail}
              onChange={(e) =>
                setSettings({ ...settings, notifyAdminEmail: e.target.value })
              }
              onBlur={() => saveSettings(settings)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='admin-mobile'>{t('adminMobile')}</Label>
            <Input
              id='admin-mobile'
              type='tel'
              dir='ltr'
              placeholder='+989123456789'
              value={settings.notifyAdminMobile}
              onChange={(e) =>
                setSettings({ ...settings, notifyAdminMobile: e.target.value })
              }
              onBlur={() => saveSettings(settings)}
            />
          </div>
        </div>
      </div>

      {/* Page size (US3: admin-adjustable, Setting-persisted) */}
      <div className='flex items-center justify-end gap-2'>
        <Label htmlFor='notif-page-size' className='text-sm text-muted-foreground'>
          {t('pageSizeLabel')}
        </Label>
        <select
          id='notif-page-size'
          className='h-9 rounded-md border bg-background px-2 text-sm'
          value={pageSize}
          onChange={(e) => changePageSize(e.target.value)}
          disabled={isPending}
        >
          {PAGE_SIZE_CHOICES.map((n) => (
            <option key={n} value={n}>
              {new Intl.NumberFormat(locale).format(n)}
            </option>
          ))}
        </select>
      </div>

      {/* Notifications list */}
      <div className='rounded-lg border'>
        <div className='flex items-center justify-between border-b p-3'>
          <p className='text-sm font-medium'>
            {t('unread')}: {new Intl.NumberFormat(locale).format(unread)}
          </p>
          {unread > 0 && (
            <Button
              size='sm'
              variant='outline'
              disabled={isPending}
              onClick={() => run(() => markAllNotificationsAsRead())}
            >
              {t('markAllRead')}
            </Button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className='p-6 text-center text-sm text-muted-foreground'>
            {t('notificationsEmpty')}
          </p>
        ) : (
          <ul className='divide-y'>
            {rows.map((n) => {
              const orderId =
                (n.data as { orderId?: string } | null)?.orderId ?? null;
              const href =
                NOTIFICATION_HREF[n.type] ?? (orderId ? `/admin/orders/${orderId}` : null);
              const tag = NOTIFICATION_TAG_KEY[n.type];
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-3 ${n.isRead ? '' : 'bg-primary/5'}`}
                >
                  <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <ShoppingCart className='h-4 w-4' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      {tag && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tagStyle[n.type] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {t(tag)}
                        </span>
                      )}
                      <p className={`min-w-0 ${n.isRead ? 'text-muted-foreground' : 'font-semibold'}`}>
                        {n.title} — {n.body}
                      </p>
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {formatDateTime(n.createdAt, locale as 'fa' | 'en').dateTime}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    {href && (
                      <Button size='sm' variant='outline' asChild>
                        <Link href={href}>
                          {t('viewLink')}
                        </Link>
                      </Button>
                    )}
                    {!n.isRead && (
                      <Button
                        size='sm'
                        variant='ghost'
                        disabled={isPending}
                        onClick={() => run(() => markNotificationAsRead(n.id))}
                      >
                        {t('markRead')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination page={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
};

export default AdminNotificationsClient;
