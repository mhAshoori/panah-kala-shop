import { getTranslations } from 'next-intl/server';

import HomeBlockEditor, {
  type BlockField,
} from '@/components/shared/admin/home-block-editor';
import {
  getHomeConfig,
  getContactContent,
  getSiteMeta,
  getHomeBlockOrder,
  type HomeBlockKey,
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
  const [config, contact, meta, blockOrder] = await Promise.all([
    getHomeConfig(),
    getContactContent(),
    getSiteMeta(),
    getHomeBlockOrder(),
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

  // Field sets + props per block key (rendered below in the saved order)
  const editors: Record<
    HomeBlockKey,
    { title: string; initialData: Record<string, unknown>; fields: BlockField[] }
  > = {
    hero: {
      title: t('blockHero'),
      initialData: config.hero as unknown as Record<string, unknown>,
      fields: [
        { path: 'image', label: 'fImage', type: 'image' },
        { path: 'badge', label: 'fBadge', type: 'text', localized: true },
        { path: 'title', label: 'fTitle', type: 'text', localized: true },
        { path: 'subtitle', label: 'fSubtitle', type: 'textarea', localized: true },
        { path: 'cta', label: 'fCta', type: 'text', localized: true },
        { path: 'link', label: 'fLink', type: 'text' },
      ],
    },
    iconBoxes: {
      title: t('blockIconBoxes'),
      initialData: config.iconBoxes as unknown as Record<string, unknown>,
      fields: [0, 1, 2, 3].flatMap((i): BlockField[] => [
        { path: `items.${i}.icon`, label: `fIconBoxIcon`, type: 'text', options: ICON_OPTIONS },
        { path: `items.${i}.title`, label: `fIconBoxTitle${i + 1}`, type: 'text', localized: true },
        { path: `items.${i}.desc`, label: `fIconBoxDesc${i + 1}`, type: 'textarea', localized: true },
      ]),
    },
    deal: {
      title: t('blockDeal'),
      initialData: config.deal as unknown as Record<string, unknown>,
      fields: [
        { path: 'productId', label: 'fProduct', type: 'text', options: productOptions },
        { path: 'badge', label: 'fBadge', type: 'text', localized: true },
      ],
    },
    stats: {
      title: t('blockStats'),
      initialData: config.stats as unknown as Record<string, unknown>,
      fields: [
        { path: 'labels.products', label: 'fStatProducts', type: 'text', localized: true },
        { path: 'labels.orders', label: 'fStatOrders', type: 'text', localized: true },
        { path: 'labels.customers', label: 'fStatCustomers', type: 'text', localized: true },
      ],
    },
    categoryGrid: {
      title: t('blockCategoryGrid'),
      initialData: config.categoryGrid as unknown as Record<string, unknown>,
      fields: [{ path: 'title', label: 'fTitle', type: 'text', localized: true }],
    },
    latest: {
      title: t('blockLatest'),
      initialData: config.latest as unknown as Record<string, unknown>,
      fields: [
        { path: 'title', label: 'fTitle', type: 'text', localized: true },
        { path: 'limit', label: 'fLimit', type: 'number' },
      ],
    },
    featured: {
      title: t('blockFeatured'),
      initialData: config.featured as unknown as Record<string, unknown>,
      fields: [
        { path: 'title', label: 'fTitle', type: 'text', localized: true },
        { path: 'limit', label: 'fLimit', type: 'number' },
      ],
    },
    bestSellers: {
      title: t('blockBestSellers'),
      initialData: config.bestSellers as unknown as Record<string, unknown>,
      fields: [
        { path: 'title', label: 'fTitle', type: 'text', localized: true },
        { path: 'limit', label: 'fLimit', type: 'number' },
      ],
    },
    promoBanners: {
      title: t('blockPromoBanners'),
      initialData: config.promoBanners as unknown as Record<string, unknown>,
      fields: [0, 1].flatMap((i): BlockField[] => [
        { path: `banners.${i}.image`, label: `fImage${i + 1}`, type: 'image' },
        { path: `banners.${i}.title`, label: `fTitle${i + 1}`, type: 'text', localized: true },
        { path: `banners.${i}.subtitle`, label: `fSubtitle${i + 1}`, type: 'text', localized: true },
        { path: `banners.${i}.cta`, label: `fCta${i + 1}`, type: 'text', localized: true },
        { path: `banners.${i}.link`, label: `fLink${i + 1}`, type: 'text' },
      ]),
    },
    brands: {
      title: t('blockBrands'),
      initialData: config.brands as unknown as Record<string, unknown>,
      fields: [{ path: 'title', label: 'fTitle', type: 'text', localized: true }],
    },
    support: {
      title: t('blockSupport'),
      initialData: config.support as unknown as Record<string, unknown>,
      fields: [
        { path: 'title', label: 'fTitle', type: 'text', localized: true },
        { path: 'desc', label: 'fDescription', type: 'textarea', localized: true },
        { path: 'cta', label: 'fCta', type: 'text', localized: true },
        { path: 'link', label: 'fLink', type: 'text' },
      ],
    },
  };

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='h2-bold'>{t('homepage')}</h1>
        <p className='text-sm text-muted-foreground'>{t('homepageHint')}</p>
      </div>

      {/* Homepage blocks in the admin's saved display order */}
      {blockOrder.map((key) => (
        <HomeBlockEditor
          key={key}
          blockKey={key}
          title={editors[key].title}
          reorderable
          initialEnabled={config[key].enabled}
          initialData={editors[key].initialData}
          fields={editors[key].fields}
        />
      ))}

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
          { path: 'promoText', label: 'fPromoText', type: 'text', localized: true },
          { path: 'promoLink', label: 'fPromoLink', type: 'text' },
        ]}
      />
    </div>
  );
};

export default AdminHomepagePage;
