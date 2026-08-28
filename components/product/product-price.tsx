import { getLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { formatCurrencyLocale } from '@/lib/persian';

const ProductPrice = async ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const locale = await getLocale();
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
