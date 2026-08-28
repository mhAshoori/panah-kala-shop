import { getTranslations } from 'next-intl/server';

import { getBrands } from '@/lib/actions/product.actions';
import { cn } from '@/lib/utils';

// Infinite scrolling brand strip (pauses on hover, masked edges)
const BrandMarquee = async ({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) => {
  const t = await getTranslations('home');
  const brands = await getBrands();

  if (brands.length < 4) return null;

  // Duplicate the list so the -50% translate loops seamlessly
  const doubled = [...brands, ...brands];

  return (
    <section className={cn('space-y-3', className)}>
      <p className='text-center text-xs font-medium uppercase tracking-widest text-muted-foreground'>
        {title ?? t('brandsTitle')}
      </p>
      <div className='marquee-paused relative overflow-hidden'>
        {/* Edge fade masks */}
        <div className='pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-background to-transparent rtl:bg-gradient-to-l' />
        <div className='pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-background to-transparent rtl:bg-gradient-to-r' />
        <div className='animate-marquee flex w-max items-center gap-12 py-2'>
          {doubled.map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className='whitespace-nowrap text-lg font-bold text-muted-foreground/60 transition-colors hover:text-primary'
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandMarquee;
