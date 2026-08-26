import { cn } from '@/lib/utils';

// Formats a Toman amount with Persian digit grouping handled by the caller's locale.
const formatToman = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

const ProductPrice = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => {
  const formatted = formatToman(value);

  return (
    <p className={cn('text-2xl', className)}>
      {formatted}
      <span className='text-xs align-super ms-1'>تومان</span>
    </p>
  );
};

export default ProductPrice;
