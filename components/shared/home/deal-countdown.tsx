'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

// Countdown to the end of the current day (deal of the day)
const DealCountdown = () => {
  const t = useTranslations('home');
  const locale = useLocale();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const endOfDay = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  const remaining = now == null ? 0 : Math.max(endOfDay() - now, 0);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(n);

  const units = [
    { value: days, label: t('days') },
    { value: hours, label: t('hours') },
    { value: minutes, label: t('minutes') },
    { value: seconds, label: t('seconds') },
  ];

  return (
    <div className='flex gap-2' dir='ltr' aria-label={t('dealEndsIn')}>
      {units.map(({ value, label }) => (
        <div
          key={label}
          className='flex min-w-14 flex-col items-center rounded-lg bg-background/80 px-2 py-1.5 backdrop-blur'
        >
          <span className='text-lg font-bold tabular-nums'>
            {now == null ? '--' : fmt(value)}
          </span>
          <span className='text-[10px] text-muted-foreground'>{label}</span>
        </div>
      ))}
    </div>
  );
};

export default DealCountdown;
