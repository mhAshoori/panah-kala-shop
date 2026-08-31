import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import ProductPrice from '@/components/product/product-price';
import StarRating from '@/components/shared/product/star-rating';
import { getDiscount } from '@/lib/discount';
import { formatNumberLocale } from '@/lib/persian';
import type { Product } from '@/types';

const ProductCard = async ({ product }: { product: Product }) => {
  const locale = await getLocale();
  const t = await getTranslations('product');
  const name = locale === 'fa' ? product.nameFa : product.name;
  const category = locale === 'fa' ? product.categoryFa : product.category;
  const discount = getDiscount(product.price, product.compareAtPrice);

  return (
    <Card className='group w-full h-full pt-0 gap-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-1'>
      <Link
        href={`/product/${product.slug}`}
        className='relative block aspect-square overflow-hidden rounded-t-xl bg-muted'
      >
        <Image
          priority
          src={product.images[0]}
          alt={name}
          fill
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
          className='object-cover transition-transform duration-500 group-hover:scale-105'
        />
        {discount && (
          <span className='absolute top-2 start-2 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground'>
            ٪{formatNumberLocale(discount.percent, locale)}
          </span>
        )}
        {product.stock === 0 && (
          <div className='absolute inset-0 flex items-center justify-center bg-background/60'>
            <Badge variant='destructive'>{t('outOfStock')}</Badge>
          </div>
        )}
      </Link>

      <CardContent className='flex flex-1 flex-col gap-2 px-4'>
        <p className='text-xs text-muted-foreground'>
          {category} · {product.brand}
        </p>
        <Link href={`/product/${product.slug}`} className='line-clamp-2'>
          <h2 className='text-sm font-medium leading-snug hover:text-primary transition-colors'>
            {name}
          </h2>
        </Link>
        <div className='mt-auto flex items-center justify-between gap-2 pt-1'>
          {product.stock > 0 ? (
            <div className='flex flex-col gap-0.5'>
              {discount && (
                <span className='text-xs text-muted-foreground line-through'>
                  {formatNumberLocale(Number(product.compareAtPrice), locale)}
                </span>
              )}
              <ProductPrice value={Number(product.price)} className='text-lg' />
            </div>
          ) : (
            <span className='text-sm font-medium text-destructive'>
              {t('outOfStock')}
            </span>
          )}
          <div className='flex items-center gap-1'>
            <StarRating value={Number(product.rating)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
