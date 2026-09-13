'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AddToCart from '@/components/shared/product/add-to-cart';
import FavoriteToggle from '@/components/shared/product/favorite-toggle';
import ProductPrice from '@/components/product/product-price';
import { cn } from '@/lib/utils';
import { LOW_STOCK_THRESHOLD } from '@/lib/constants';
import { formatNumberLocale } from '@/lib/persian';
import { resolveVariant, valueAvailable } from '@/lib/variants';
import type { OptionLite, VariantLite } from '@/lib/variants';
import type { Cart } from '@/types';

/**
 * Digikala-style diversity block: pick option values (hex swatches for
 * color options, chips otherwise) → price/stock/image reflect the resolved
 * variant → add-to-cart adds that exact variant.
 * Selection state lives in event handlers only (React 19: no setState-in-
 * effect); the initial selection comes from the server (?variant=<id>).
 */
const VariantSelector = ({
  options,
  variants,
  initialSelection,
  productId,
  productName,
  nameFa,
  slug,
  defaultImage,
  cart,
  favorited,
}: {
  options: OptionLite[];
  variants: VariantLite[];
  initialSelection: Record<string, string>;
  productId: string;
  productName: string;
  nameFa: string;
  slug: string;
  defaultImage: string;
  cart?: Cart | null;
  favorited: boolean;
}) => {
  const t = useTranslations('product');
  const locale = useLocale();
  const [selection, setSelection] =
    useState<Record<string, string>>(initialSelection);

  const selected = useMemo(
    () => resolveVariant(variants, selection),
    [variants, selection]
  );

  // Incomplete selection: show the cheapest in-stock variant as "from" price
  const fallback = useMemo(
    () =>
      [...variants]
        .filter((v) => v.stock > 0)
        .sort((a, b) => Number(a.price) - Number(b.price))[0] ?? variants[0],
    [variants]
  );
  const active = selected ?? fallback;

  const price = Number(active?.price ?? 0);
  const compareAtPrice = active?.compareAtPrice ? Number(active.compareAtPrice) : null;
  const image = active?.image || defaultImage;
  const stock = active?.stock ?? 0;
  const complete = selected != null;

  const choose = (optionId: string, valueId: string) => {
    setSelection((prev) => ({ ...prev, [optionId]: valueId }));
  };

  const item = {
    productId,
    variantId: selected?.id,
    variantLabel: selected
      ? selected.options.map((o) => `${o.optionFa}: ${o.valueFa}`).join(' / ')
      : undefined,
    name: productName,
    nameFa,
    slug,
    price: String(price),
    image,
  };

  return (
    <Card className='w-auto max-w-full overflow-hidden lg:sticky lg:top-24'>
      <CardContent className='p-4 min-w-0 space-y-3'>
        {options.map((option) => {
          const isColor = option.values.some((v) => v.hex);
          return (
            <div key={option.id}>
              <p className='mb-1.5 text-sm font-medium'>
                {option.nameFa}: {option.values.find((v) => v.id === selection[option.id])?.valueFa}
              </p>
              <div className='flex flex-wrap gap-2'>
                {option.values.map((v) => {
                  const isSelected = selection[option.id] === v.id;
                  const available = valueAvailable(variants, selection, option.id, v.id);
                  // Sparse products (e.g. 5 designs in brown, 1 in yellow):
                  // hide values that can't combine with the rest of the
                  // selection instead of graying them out.
                  if (!available && !isSelected) return null;
                  return (
                    <button
                      key={v.id}
                      type='button'
                      onClick={() => available && choose(option.id, v.id)}
                      aria-pressed={isSelected}
                      aria-label={v.valueFa}
                      title={v.valueFa}
                      className={cn(
                        'rounded-full border transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {isColor ? (
                        <span
                          className='block h-8 w-8 rounded-full'
                          style={{ background: v.hex ?? '#888888' }}
                        />
                      ) : (
                        <span className='block px-3 py-1.5 text-sm'>
                          {v.valueFa}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className='flex items-center justify-between border-t pt-3'>
          <ProductPrice value={price} className='font-bold' />
          {compareAtPrice && compareAtPrice > price && (
            <span className='text-sm text-muted-foreground line-through tabular-nums'>
              {formatNumberLocale(compareAtPrice, locale)}
            </span>
          )}
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-sm'>{t('status')}</span>
          {stock > 0 ? (
            stock <= LOW_STOCK_THRESHOLD ? (
              <Badge
                variant='outline'
                className='border-amber-500 text-amber-600 dark:text-amber-400'
              >
                {t('onlyLeft', {
                  count: formatNumberLocale(stock, locale),
                })}
              </Badge>
            ) : (
              <Badge variant='outline'>{t('inStock')}</Badge>
            )
          ) : (
            <Badge variant='destructive'>{t('unavailable')}</Badge>
          )}
        </div>

        {complete && stock > 0 && (
          <div className='flex items-center gap-2'>
            <div className='flex-1'>
              <AddToCart cart={cart} item={item} />
            </div>
            <FavoriteToggle productId={productId} initialFavorited={favorited} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VariantSelector;
