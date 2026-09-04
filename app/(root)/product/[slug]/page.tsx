import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import ProductPrice from '@/components/product/product-price';
import ProductImages from '@/components/product/product-images';
import AddToCart from '@/components/shared/product/add-to-cart';
import VariantSelector from '@/components/shared/product/variant-selector';
import FavoriteToggle from '@/components/shared/product/favorite-toggle';
import StarRating from '@/components/shared/product/star-rating';
import ReviewsSection from '@/components/shared/product/reviews-section';
import Breadcrumbs from '@/components/shared/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { getProductBySlug } from '@/lib/actions/product.actions';
import { getMyCart } from '@/lib/actions/cart.actions';
import { isProductFavorited } from '@/lib/actions/favorite.actions';
import { Badge } from '@/components/ui/badge';
import { formatNumberLocale } from '@/lib/persian';
import { getDiscount } from '@/lib/discount';
import {
  breadcrumbJsonLd,
  buildAlternates,
  getSiteUrl,
  productJsonLd,
} from '@/lib/seo';
import { getCategoryById } from '@/lib/actions/product.actions';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const locale = await getLocale();
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const name = locale === 'fa' ? product.nameFa : product.name;
  const description = locale === 'fa' ? product.descriptionFa : product.description;
  const siteUrl = getSiteUrl();

  return {
    title: name,
    description: description.slice(0, 160),
    alternates: buildAlternates(`/product/${slug}`),
    openGraph: {
      type: 'website',
      title: name,
      description: description.slice(0, 160),
      url: `${siteUrl}/product/${slug}`,
      images: product.images[0]
        ? [{ url: product.images[0], alt: name }]
        : undefined,
    },
  };
}

const ProductDetailsPage = async (props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) => {
  const { slug } = await props.params;
  const { variant: variantParam } = await props.searchParams;
  const locale = await getLocale();
  const t = await getTranslations('product');
  const tCommon = await getTranslations('common');
  const isFa = locale === 'fa';

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const options = (product.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    nameFa: o.nameFa,
    values: o.values.map((v) => ({
      id: v.id,
      value: v.value,
      valueFa: v.valueFa,
      hex: v.hex,
    })),
  }));
  const variants = (product.variants ?? []).map((v) => ({
    id: v.id,
    key: v.key,
    price: v.price.toString(),
    compareAtPrice: v.compareAtPrice?.toString() ?? null,
    stock: v.stock,
    options: v.options as { optionFa: string; valueFa: string }[],
    image: v.image,
  }));
  const hasVariants = options.length > 0 && variants.length > 0;

  // Deep-link initial selection: ?variant=<id> resolves server-side so the
  // first paint already shows that variant (no hydration flash)
  const initialSelection: Record<string, string> = {};
  if (variantParam) {
    const target = variants.find((v) => v.id === variantParam);
    if (target) {
      for (const snap of target.options) {
        const option = options.find((o) => o.nameFa === snap.optionFa);
        const value = option?.values.find((v) => v.valueFa === snap.valueFa);
        if (option && value) initialSelection[option.id] = value.id;
      }
    }
  } else if (hasVariants) {
    // Default to the first value of every option
    for (const o of options) {
      if (o.values[0]) initialSelection[o.id] = o.values[0].id;
    }
  }

  const discount = getDiscount(product.price, product.compareAtPrice);

  // Load the visitor's cart so AddToCart can show +/- controls
  const cart = await getMyCart();
  const isFavorited = await isProductFavorited(product.id);

  const categoryRow = product.categoryId
    ? await getCategoryById(product.categoryId)
    : null;
  const categorySlug = categoryRow?.slug ?? null;

  const categoryName = isFa ? product.categoryFa : product.category;
  const jsonLd = productJsonLd(product, locale);
  const breadcrumbs = breadcrumbJsonLd([
    { name: isFa ? 'خانه' : 'Home', url: getSiteUrl() },
    { name: categoryName, url: `${getSiteUrl()}/search?category=${encodeURIComponent(product.category)}` },
    { name: isFa ? product.nameFa : product.name, url: `${getSiteUrl()}/product/${product.slug}` },
  ]);

  return (
    <section>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Breadcrumb trail — ends with the product name */}
      <Breadcrumbs
        className='mb-4'
        items={[
          {
            label: isFa ? product.categoryFa : product.category,
            href: categorySlug
              ? `/category/${categorySlug}`
              : `/search?category=${encodeURIComponent(product.category)}`,
          },
          { label: isFa ? product.nameFa : product.name },
        ]}
      />
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5'>
        {/* Images Column */}
        <div className='lg:col-span-2'>
          <ProductImages
            images={product.images}
            name={isFa ? product.nameFa : product.name}
          />
        </div>

        {/* Details Column */}
        <div className='lg:col-span-2 lg:p-5'>
          <div className="flex flex-col gap-6">
            <p className="text-muted-foreground">
              {isFa ? product.categoryFa : product.category} · {product.brand}
            </p>
            <h1 className="h3-bold">{isFa ? product.nameFa : product.name}</h1>
            <div className='flex items-center gap-2'>
              <StarRating value={Number(product.rating)} />
              <span className='text-sm text-muted-foreground'>
                {formatNumberLocale(Number(product.rating).toFixed(1), locale)} ·{' '}
                {formatNumberLocale(product.numReviews, locale)} {t('reviews')}
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className='flex items-center gap-3'>
                {discount && (
                  <span className='rounded-full bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground'>
                    ٪{formatNumberLocale(discount.percent, locale)}{' '}
                    {t('discountOff')}
                  </span>
                )}
                {discount && (
                  <span className='text-sm text-muted-foreground line-through'>
                    {formatNumberLocale(Number(product.compareAtPrice), locale)}
                  </span>
                )}
              </div>
              <ProductPrice
                value={Number(product.price)}
                className="w-fit rounded-full bg-primary/10 text-primary px-5 py-2"
              />
              {discount && (
                <span className='text-xs text-green-600 dark:text-green-400'>
                  {formatNumberLocale(discount.saveAmount, locale)}{' '}
                  {tCommon('currency')} {t('discountSave')}
                </span>
              )}
            </div>
          </div>
          <div className='mt-10'>
            <p className='font-semibold mb-2'>{t('description')}:</p>
            <p className='leading-relaxed text-muted-foreground'>
              {isFa ? product.descriptionFa : product.description}
            </p>
          </div>

          {/* Physical properties (when provided) */}
          {(product.lengthCm != null ||
            product.widthCm != null ||
            product.heightCm != null ||
            product.weightG != null) && (
            <div className='mt-6 space-y-1 text-sm text-muted-foreground'>
              {(product.lengthCm != null ||
                product.widthCm != null ||
                product.heightCm != null) && (
                <p>
                  {t('dimensions')}:{' '}
                  {formatNumberLocale(Number(product.lengthCm ?? 0), locale)} ×{' '}
                  {formatNumberLocale(Number(product.widthCm ?? 0), locale)} ×{' '}
                  {formatNumberLocale(Number(product.heightCm ?? 0), locale)}{' '}
                  {tCommon('currency') === 'تومان' ? 'سانتی‌متر' : 'cm'}
                </p>
              )}
              {product.weightG != null && (
                <p>
                  {t('weight')}:{' '}
                  {formatNumberLocale(Number(product.weightG), locale)}{' '}
                  {tCommon('currency') === 'تومان' ? 'گرم' : 'g'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Column */}
        <div className='lg:col-span-1 min-w-0'>
          {hasVariants ? (
            <VariantSelector
              options={options}
              variants={variants}
              initialSelection={initialSelection}
              productId={product.id}
              productName={product.name}
              nameFa={product.nameFa}
              slug={product.slug}
              defaultImage={product.images[0]}
              cart={cart}
              favorited={isFavorited}
            />
          ) : (
            <Card className='w-auto max-w-full overflow-hidden lg:sticky lg:top-24'>
              <CardContent className='p-4 min-w-0'>
                <div className="mb-2 flex justify-between">
                  <div>{t('details')}</div>
                  <div>
                    <ProductPrice value={Number(product.price)} />
                  </div>
                </div>
                <div className="mb-2 flex justify-between">
                  <div>{t('status')}</div>
                  {product.stock > 0 ? (
                    <Badge variant="outline">{t('inStock')}</Badge>
                  ) : (
                    <Badge variant="destructive">{t('unavailable')}</Badge>
                  )}
                </div>
                {product.stock > 0 && (
                  <div className='mt-4 flex items-center gap-2'>
                    <div className='flex-1'>
                      <AddToCart
                        cart={cart}
                        item={{
                          productId: product.id,
                          name: product.name,
                          nameFa: product.nameFa,
                          slug: product.slug,
                          price: product.price,
                          image: product.images[0],
                        }}
                      />
                    </div>
                    <FavoriteToggle
                      productId={product.id}
                      initialFavorited={isFavorited}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reviews */}
      <ReviewsSection
        productId={product.id}
        rating={Number(product.rating)}
        numReviews={product.numReviews}
        slug={product.slug}
      />
    </section>
  );
};

export default ProductDetailsPage;
