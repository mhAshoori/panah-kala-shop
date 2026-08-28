'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const Pagination = ({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) => {
  const t = useTranslations('common');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <nav className='flex items-center justify-center gap-1 pt-4' aria-label='Pagination'>
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          className='inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted'
          aria-label={t('previous')}
        >
          <ChevronRight className='rtl:rotate-180 h-4 w-4' />
        </Link>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm',
            p === page
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'border hover:bg-muted'
          )}
        >
          {p}
        </Link>
      ))}

      {page < totalPages && (
        <Link
          href={hrefFor(page + 1)}
          className='inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted'
          aria-label={t('next')}
        >
          <ChevronLeft className='rtl:rotate-180 h-4 w-4' />
        </Link>
      )}
    </nav>
  );
};

export default Pagination;
