'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { CreditCard, ShieldCheck } from 'lucide-react';

import { APP_NAME } from '@/lib/constants';
import { Link } from '@/i18n/navigation';

const Footer = () => {
  const t = useTranslations('footer');
  const th = useTranslations('home');
  const year = new Date().getFullYear();

  const serviceLinks = [
    { href: '/search', label: th('latestProducts') },
    { href: '/user/orders', label: th('moneyBack') },
    { href: '/cart', label: th('freeShipping') },
  ];

  return (
    <footer className='mt-16 border-t bg-card'>
      <div className='wrapper grid gap-8 py-10 md:grid-cols-3'>
        {/* Brand */}
        <div className='space-y-3'>
          <Link href='/' className='flex items-center gap-2'>
            <Image
              src='/images/logo.svg'
              width={36}
              height={36}
              alt={`${APP_NAME} logo`}
            />
            <span className='font-bold text-lg'>{t('brand')}</span>
          </Link>
          <p className='max-w-xs text-sm text-muted-foreground'>
            {t('tagline')}
          </p>
        </div>

        {/* Quick links */}
        <div>
          <p className='mb-3 text-sm font-semibold'>{t('customerService')}</p>
          <ul className='space-y-2 text-sm text-muted-foreground'>
            {serviceLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className='hover:text-primary transition-colors'>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment / trust */}
        <div>
          <p className='mb-3 text-sm font-semibold'>{t('paymentMethods')}</p>
          <div className='flex items-start gap-2 text-sm text-muted-foreground'>
            <CreditCard className='mt-0.5 h-4 w-4 shrink-0 text-primary' />
            <span>{t('securePayment')}</span>
          </div>
          <div className='mt-3 flex items-start gap-2 text-sm text-muted-foreground'>
            <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0 text-primary' />
            <span>{th('moneyBackDesc')}</span>
          </div>
        </div>
      </div>

      <div className='border-t py-4'>
        <p className='text-center text-xs text-muted-foreground'>
          {t('copyright', { year })}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
