'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { pageSizeOptions } from '@/lib/constants';

/**
 * Per-page size selector for any listing page. Writes the `size` URL param
 * (capped server-side) and resets pagination. Works on /search, /category,
 * admin tables and user orders. Options derive from the admin-set base size.
 */
const PageSizeSelector = ({
  current,
  base,
}: {
  current: number;
  base?: number;
}) => {
  const t = useTranslations('search');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const options = pageSizeOptions(base ?? current);

  const onChange = (size: string) => {
    const params = new URLSearchParams(searchParams);
    if (size === String(options[0])) {
      params.delete('size');
    } else {
      params.set('size', size);
    }
    params.delete('page');
    const qs = params.toString();
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ''}`);
    });
  };

  return (
    <div className='relative flex items-center gap-2'>
      {isPending && (
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      )}
      <select
        value={String(current)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t('perPage')}
        className='h-9 rounded-md border bg-transparent px-2 text-sm outline-none cursor-pointer'
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PageSizeSelector;
