import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Hero banner with ken-burns image, staggered entrance and floating badges
const Hero = async () => {
  const t = await getTranslations('home');

  return (
    <section className='relative overflow-hidden rounded-2xl'>
      <div className='relative h-[380px] md:h-[460px]'>
        <Image
          src='/images/banner-2.webp'
          alt={t('specialOffer')}
          fill
          priority
          sizes='100vw'
          className='animate-ken-burns object-cover'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent rtl:bg-gradient-to-tl' />
      </div>

      {/* Floating badges (desktop) */}
      <div
        className='animate-float-y absolute end-8 top-8 hidden items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur md:flex'
        style={{ animationDelay: '1s' }}
      >
        <Truck className='h-4 w-4 text-primary' />
        {t('freeShipping')}
      </div>
      <div
        className='animate-float-y absolute end-16 top-24 hidden items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur md:flex'
        style={{ animationDelay: '2.2s' }}
      >
        <ShieldCheck className='h-4 w-4 text-primary' />
        {t('securePayment')}
      </div>

      {/* Copy */}
      <div className='absolute inset-x-0 bottom-0 p-6 md:p-12'>
        <p
          className='animate-fade-up mb-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary'
          aria-label={t('specialOffer')}
        >
          {t('specialOffer')}
        </p>
        <h1
          className='animate-fade-up max-w-2xl text-3xl font-bold leading-tight md:text-5xl'
          style={{ animationDelay: '120ms' }}
        >
          {t('heroTitle')}
        </h1>
        <p
          className='animate-fade-up mt-3 max-w-xl text-sm text-muted-foreground md:text-lg'
          style={{ animationDelay: '240ms' }}
        >
          {t('heroSubtitle')}
        </p>
        <div
          className='animate-fade-up mt-6 flex flex-wrap gap-3'
          style={{ animationDelay: '360ms' }}
        >
          <Button asChild size='lg'>
            <Link href='/search'>
              {t('shopNow')}
              <ArrowLeft className='h-4 w-4 rtl:hidden' />
              <ArrowRight className='h-4 w-4 ltr:hidden rtl:-scale-x-100' />
            </Link>
          </Button>
          <Button asChild size='lg' variant='outline' className='bg-background/60 backdrop-blur'>
            <Link href='/user/orders'>{t('moneyBack')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
