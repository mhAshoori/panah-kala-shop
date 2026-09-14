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
import type { NotificationDto } from '@/lib/notifications';

type Settings = {
  notifyEmailEnabled: boolean;
  notifySmsEnabled: boolean;
  notifyAdminEmail: string;
  notifyAdminMobile: string;
};

const AdminNotificationsClient = ({
  rows,
  unread,
  totalPages,
  currentPage,
  pageSize,
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
              return (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 p-3 ${n.isRead ? '' : 'bg-primary/5'}`}
                >
                  <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <ShoppingCart className='h-4 w-4' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className={`text-sm ${n.isRead ? 'text-muted-foreground' : 'font-semibold'}`}>
                      {n.title} — {n.body}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formatDateTime(n.createdAt, locale as 'fa' | 'en').dateTime}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    {orderId && (
                      <Button size='sm' variant='outline' asChild>
                        <Link href={`/admin/orders/${orderId}`}>
                          {t('viewOrder')}
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
