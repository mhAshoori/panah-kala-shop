'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

// Debounced admin search: updates the `q` URL param, resetting pagination
const AdminSearch = () => {
  const t = useTranslations('admin');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (value === current) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('q', value);
      } else {
        params.delete('q');
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [value, searchParams, pathname, router]);

  return (
    <div className='relative max-w-sm'>
      <Search
        className='absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
        aria-hidden='true'
      />
      <Input
        type='search'
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className='ps-9'
        aria-label={t('search')}
      />
    </div>
  );
};

export default AdminSearch;
