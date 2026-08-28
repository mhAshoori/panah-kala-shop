import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Hero banner for the homepage
const Hero = async () => {
  const t = await getTranslations('home');

  return (
    <section className='relative overflow-hidden rounded-2xl'>
      <Image
        src='/images/banner-2.webp'
        alt={t('specialOffer')}
        width={1920}
        height={680}
        priority
        className='h-[320px] w-full object-cover md:h-[420px]'
      />
      <div className='absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent rtl:bg-gradient-to-tl' />
      <div className='absolute inset-x-0 bottom-0 p-6 md:p-10'>
        <p className='mb-2 text-sm font-medium text-primary'>{t('specialOffer')}</p>
        <h1 className='max-w-xl text-2xl font-bold leading-tight md:text-4xl'>
          {t('heroTitle')}
        </h1>
        <p className='mt-2 max-w-lg text-sm text-muted-foreground md:text-base'>
          {t('heroSubtitle')}
        </p>
        <Button asChild className='mt-4'>
          <Link href='/search'>
            {t('shopNow')}
            <ArrowLeft className='h-4 w-4 rtl:hidden' />
            <ArrowRight className='h-4 w-4 ltr:hidden' />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Hero;
