'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { formatCurrencyLocale } from '@/lib/persian';

// Client component: rendered both on the server page and inside the client
// VariantSelector (price updates when the user picks a variant).
const ProductPrice = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const locale = useLocale();
  const formatted = formatCurrencyLocale(value, locale);

  return (
    <p className={cn('text-2xl', className)}>
      {formatted}
      <span className='text-xs align-super ms-1'>
        {locale === 'fa' ? 'تومان' : 'Toman'}
      </span>
    </p>
  );
};

export default ProductPrice;
