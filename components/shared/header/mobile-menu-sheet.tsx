'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, EllipsisVertical } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import SearchBar from './search';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import type { DockCategory } from './category-menu';

/**
 * Mobile actions sheet: compact search, the full category tree, and the
 * action icons. Closes when any link inside is followed.
 */
const MobileMenuSheet = ({
  categories,
  actions,
}: {
  categories: DockCategory[];
  actions: ReactNode;
}) => {
  const t = useTranslations('header');
  const tCategory = useTranslations('category');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const mains = categories.filter((c) => !c.parentId);
  const subsOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className='align-middle' aria-label={t('menu')}>
        <EllipsisVertical />
      </SheetTrigger>
      <SheetContent
        className='flex flex-col items-start gap-5 overflow-y-auto p-6'
        onClick={(e) => {
          // Close the sheet when any link inside is followed
          if ((e.target as HTMLElement).closest('a')) {
            setOpen(false);
          }
        }}
      >
        <SheetTitle className='mb-1'>{t('menu')}</SheetTitle>

        {/* Compact search: right-aligned in RTL */}
        <div dir='rtl' className='w-full min-w-0'>
          <SearchBar
            categories={categories.map((c) => ({
              value: c.name,
              label: c.nameFa,
            }))}
            compact
          />
        </div>

        {/* Category tree with expandable subcategories */}
        <div className='w-full space-y-1'>
          <p className='px-1 pb-1 text-xs font-semibold text-muted-foreground'>
            {tCategory('title')}
          </p>
          {mains.map((main) => {
            const subs = subsOf(main.id);
            const isExpanded = expanded === main.id;
            return (
              <div key={main.id} className='rounded-xl'>
                <div className='flex items-center'>
                  <Link
                    href={`/category/${main.slug}`}
                    onClick={() => setOpen(false)}
                    className='flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted'
                  >
                    <span>{main.nameFa}</span>
                    <span className='text-xs text-muted-foreground'>
                      {main.count}
                    </span>
                  </Link>
                  {subs.length > 0 && (
                    <button
                      type='button'
                      aria-label={main.nameFa}
                      aria-expanded={isExpanded}
                      onClick={() => setExpanded(isExpanded ? null : main.id)}
                      className='me-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>
                  )}
                </div>
                {subs.length > 0 && isExpanded && (
                  <div className='ms-6 border-s ps-2'>
                    {subs.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/category/${sub.slug}`}
                        onClick={() => setOpen(false)}
                        className='flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                      >
                        <span>{sub.nameFa}</span>
                        <span className='text-xs'>{sub.count}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions inline on one row */}
        <div className='flex w-full items-center justify-between gap-2'>
          {actions}
        </div>

        <SheetDescription className='sr-only'>{t('menu')}</SheetDescription>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenuSheet;
