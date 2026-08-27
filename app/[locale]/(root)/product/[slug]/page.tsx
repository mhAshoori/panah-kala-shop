import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import ProductPrice from '@/components/product/product-price';
import ProductImages from '@/components/product/product-images';
import AddToCart from '@/components/shared/product/add-to-cart';
import { Card, CardContent } from '@/components/ui/card';
import { getProductBySlug } from '@/lib/actions/product.actions';
import { getMyCart } from '@/lib/actions/cart.actions';
import { Badge } from '@/components/ui/badge';

const ProductDetailsPage = async (props: {
  params: Promise<{ slug: string; locale: string }>;
}) => {
  const { slug, locale } = await props.params;
  const t = await getTranslations('product');
  const isFa = locale === 'fa';

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Load the visitor's cart so AddToCart can show +/- controls
  const cart = await getMyCart();

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-5">
        {/* Images Column */}
        <div className="col-span-2">
          <ProductImages images={product.images} />
        </div>

        {/* Details Column */}
        <div className="col-span-2 p-5">
          <div className="flex flex-col gap-6">
            <p className="text-muted-foreground">
              {isFa ? product.categoryFa : product.category} · {product.brand}
            </p>
            <h1 className="h3-bold">{isFa ? product.nameFa : product.name}</h1>
            <p>
              {Number(product.rating)} ★ ({product.numReviews} {t('reviews')})
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ProductPrice
                value={Number(product.price)}
                className="w-fit rounded-full bg-primary/10 text-primary px-5 py-2"
              />
            </div>
          </div>
          <div className="mt-10">
            <p className="font-semibold mb-2">{t('description')}:</p>
            <p>{isFa ? product.descriptionFa : product.description}</p>
          </div>
        </div>

        {/* Action Column */}
        <div>
          <Card>
            <CardContent className="p-4">
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
    </section>
  );
};

export default ProductDetailsPage;
