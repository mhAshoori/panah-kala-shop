'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Native select that pushes the chosen sort into the URL
const SortDropdown = () => {
  const t = useTranslations('search');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = searchParams.get('sort') ?? 'newest';

  const onChange = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    if (sort === 'newest') {
      params.delete('sort');
    } else {
      params.set('sort', sort);
    }
    params.delete('page');
    const qs = params.toString();
    startTransition(() => {
      router.push(`/search${qs ? `?${qs}` : ''}`);
    });
  };

  return (
    <div className='relative flex items-center gap-2'>
      {isPending && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t('sortBy')}
        className='h-9 rounded-md border bg-transparent px-2 text-sm outline-none cursor-pointer'
      >
        <option value='newest'>{t('sortNewest')}</option>
        <option value='lowest'>{t('sortLowest')}</option>
        <option value='highest'>{t('sortHighest')}</option>
        <option value='rating'>{t('sortRating')}</option>
      </select>
    </div>
  );
};

export default SortDropdown;
