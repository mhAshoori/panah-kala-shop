'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CategoryOption = { value: string; label: string };

/**
 * Header search. Client-side submit (SPA navigation → progress bar works),
 * dir="auto" so mixed Persian/Latin queries render correctly on Android.
 *
 * - Desktop: a unified bordered row [category select | input | button]
 * - Compact (mobile sheet): right-aligned input + button (categories live in
 *   the sheet's own tree right above it)
 */
const SearchBar = ({
  categories,
  compact = false,
  className,
  defaultQuery = '',
  defaultCategory = 'all',
  onSearched,
}: {
  categories: CategoryOption[];
  compact?: boolean;
  className?: string;
  defaultQuery?: string;
  defaultCategory?: string;
  /** Called after the client-side navigation to the results page (the
      mobile menu sheet uses this to close itself) */
  onSearched?: () => void;
}) => {
  const t = useTranslations('header');
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [category, setCategory] = useState(defaultCategory);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim().slice(0, 100));
    if (category && category !== 'all') params.set('category', category);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ''}`);
    onSearched?.();
  };

  if (compact) {
    return (
      <form
        onSubmit={submit}
        dir='rtl'
        className={cn('flex w-full min-w-0 items-center gap-2', className)}
      >
        <Input
          name='q'
          type='search'
          dir='auto'
          enterKeyHint='search'
          autoComplete='off'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className='min-w-0 text-right'
        />
        <Button
          type='submit'
          size='icon'
          aria-label={t('search')}
          className='shrink-0'
        >
          <Search className='h-4 w-4 rtl:-scale-x-100' />
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        'flex h-9 w-full min-w-0 items-stretch overflow-hidden rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        className
      )}
    >
      <select
        name='category'
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label={t('categories')}
        className='w-28 shrink-0 cursor-pointer appearance-none border-e bg-muted/50 px-2 text-xs text-muted-foreground outline-none'
      >
        <option value='all'>{t('allCategories')}</option>
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <Input
        name='q'
        type='search'
        dir='auto'
        enterKeyHint='search'
        autoComplete='off'
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className='min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0 dark:bg-transparent'
      />
      <Button
        type='submit'
        size='icon'
        aria-label={t('search')}
        className='w-10 shrink-0 rounded-none border-0 bg-transparent text-muted-foreground shadow-none hover:bg-muted hover:text-foreground dark:bg-transparent'
      >
        <Search className='h-4 w-4 rtl:-scale-x-100' />
      </Button>
    </form>
  );
};

export default SearchBar;
