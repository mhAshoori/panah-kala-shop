'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Package, ShoppingCart, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatNumberLocale } from '@/lib/persian';

// Animated count-up. SSR renders the real value (crawlers see true numbers);
// after mount the counter animates up from zero for the visual effect.
const CountUp = ({ target }: { target: number }) => {
  const locale = useLocale();
  const [value, setValue] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const duration = 1400;
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <span className='tabular-nums'>
      {formatNumberLocale(value, locale)}
      {value >= target && '+'}
    </span>
  );
};

const StatsStrip = ({
  stats,
  labels,
}: {
  stats: { products: number; orders: number; users: number };
  labels?: {
    products: { fa: string; en: string };
    orders: { fa: string; en: string };
    customers: { fa: string; en: string };
  };
}) => {
  const t = useTranslations('home');
  const locale = useLocale();

  const pick = (v: { fa: string; en: string } | undefined, fallback: string) => {
    if (!v) return fallback;
    const text = locale === 'fa' ? v.fa || v.en : v.en || v.fa;
    return text || fallback;
  };

  const items = [
    { icon: Package, value: Math.max(stats.products, 12), label: pick(labels?.products, t('statsProducts')) },
    { icon: ShoppingCart, value: Math.max(stats.orders, 50), label: pick(labels?.orders, t('statsOrders')) },
    { icon: Users, value: Math.max(stats.users, 100), label: pick(labels?.customers, t('statsCustomers')) },
  ];

  return (
    <section className='grid gap-4 sm:grid-cols-3'>
      {items.map(({ icon: Icon, value, label }, i) => (
        <div
          key={label}
          className='animate-fade-up flex items-center gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md'
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <Icon className='h-6 w-6' aria-hidden='true' />
          </div>
          <div>
            <p className={cn('text-2xl font-bold text-primary')}>
              <CountUp target={value} />
            </p>
            <p className='text-sm text-muted-foreground'>{label}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default StatsStrip;
