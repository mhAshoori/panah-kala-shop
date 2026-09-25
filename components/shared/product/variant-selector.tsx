'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import AddToCart from '@/components/shared/product/add-to-cart';
import FavoriteToggle from '@/components/shared/product/favorite-toggle';
import PriceCard from '@/components/shared/product/price-card';
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
  const image = active?.image || defaultImage;
  const stock = active?.stock ?? 0;
  const complete = selected != null;
  // The selected variant's OWN original price. The product page shows this
  // card inside the selector, so it reports the exact thing the shopper is
  // about to add to the cart — never a product-level aggregate, which on a
  // product whose variants disagree would name a discount this variant does
  // not carry.
  const compareAtPrice = active?.compareAtPrice
    ? Number(active.compareAtPrice)
    : null;

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
    price,
    image,
  };

  return (
    <Card className='w-auto max-w-full overflow-hidden lg:sticky lg:top-24'>
      <CardContent className='p-4 min-w-0 space-y-3'>
        {options.map((option, optIdx) => {
          // A colour option is one whose values carry a hex. Rendering is keyed
          // off the option, not off individual values, so a mixed set still
          // draws as swatches instead of half-text half-discs.
          const isColor = option.values.some((v) => v.hex);
          const selectedValue = option.values.find(
            (v) => v.id === selection[option.id]
          );
          return (
            <div key={option.id}>
              <p className='mb-2 flex items-center gap-1.5 text-sm font-medium'>
                <span>{option.nameFa}:</span>
                {/* The chosen colour is named by a small dot, not by text. The
                    swatch itself already shows the colour; repeating the name
                    here made the row read like a sentence. */}
                {isColor ? (
                  selectedValue?.hex && (
                    <span
                      aria-hidden
                      className='size-2.5 rounded-full ring-1 ring-border'
                      style={{ background: selectedValue.hex }}
                    />
                  )
                ) : (
                  <span className='text-muted-foreground'>
                    {selectedValue?.valueFa}
                  </span>
                )}
              </p>
              <div className='flex flex-wrap gap-2.5'>
                {option.values.map((v) => {
                  const isSelected = selection[option.id] === v.id;
                  // First option (e.g. color) is always fully shown; deeper
                  // options hide values that can't combine with the selection.
                  const available =
                    optIdx === 0 ||
                    valueAvailable(variants, selection, option.id, v.id);
                  // Sparse products (e.g. 5 designs in brown, 1 in yellow):
                  // hide values that can't combine with the rest of the
                  // selection instead of graying them out.
                  if (!available && !isSelected) return null;
                  if (!isColor) {
                    return (
                      <button
                        key={v.id}
                        type='button'
                        onClick={() => available && choose(option.id, v.id)}
                        aria-pressed={isSelected}
                        aria-label={v.valueFa}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {v.valueFa}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={v.id}
                      type='button'
                      onClick={() => available && choose(option.id, v.id)}
                      aria-pressed={isSelected}
                      aria-label={v.valueFa}
                      title={v.valueFa}
                      className={cn(
                        // White puck with a neutral ring, holding an inner
                        // colour disc. The white gap is what makes a black and
                        // a white swatch read as two circles rather than one
                        // being a hole in the page.
                        'relative flex size-9 items-center justify-center rounded-full bg-background ring-1 transition-all',
                        isSelected
                          ? 'ring-primary ring-2'
                          : 'ring-border hover:ring-primary/50'
                      )}
                    >
                      <span
                        className='size-5 rounded-full ring-1 ring-black/10'
                        style={{ background: v.hex ?? '#888888' }}
                      />
                      {/* Check sits on the disc, not the puck, so it reads as
                          "this colour is chosen" rather than "this button is
                          focused". */}
                      {isSelected && (
                        <Check
                          className='pointer-events-none absolute size-4 text-white mix-blend-difference'
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* The product page's one price block, living here so it can report
            the SELECTED variant's price and discount. The details column has
            no price at all. */}
        <PriceCard
          price={price}
          compareAtPrice={compareAtPrice}
          className='mt-3'
        />

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
