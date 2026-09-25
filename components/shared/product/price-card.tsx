'use client';

import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { formatNumberLocale } from '@/lib/persian';
import { getDiscount } from '@/lib/discount';

/**
 * The one place a product's price is rendered on the product page.
 *
 * It exists because the price used to be printed in TWO places at once — once
 * in the details column and again in the variant selector's details card — each
 * with its own struck-through original, so the same product showed two
 * different "before" prices on one screen. Whoever wins the layout race
 * shouldn't decide what a customer reads, so there is now a single card.
 *
 * `variantState` comes from the caller because the PDP knows the purchasable
 * variants; a card that re-derived it could disagree with the aggregation that
 * cleared the product-level discount.
 */
const PriceCard = ({
  price,
  compareAtPrice,
  variantState,
  bestVariantPercent,
  className,
}: {
  price: number;
  compareAtPrice: number | null;
  /** 'partialDiscount' renders the note instead of a percentage. */
  variantState?: 'noDiscount' | 'uniformDiscount' | 'partialDiscount';
  /** Strongest discount across the purchasable variants, for the partial state. */
  bestVariantPercent?: number | null;
  className?: string;
}) => {
  const locale = useLocale();
  const t = useTranslations('product');
  const tCommon = useTranslations('common');

  const discount = getDiscount(price, compareAtPrice);
  const partial = variantState === 'partialDiscount';

  // In the partial state there is no single honest percentage: the variants
  // disagree, and the product-level pair is null, so any single number would
  // advertise a discount the shopper may not be able to buy. "From X%" is the
  // strongest available, which is still true of the product as a whole.
  const shownPercent = partial ? bestVariantPercent : (discount?.percent ?? null);

  return (
    <div
      className={cn(
        'rounded-xl border-2 border-primary/20 bg-primary/5 p-4',
        className
      )}
    >
      {partial ? (
        <span className='inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground'>
          {shownPercent
            ? t('discountSomeVariantsFrom', {
                percent: formatNumberLocale(shownPercent, locale),
              })
            : t('discountSomeVariants')}
        </span>
      ) : (
        discount && (
          <span className='inline-flex items-center gap-1 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground'>
            ٪{formatNumberLocale(discount.percent, locale)} {t('discountOff')}
          </span>
        )
      )}

      <div className='mt-2 flex flex-wrap items-baseline gap-2'>
        <p className='text-3xl font-bold text-primary'>
          {formatNumberLocale(price, locale)}
          <span className='text-xs font-normal align-super ms-1'>
            {tCommon('currency')}
          </span>
        </p>
        {discount && !partial && (
          <span className='text-sm text-muted-foreground line-through'>
            {formatNumberLocale(Number(compareAtPrice), locale)}
          </span>
        )}
      </div>

      {discount && !partial && (
        <p className='mt-1 text-xs text-green-600 dark:text-green-400'>
          {formatNumberLocale(discount.saveAmount, locale)}{' '}
          {tCommon('currency')} {t('discountSave')}
        </p>
      )}
    </div>
  );
};

export default PriceCard;
