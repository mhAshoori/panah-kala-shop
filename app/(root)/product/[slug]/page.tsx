import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import ProductPrice from '@/components/product/product-price';
import ProductImages from '@/components/product/product-images';
import AddToCart from '@/components/shared/product/add-to-cart';
import StarRating from '@/components/shared/product/star-rating';
import ReviewsSection from '@/components/shared/product/reviews-section';
import Breadcrumbs from '@/components/shared/breadcrumbs';
import { Card, CardContent } from '@/components/ui/card';
import { getProductBySlug } from '@/lib/actions/product.actions';
import { getMyCart } from '@/lib/actions/cart.actions';
import { Badge } from '@/components/ui/badge';
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
}) => {
  const { slug } = await props.params;
  const locale = await getLocale();
  const t = await getTranslations('product');
  const isFa = locale === 'fa';

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Load the visitor's cart so AddToCart can show +/- controls
  const cart = await getMyCart();

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
                {Number(product.rating).toFixed(1)} · {product.numReviews} {t('reviews')}
              </span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ProductPrice
                value={Number(product.price)}
                className="w-fit rounded-full bg-primary/10 text-primary px-5 py-2"
              />
            </div>
          </div>
          <div className='mt-10'>
            <p className='font-semibold mb-2'>{t('description')}:</p>
            <p className='leading-relaxed text-muted-foreground'>
              {isFa ? product.descriptionFa : product.description}
            </p>
          </div>
        </div>

        {/* Action Column */}
        <div className='lg:col-span-1'>
          <Card className='lg:sticky lg:top-24'>
            <CardContent className='p-4'>
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
                <div className='mt-4'>
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews */}
      <ReviewsSection
        productId={product.id}
        rating={Number(product.rating)}
        numReviews={product.numReviews}
      />
    </section>
  );
};

export default ProductDetailsPage;
