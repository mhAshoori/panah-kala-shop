import { getLocale, getTranslations } from 'next-intl/server';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAllCategories } from '@/lib/actions/product.actions';
import { cn } from '@/lib/utils';

// Header search: keyword + optional category, submits to the /search page
const SearchBar = async ({ className }: { className?: string }) => {
  const t = await getTranslations('header');
  const locale = await getLocale();
  const categories = await getAllCategories();

  return (
    <form action='/search' method='GET' className={cn('flex w-full max-w-xl items-center gap-2', className)}>
      <div className='relative flex-1'>
        <select
          name='category'
          defaultValue='all'
          aria-label={t('categories')}
          className='absolute start-0 top-0 z-10 h-full appearance-none bg-transparent border-e px-2 text-xs text-muted-foreground outline-none cursor-pointer'
        >
          <option value='all'>{t('allCategories')}</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {locale === 'fa' ? c.categoryFa : c.category}
            </option>
          ))}
        </select>
        <Input name='q' type='text' placeholder={t('searchPlaceholder')} className='ps-32 pe-24' />
      </div>
      <Button type='submit' size='icon' aria-label={t('search')}>
        <Search className='h-4 w-4 rtl:-scale-x-100' />
      </Button>
    </form>
  );
};

export default SearchBar;
