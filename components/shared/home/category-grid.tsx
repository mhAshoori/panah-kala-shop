import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { getCategoriesWithCount } from '@/lib/actions/product.actions';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// Gradient palettes cycled across category cards
const PALETTES = [
  'from-teal-500/15 to-cyan-400/10 text-teal-700 dark:text-teal-300',
  'from-amber-500/15 to-orange-400/10 text-amber-700 dark:text-amber-300',
  'from-rose-500/15 to-pink-400/10 text-rose-700 dark:text-rose-300',
  'from-indigo-500/15 to-violet-400/10 text-indigo-700 dark:text-indigo-300',
  'from-emerald-500/15 to-green-400/10 text-emerald-700 dark:text-emerald-300',
  'from-sky-500/15 to-blue-400/10 text-sky-700 dark:text-sky-300',
];

// "Shop by category" grid linking to the /category pages
const CategoryGrid = async () => {
  const t = await getTranslations('home');
  const locale = await getLocale();
  const isFa = locale === 'fa';
  const categories = await getCategoriesWithCount();

  if (categories.length === 0) return null;

  return (
    <section className='space-y-4'>
      <div className='flex-between'>
        <h2 className='h2-bold'>{t('shopByCategory')}</h2>
      </div>

      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        {categories.slice(0, 8).map((c, i) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className={cn(
              'group animate-fade-up relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl border bg-gradient-to-br p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg',
              PALETTES[i % PALETTES.length]
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className='absolute end-3 top-3 text-foreground/40 transition-all duration-300 group-hover:text-foreground ltr:hidden rtl:-scale-x-100'>
              <ArrowLeft className='h-4 w-4' />
            </span>
            <span className='absolute end-3 top-3 hidden text-foreground/40 transition-all duration-300 group-hover:text-foreground ltr:block rtl:hidden'>
              <ArrowRight className='h-4 w-4' />
            </span>
            <span className='mb-1 text-2xl font-bold'>
              {(isFa ? c.nameFa : c.name).charAt(0)}
            </span>
            <span className='text-sm font-semibold text-foreground'>
              {isFa ? c.nameFa : c.name}
            </span>
            <span className='text-xs text-muted-foreground'>
              {t('productsCount', { count: c._count.products })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
