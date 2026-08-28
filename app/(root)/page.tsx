import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import ProductList from '@/components/shared/product/product-list';
import Hero from '@/components/shared/home/hero';
import IconBoxes from '@/components/shared/home/icon-boxes';
import StatsStrip from '@/components/shared/home/stats-strip';
import CategoryGrid from '@/components/shared/home/category-grid';
import BrandMarquee from '@/components/shared/home/brand-marquee';
import SupportCta from '@/components/shared/home/support-cta';
import DealCountdown from '@/components/shared/home/deal-countdown';
import {
  getLatestProducts,
  getFeaturedProducts,
  getSiteStats,
} from '@/lib/actions/product.actions';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

const HomePage = async () => {
  const locale = await getLocale();
  const t = await getTranslations('home');

  const [latestProducts, featuredProducts, stats] = await Promise.all([
    getLatestProducts(),
    getFeaturedProducts(),
    getSiteStats(),
  ]);

  const dealProduct = featuredProducts.find((p) => p.banner) ?? featuredProducts[0];

  return (
    <div className='space-y-12'>
      {/* Hero */}
      <Hero />

      {/* Feature highlights */}
      <IconBoxes />

      {/* Animated counters */}
      <StatsStrip stats={stats} />

      {/* Deal of the day (rotating gradient border) */}
      {dealProduct && (
        <section className='animated-border rounded-2xl'>
          <div className='relative overflow-hidden rounded-2xl border'>
            <Image
              src={dealProduct.banner ?? '/images/banner-1.webp'}
              alt={locale === 'fa' ? dealProduct.nameFa : dealProduct.name}
              width={1920}
              height={680}
              className='h-[300px] w-full object-cover md:h-[360px]'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent rtl:bg-gradient-to-tl' />
            <div className='absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 md:p-8'>
              <div>
                <p className='text-shine mb-1 text-sm font-bold'>
                  {t('specialOffer')}
                </p>
                <h2 className='text-xl font-bold md:text-2xl'>
                  {locale === 'fa' ? dealProduct.nameFa : dealProduct.name}
                </h2>
                <p className='mt-2 text-xs text-muted-foreground'>
                  {t('dealEndsIn')}
                </p>
                <div className='mt-2'>
                  <DealCountdown />
                </div>
              </div>
              <Button asChild variant='outline' className='bg-background/70 backdrop-blur'>
                <Link href={`/product/${dealProduct.slug}`}>
                  {t('shopNow')}
                  <ArrowLeft className='h-4 w-4 rtl:hidden' />
                  <ArrowRight className='h-4 w-4 ltr:hidden rtl:-scale-x-100' />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <CategoryGrid />

      {/* Latest products */}
      <ProductList title={t('latestProducts')} data={latestProducts} />

      {/* Featured products */}
      <ProductList title={t('featuredProducts')} data={featuredProducts} />

      {/* Brands marquee */}
      <BrandMarquee />

      {/* Support CTA */}
      <SupportCta />

      {/* View all */}
      <div className='flex justify-center'>
        <Button asChild variant='outline'>
          <Link href='/search'>{t('viewAll')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
