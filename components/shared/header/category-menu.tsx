'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, LayoutGrid } from 'lucide-react';

import {
  Camera,
  Gamepad2,
  Headphones,
  Laptop,
  Monitor,
  Package,
  Smartphone,
  Tablet,
  Watch,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export type DockCategory = {
  slug: string;
  name: string;
  nameFa: string;
  icon: string;
  _count: { products: number };
};

const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  watch: Watch,
  tablet: Tablet,
  camera: Camera,
  monitor: Monitor,
  'gamepad-2': Gamepad2,
  package: Package,
};

/**
 * Header "Categories" dropdown (mega menu). Opens on hover and on click,
 * closes on outside click / Escape, and lists every category with its icon
 * and product count, linking to /category/[slug].
 */
const CategoryMenu = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('header');
  const tCategory = useTranslations('category');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (categories.length === 0) return null;

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
        className='font-medium px-2 sm:px-3'
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

      {/* Mega panel */}
      <div
        className={cn(
          'absolute start-0 top-full z-50 w-80 rounded-2xl border bg-popover/95 p-2 shadow-xl backdrop-blur transition-all duration-200',
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        )}
        role='menu'
      >
        <p className='px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground'>
          {tCategory('title')}
        </p>
        <div className='grid grid-cols-2 gap-1'>
          {categories.map((c) => {
            const Icon = ICONS[c.icon] ?? Package;
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                onClick={() => setOpen(false)}
                role='menuitem'
                className='group flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-muted'
              >
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110'>
                  <Icon className='h-4 w-4' aria-hidden='true' />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>
                    {c.nameFa}
                  </span>
                  <span className='block text-xs text-muted-foreground'>
                    {c._count.products}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Plain stacked list used inside the mobile sheet
export const CategoryList = ({ categories }: { categories: DockCategory[] }) => {
  const tCategory = useTranslations('category');

  if (categories.length === 0) return null;

  return (
    <div className='w-full space-y-1'>
      <p className='px-1 pb-1 text-xs font-semibold text-muted-foreground'>
        {tCategory('title')}
      </p>
      {categories.map((c) => {
        const Icon = ICONS[c.icon] ?? Package;
        return (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className='flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted'
          >
            <Icon className='h-4 w-4 text-primary' aria-hidden='true' />
            <span className='flex-1'>{c.nameFa}</span>
            <span className='text-xs text-muted-foreground'>
              {c._count.products}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryMenu;
