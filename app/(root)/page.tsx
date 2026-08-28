import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import ProductCarousel from '@/components/shared/product/product-carousel';
import ProductCard from '@/components/shared/product/product-card';
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
  getProductById,
} from '@/lib/actions/product.actions';
import { getHomeConfig } from '@/lib/home-content';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

function pickText(
  value: { fa: string; en: string } | undefined,
  locale: string,
  fallback: string
): string {
  if (!value) return fallback;
  const text = locale === 'fa' ? value.fa || value.en : value.en || value.fa;
  return text || fallback;
}

const HomePage = async () => {
  const locale = await getLocale();
  const t = await getTranslations('home');
  const config = await getHomeConfig();

  const [latestProducts, featuredProducts, stats] = await Promise.all([
    getLatestProducts(),
    getFeaturedProducts(),
    getSiteStats(),
  ]);

  // Deal product: admin-picked or auto (first featured with a banner)
  const dealProduct = config.deal.productId
    ? ((await getProductById(config.deal.productId)) as
        | (typeof featuredProducts)[number]
        | null)
    : (featuredProducts.find((p) => p.banner) ?? featuredProducts[0]);

  return (
    <div className='space-y-12'>
      {/* Hero */}
      {config.hero.enabled && (
        <Hero
          image={config.hero.image}
          badge={config.hero.badge}
          title={config.hero.title}
          subtitle={config.hero.subtitle}
          cta={config.hero.cta}
          link={config.hero.link}
        />
      )}

      {/* Feature highlights */}
      {config.iconBoxes.enabled && <IconBoxes items={config.iconBoxes.items} />}

      {/* Animated counters */}
      {config.stats.enabled && (
        <StatsStrip stats={stats} labels={config.stats.labels} />
      )}

      {/* Deal of the day */}
      {config.deal.enabled && dealProduct && (
        <section>
          <div className='relative overflow-hidden rounded-2xl border'>
            <Image
              src={dealProduct.banner ?? '/images/banner-1.webp'}
              alt={locale === 'fa' ? dealProduct.nameFa : dealProduct.name}
              width={1920}
              height={680}
              className='h-[300px] w-full object-cover'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent rtl:bg-gradient-to-tl' />
            <div className='absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 md:p-8'>
              <div>
                <p className='text-shine mb-1 text-sm font-bold'>
                  {pickText(config.deal.badge, locale, t('specialOffer'))}
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
      {config.categoryGrid.enabled && (
        <CategoryGrid title={pickText(config.categoryGrid.title, locale, t('shopByCategory'))} />
      )}

      {/* Latest products (carousel with pagination dots) */}
      {config.latest.enabled && (
        <ProductCarousel
          title={pickText(
            config.latest.title,
            locale,
            t('latestProducts')
          )}
          action={
            <Button asChild variant='ghost' size='sm'>
              <Link href='/search'>{t('viewAll')}</Link>
            </Button>
          }
        >
          {latestProducts.slice(0, config.latest.limit).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </ProductCarousel>
      )}

      {/* Featured products (carousel with pagination dots) */}
      {config.featured.enabled && (
        <ProductCarousel
          title={pickText(
            config.featured.title,
            locale,
            t('featuredProducts')
          )}
          action={
            <Button asChild variant='ghost' size='sm'>
              <Link href='/search'>{t('viewAll')}</Link>
            </Button>
          }
        >
          {featuredProducts.slice(0, config.featured.limit).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </ProductCarousel>
      )}

      {/* Brands marquee */}
      {config.brands.enabled && (
        <BrandMarquee
          title={pickText(config.brands.title, locale, t('brandsTitle'))}
        />
      )}

      {/* Support CTA */}
      {config.support.enabled && (
        <SupportCta
          title={config.support.title}
          desc={config.support.desc}
          cta={config.support.cta}
          link={config.support.link}
        />
      )}

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
