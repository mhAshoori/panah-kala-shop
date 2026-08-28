import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  Clock,
  Headset,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { getContactContent } from '@/lib/home-content';
import { buildAlternates, getSiteUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'footer' });
  const isFa = locale === 'fa';

  return {
    title: t('contactUs'),
    description: isFa
      ? 'راه‌های ارتباط با پشتیبانی فروشگاه پناه کالا'
      : 'Ways to reach Panah Kala Shop support',
    alternates: buildAlternates('/contact-us'),
    openGraph: { url: `${getSiteUrl()}/contact-us` },
  };
}

function pickText(
  value: { fa: string; en: string },
  locale: string
): string {
  return locale === 'fa' ? value.fa || value.en : value.en || value.fa;
}

const ContactPage = async () => {
  const t = await getTranslations('footer');
  const tHome = await getTranslations('home');
  const locale = await getLocale();
  const isFa = locale === 'fa';
  const c = await getContactContent();

  const rows = [
    { icon: Phone, label: isFa ? 'تلفن' : 'Phone', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    { icon: Mail, label: isFa ? 'ایمیل' : 'Email', value: c.email, href: `mailto:${c.email}` },
    { icon: MapPin, label: isFa ? 'نشانی' : 'Address', value: pickText(c.address, locale) },
    { icon: Clock, label: isFa ? 'ساعات کاری' : 'Working hours', value: pickText(c.hours, locale) },
  ];

  return (
    <div className='mx-auto max-w-2xl space-y-6 py-4'>
      <div className='flex items-center gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
          <Headset className='h-6 w-6' aria-hidden='true' />
        </div>
        <div>
          <h1 className='h2-bold'>{t('contactUs')}</h1>
          <p className='text-sm text-muted-foreground'>
            {pickText(c.desc, locale)}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className='grid gap-2 p-4'>
          {rows.map(({ icon: Icon, label, value, href }) => (
            <div
              key={label}
              className='flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50'
            >
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Icon className='h-5 w-5' aria-hidden='true' />
              </span>
              <div className='min-w-0'>
                <p className='text-xs text-muted-foreground'>{label}</p>
                {href ? (
                  <a
                    href={href}
                    className='text-sm font-medium hover:text-primary transition-colors'
                    dir='ltr'
                  >
                    {value}
                  </a>
                ) : (
                  <p className='text-sm font-medium'>{value}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className='text-center text-xs text-muted-foreground'>
        {tHome('supportDesc')}
      </p>
    </div>
  );
};

export default ContactPage;
