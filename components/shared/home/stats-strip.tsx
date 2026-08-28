'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Package, ShoppingCart, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

// Animated count-up that starts when the strip scrolls into view
const CountUp = ({ target }: { target: number }) => {
  const locale = useLocale();
  const [value, setValue] = useState(0);
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
      {new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(value)}
      {value >= target && '+'}
    </span>
  );
};

const StatsStrip = ({
  stats,
}: {
  stats: { products: number; orders: number; users: number };
}) => {
  const t = useTranslations('home');

  const items = [
    { icon: Package, value: Math.max(stats.products, 12), label: t('statsProducts') },
    { icon: ShoppingCart, value: Math.max(stats.orders, 50), label: t('statsOrders') },
    { icon: Users, value: Math.max(stats.users, 100), label: t('statsCustomers') },
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
