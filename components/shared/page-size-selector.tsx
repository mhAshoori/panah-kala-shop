'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const;

/**
 * Per-page size selector for any listing page. Writes the `size` URL param
 * (capped server-side) and resets pagination. Works on /search, /category,
 * admin tables and user orders.
 */
const PageSizeSelector = ({ current }: { current: number }) => {
  const t = useTranslations('search');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onChange = (size: string) => {
    const params = new URLSearchParams(searchParams);
    if (size === String(PAGE_SIZE_OPTIONS[0])) {
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
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
};

export default PageSizeSelector;
