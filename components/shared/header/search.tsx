'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Category = { name: string; nameFa: string };

// Header search. Client-side submit (SPA navigation → progress bar works),
// dir="auto" so mixed Persian/Latin queries render correctly on Android.
const SearchBar = ({
  categories,
  compact = false,
  className,
}: {
  categories: Category[];
  compact?: boolean;
  className?: string;
}) => {
  const t = useTranslations('header');
  const router = useRouter();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim().slice(0, 100));
    if (category && category !== 'all') params.set('category', category);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ''}`);
  };

  return (
    <form
      onSubmit={submit}
      className={cn('flex w-full min-w-0 items-center gap-2', className)}
    >
      <div className='relative flex min-w-0 flex-1 items-center'>
        {!compact && categories.length > 0 && (
          <select
            name='category'
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t('categories')}
            className='absolute start-0 top-0 z-10 h-full max-w-[9.5rem] cursor-pointer appearance-none truncate border-e bg-transparent px-2 text-xs text-muted-foreground outline-none'
          >
            <option value='all'>{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.nameFa}
              </option>
            ))}
          </select>
        )}
        <Input
          name='q'
          type='search'
          dir='auto'
          enterKeyHint='search'
          autoComplete='off'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className={
            compact ? 'min-w-0' : 'ps-40 pe-12 min-w-0'
          }
        />
      </div>
      <Button type='submit' size='icon' aria-label={t('search')} className='shrink-0'>
        <Search className='h-4 w-4 rtl:-scale-x-100' />
      </Button>
    </form>
  );
};

export default SearchBar;
