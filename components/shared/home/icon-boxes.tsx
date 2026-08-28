import { getLocale, getTranslations } from 'next-intl/server';
import {
  CreditCard,
  Headset,
  Package,
  ShieldCheck,
  Star,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

import type { HomeIconBoxItem } from '@/lib/home-content';

const BOX_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  headset: Headset,
  undo: Undo2,
  'credit-card': CreditCard,
  star: Star,
  package: Package,
};

function pickText(
  value: { fa: string; en: string } | undefined,
  locale: string,
  fallback: string
): string {
  if (!value) return fallback;
  const text = locale === 'fa' ? value.fa || value.en : value.en || value.fa;
  return text || fallback;
}

// Feature highlights row on the homepage — admin-editable items
const IconBoxes = async ({ items }: { items: HomeIconBoxItem[] }) => {
  const t = await getTranslations('home');
  const locale = await getLocale();

  const fallbacks = [
    { title: t('freeShipping'), desc: t('freeShippingDesc') },
    { title: t('securePayment'), desc: t('securePaymentDesc') },
    { title: t('support'), desc: t('supportDesc') },
    { title: t('moneyBack'), desc: t('moneyBackDesc') },
  ];

  return (
    <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {items.slice(0, 4).map((item, i) => {
        const Icon = BOX_ICONS[item.icon] ?? Package;
        const fb = fallbacks[i];
        return (
          <div
            key={`${item.icon}-${i}`}
            className='flex items-start gap-3 rounded-xl border bg-card p-4'
          >
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Icon className='h-5 w-5' aria-hidden='true' />
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-semibold'>
                {pickText(item.title, locale, fb.title)}
              </p>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {pickText(item.desc, locale, fb.desc)}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default IconBoxes;
