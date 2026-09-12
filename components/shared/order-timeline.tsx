'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';
import type { Order } from '@/types';

// Horizontal status timeline (placed → paid → shipped → delivered) with
// Jalali dates. Locale-neutral: arrows flow with the page's RTL direction.
const OrderTimeline = ({ order }: { order: Order }) => {
  const t = useTranslations('order');
  const locale = useLocale();

  const steps = [
    { key: 'placed', at: order.createdAt, label: t('timelinePlaced') },
    {
      key: 'paid',
      at: order.isPaid ? (order.paidAt ?? order.createdAt) : null,
      label: t('timelinePaid'),
    },
    {
      key: 'shipped',
      at: order.shippedAt,
      label: t('timelineShipped'),
    },
    {
      key: 'delivered',
      at: order.isDelivered ? (order.deliveredAt ?? null) : null,
      label: t('timelineDelivered'),
    },
  ];

  // A step is complete when its timestamp exists. Index of last complete
  // step drives the "current" pulse on the next one.
  const lastDone = steps.reduce((acc, s, i) => (s.at ? i : acc), -1);

  return (
    <ol className='flex items-stretch gap-0 text-center' dir='ltr'>
      {steps.map((s, i) => {
        const done = s.at !== null;
        const current = !done && i === lastDone + 1;
        const future = i > lastDone + 1;
        return (
          <li
            key={s.key}
            className={cn('flex-1 px-1', i < steps.length - 1 && 'relative')}
          >
            <span
              aria-current={current ? 'step' : undefined}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2',
                done && 'border-primary bg-primary text-primary-foreground',
                current && 'border-primary text-primary animate-pulse',
                future && 'border-muted text-muted-foreground'
              )}
            >
              {done ? (
                <Check className='h-4 w-4' />
              ) : (
                <span className='text-xs'>{i + 1}</span>
              )}
            </span>
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                done || current ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </p>
            <p className='text-[11px] text-muted-foreground'>
              {s.at
                ? formatDateTime(s.at, locale as 'fa' | 'en').dateOnly
                : '—'}
            </p>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderTimeline;
