import { getLocale, getTranslations } from 'next-intl/server';
import { Headset, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { LocalizedText } from '@/lib/home-content';

function pickText(
  value: LocalizedText | undefined,
  locale: string,
  fallback: string
): string {
  if (!value) return fallback;
  const text = locale === 'fa' ? value.fa || value.en : value.en || value.fa;
  return text || fallback;
}

// Support call-to-action banner — admin-editable copy
const SupportCta = async ({
  title: titleOverride,
  desc: descOverride,
  cta: ctaOverride,
  link = '/user/orders',
}: {
  title?: LocalizedText;
  desc?: LocalizedText;
  cta?: LocalizedText;
  link?: string;
}) => {
  const t = await getTranslations('home');
  const locale = await getLocale();

  const titleText = pickText(titleOverride, locale, t('supportTitle'));
  const descText = pickText(descOverride, locale, t('supportDesc'));
  const ctaText = pickText(ctaOverride, locale, t('supportCta'));

  return (
    <section className='animate-fade-up relative overflow-hidden rounded-2xl border bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-6 md:p-10 rtl:bg-gradient-to-r'>
      <div
        className='absolute -end-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-2xl'
        aria-hidden='true'
      />
      <div className='relative flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-start gap-4'>
          <div className='animate-float-y flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground'>
            <Headset className='h-7 w-7' aria-hidden='true' />
          </div>
          <div>
            <h2 className='text-xl font-bold md:text-2xl'>{titleText}</h2>
            <p className='mt-1 max-w-lg text-sm text-muted-foreground'>
              {descText}
            </p>
          </div>
        </div>
        <Button asChild size='lg' className='shrink-0'>
          <Link href={link}>
            <MessageCircle className='h-4 w-4' />
            {ctaText}
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default SupportCta;
