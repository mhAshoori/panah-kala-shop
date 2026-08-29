'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, LayoutGrid } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export type DockCategory = {
  id: string;
  slug: string;
  name: string;
  nameFa: string;
  icon: string;
  parentId: string | null;
  count: number;
};

/**
 * Header "Categories" mega menu with the full category tree:
 * main categories expand (accordion) to reveal their subcategories.
 * Opens on hover and click, closes on outside click / Escape / navigation.
 */
const CategoryMenu = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('header');
  const tCategory = useTranslations('category');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const mains = categories.filter((c) => !c.parentId);
  const subsOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (mains.length === 0) return null;

  return (
    <div
      ref={ref}
      className='relative'
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Button
        variant='ghost'
        aria-expanded={open}
        aria-haspopup='true'
        onClick={() => setOpen((o) => !o)}
        className='px-2 font-medium sm:px-3'
      >
        <LayoutGrid className='h-4 w-4' />
        <span className='hidden sm:inline'>{t('categories')}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </Button>

      {/* Mega panel — fits the screen with a margin on small screens */}
      <div
        className={cn(
          'absolute start-0 top-full z-50 w-80 max-w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border bg-popover/95 p-2 shadow-xl backdrop-blur transition-all duration-200',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        )}
        role='menu'
      >
        <p className='px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground'>
          {tCategory('title')}
        </p>
        <div className='max-h-[60vh] overflow-y-auto'>
          {mains.map((main) => {
            const subs = subsOf(main.id);
            const isExpanded = expanded === main.id;
            return (
              <div key={main.id} className='rounded-xl'>
                <div className='flex items-center'>
                  <Link
                    href={`/category/${main.slug}`}
                    onClick={() => setOpen(false)}
                    role='menuitem'
                    className='flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-muted'
                  >
                    <span className='text-sm font-medium'>
                      {main.nameFa}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {main.count}
                    </span>
                  </Link>
                  {subs.length > 0 && (
                    <button
                      type='button'
                      aria-label={main.nameFa}
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpanded(isExpanded ? null : main.id)
                      }
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

                {/* Subcategories */}
                {subs.length > 0 && isExpanded && (
                  <div className='ms-6 border-s ps-2'>
                    {subs.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/category/${sub.slug}`}
                        onClick={() => setOpen(false)}
                        role='menuitem'
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
      </div>
    </div>
  );
};

export default CategoryMenu;
