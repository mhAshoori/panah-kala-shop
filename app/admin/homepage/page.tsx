import { getTranslations } from 'next-intl/server';

import HomeBlockEditor, {
  type BlockField,
} from '@/components/shared/admin/home-block-editor';
import {
  getHomeConfig,
  getContactContent,
  getSiteMeta,
} from '@/lib/home-content';
import { prisma } from '@/db/prisma';

const ICON_OPTIONS = [
  { value: 'truck', label: 'Truck' },
  { value: 'shield', label: 'Shield' },
  { value: 'headset', label: 'Headset' },
  { value: 'undo', label: 'Undo' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'star', label: 'Star' },
  { value: 'package', label: 'Package' },
];

const AdminHomepagePage = async () => {
  const t = await getTranslations('admin');
  const [config, contact, meta] = await Promise.all([
    getHomeConfig(),
    getContactContent(),
    getSiteMeta(),
  ]);

  // Product picker for the deal block
  const products = await prisma.product.findMany({
    select: { id: true, name: true, nameFa: true },
    orderBy: { createdAt: 'desc' },
  });
  const productOptions = [
    { value: '', label: t('blockDealAuto') },
    ...products.map((p) => ({ value: p.id, label: p.nameFa })),
  ];

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='h2-bold'>{t('homepage')}</h1>
        <p className='text-sm text-muted-foreground'>{t('homepageHint')}</p>
      </div>

      {/* Hero */}
      <HomeBlockEditor
        blockKey='hero'
        title={t('blockHero')}
        initialEnabled={config.hero.enabled}
        initialData={config.hero as unknown as Record<string, unknown>}
        fields={[
          { path: 'image', label: 'fImage', type: 'image' },
          { path: 'badge', label: 'fBadge', type: 'text', localized: true },
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
          { path: 'subtitle', label: 'fSubtitle', type: 'textarea', localized: true },
          { path: 'cta', label: 'fCta', type: 'text', localized: true },
          { path: 'link', label: 'fLink', type: 'text' },
        ]}
      />

      {/* Icon boxes */}
      <HomeBlockEditor
        blockKey='iconBoxes'
        title={t('blockIconBoxes')}
        initialEnabled={config.iconBoxes.enabled}
        initialData={config.iconBoxes as unknown as Record<string, unknown>}
        fields={[0, 1, 2, 3].flatMap((i): BlockField[] => [
          { path: `items.${i}.icon`, label: `fIconBoxIcon`, type: 'text', options: ICON_OPTIONS },
          { path: `items.${i}.title`, label: `fIconBoxTitle${i + 1}`, type: 'text', localized: true },
          { path: `items.${i}.desc`, label: `fIconBoxDesc${i + 1}`, type: 'textarea', localized: true },
        ])}
      />

      {/* Deal of the day */}
      <HomeBlockEditor
        blockKey='deal'
        title={t('blockDeal')}
        initialEnabled={config.deal.enabled}
        initialData={config.deal as unknown as Record<string, unknown>}
        fields={[
          { path: 'productId', label: 'fProduct', type: 'text', options: productOptions },
          { path: 'badge', label: 'fBadge', type: 'text', localized: true },
        ]}
      />

      {/* Stats */}
      <HomeBlockEditor
        blockKey='stats'
        title={t('blockStats')}
        initialEnabled={config.stats.enabled}
        initialData={config.stats as unknown as Record<string, unknown>}
        fields={[
          { path: 'labels.products', label: 'fStatProducts', type: 'text', localized: true },
          { path: 'labels.orders', label: 'fStatOrders', type: 'text', localized: true },
          { path: 'labels.customers', label: 'fStatCustomers', type: 'text', localized: true },
        ]}
      />

      {/* Category grid */}
      <HomeBlockEditor
        blockKey='categoryGrid'
        title={t('blockCategoryGrid')}
        initialEnabled={config.categoryGrid.enabled}
        initialData={config.categoryGrid as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
        ]}
      />

      {/* Latest products */}
      <HomeBlockEditor
        blockKey='latest'
        title={t('blockLatest')}
        initialEnabled={config.latest.enabled}
        initialData={config.latest as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
          { path: 'limit', label: 'fLimit', type: 'number' },
        ]}
      />

      {/* Featured products */}
      <HomeBlockEditor
        blockKey='featured'
        title={t('blockFeatured')}
        initialEnabled={config.featured.enabled}
        initialData={config.featured as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
          { path: 'limit', label: 'fLimit', type: 'number' },
        ]}
      />

      {/* Best sellers */}
      <HomeBlockEditor
        blockKey='bestSellers'
        title={t('blockBestSellers')}
        initialEnabled={config.bestSellers.enabled}
        initialData={config.bestSellers as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
          { path: 'limit', label: 'fLimit', type: 'number' },
        ]}
      />

      {/* Promo banners (two side-by-side image banners) */}
      <HomeBlockEditor
        blockKey='promoBanners'
        title={t('blockPromoBanners')}
        initialEnabled={config.promoBanners.enabled}
        initialData={config.promoBanners as unknown as Record<string, unknown>}
        fields={[0, 1].flatMap((i): BlockField[] => [
          { path: `banners.${i}.image`, label: `fImage${i + 1}`, type: 'image' },
          { path: `banners.${i}.title`, label: `fTitle${i + 1}`, type: 'text', localized: true },
          { path: `banners.${i}.subtitle`, label: `fSubtitle${i + 1}`, type: 'text', localized: true },
          { path: `banners.${i}.cta`, label: `fCta${i + 1}`, type: 'text', localized: true },
          { path: `banners.${i}.link`, label: `fLink${i + 1}`, type: 'text' },
        ])}
      />

      {/* Brands marquee */}
      <HomeBlockEditor
        blockKey='brands'
        title={t('blockBrands')}
        initialEnabled={config.brands.enabled}
        initialData={config.brands as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
        ]}
      />

      {/* Support CTA */}
      <HomeBlockEditor
        blockKey='support'
        title={t('blockSupport')}
        initialEnabled={config.support.enabled}
        initialData={config.support as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fTitle', type: 'text', localized: true },
          { path: 'desc', label: 'fDescription', type: 'textarea', localized: true },
          { path: 'cta', label: 'fCta', type: 'text', localized: true },
          { path: 'link', label: 'fLink', type: 'text' },
        ]}
      />

      {/* Contact page content */}
      <HomeBlockEditor
        blockKey='contact'
        title={t('blockContact')}
        initialEnabled={true}
        initialData={contact as unknown as Record<string, unknown>}
        fields={[
          { path: 'phone', label: 'fPhone', type: 'text' },
          { path: 'email', label: 'fEmail', type: 'text' },
          { path: 'address', label: 'fAddress', type: 'text', localized: true },
          { path: 'hours', label: 'fHours', type: 'text', localized: true },
          { path: 'desc', label: 'fDescription', type: 'textarea', localized: true },
        ]}
      />

      {/* Site SEO metadata */}
      <HomeBlockEditor
        blockKey='meta'
        title={t('blockMeta')}
        initialEnabled={true}
        initialData={meta as unknown as Record<string, unknown>}
        fields={[
          { path: 'title', label: 'fMetaTitle', type: 'text', localized: true },
          { path: 'description', label: 'fMetaDescription', type: 'textarea', localized: true },
          { path: 'keywords', label: 'fKeywords', type: 'textarea', localized: true },
          { path: 'ogImage', label: 'fOgImage', type: 'image' },
          { path: 'googleVerification', label: 'fGoogleVerification', type: 'text' },
          { path: 'robotsExtraDisallow', label: 'fRobotsExtra', type: 'textarea' },
          { path: 'noindex', label: 'fNoindex', type: 'boolean' },
        ]}
      />
    </div>
  );
};

export default AdminHomepagePage;
