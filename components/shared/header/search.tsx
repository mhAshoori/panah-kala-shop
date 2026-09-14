'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CategoryOption = { value: string; label: string };

type Suggestion = {
  slug: string;
  name: string;
  brand: string;
  price: string;
  image: string | null;
};

/** Debounced autocomplete dropdown fed by /api/search/suggest. */
const useSuggestions = (q: string, locale: string) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const term = q.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setSuggestions(data.suggestions);
        setOpen(data.suggestions.length > 0);
      } catch {
        // aborted or network error — keep previous state
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, locale]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return { suggestions, open, setOpen, boxRef };
};

/**
 * Header search. Client-side submit (SPA navigation → progress bar works),
 * dir="rtl" so the Persian placeholder is right-aligned.
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
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [category, setCategory] = useState(defaultCategory);
  const { suggestions, open, setOpen, boxRef } = useSuggestions(q, locale);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim().slice(0, 100));
    if (category && category !== 'all') params.set('category', category);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ''}`);
    onSearched?.();
  };

  const goto = (slug: string) => {
    setOpen(false);
    router.push(`/product/${slug}`);
    onSearched?.();
  };

  const dropdown = open && suggestions.length > 0 && (
    <div
      className='absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-lg'
      role='listbox'
    >
      {suggestions.map((s) => (
        <button
          key={s.slug}
          type='button'
          role='option'
          onClick={() => goto(s.slug)}
          className='flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-muted'
        >
          {s.image && (
            <Image
              src={s.image}
              alt={s.name}
              width={36}
              height={36}
              sizes='36px'
              className='h-9 w-9 shrink-0 rounded-sm object-cover'
              unoptimized
            />
          )}
          <span className='min-w-0 flex-1'>
            <span className='block truncate text-sm'>{s.name}</span>
            <span className='block text-xs text-muted-foreground'>
              {s.brand}
            </span>
          </span>
          <span className='shrink-0 text-xs font-semibold'>
            {tCommon('currency')} {s.price.split('.')[0]}
          </span>
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div ref={boxRef} className='relative min-w-0 flex-1'>
        <form
          onSubmit={submit}
          dir='rtl'
          className={cn('flex w-full min-w-0 items-center gap-2', className)}
        >
          <Input
            name='q'
            type='search'
            dir='rtl'
            enterKeyHint='search'
            autoComplete='off'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
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
        {dropdown}
      </div>
    );
  }

  return (
    <div ref={boxRef} className='relative min-w-0 flex-1'>
      <form
        onSubmit={submit}
        className={cn(
          'flex h-9 w-full min-w-0 items-stretch overflow-visible rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
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
          dir='rtl'
          enterKeyHint='search'
          autoComplete='off'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={t('searchPlaceholder')}
          className='min-w-0 flex-1 rounded-none border-0 shadow-none text-right focus-visible:ring-0 dark:bg-transparent'
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
      {dropdown}
    </div>
  );
};

export default SearchBar;
