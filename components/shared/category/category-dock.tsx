'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import {
  Camera,
  Gamepad2,
  Headphones,
  Laptop,
  LayoutGrid,
  Monitor,
  Package,
  Smartphone,
  Tablet,
  Watch,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

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
 * Floating category dock ("hovering bar"): a fixed pill at the bottom of the
 * storefront with one icon per category. Hovering/clicking expands a panel
 * above the dock listing every category with its product count.
 */
const CategoryDock = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('category');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (categories.length === 0) return null;

  return (
    <div
      className='fixed inset-x-0 bottom-4 z-50 flex justify-center px-4'
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className='relative flex flex-col items-center'>
        {/* Expanded panel (desktop hover) */}
        <div
          className={cn(
            'absolute bottom-full mb-3 hidden w-72 rounded-2xl border bg-popover/95 p-2 shadow-xl backdrop-blur transition-all duration-200 md:block',
            open
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          )}
        >
          <p className='px-3 py-1.5 text-xs font-semibold text-muted-foreground'>
            {t('title')}
          </p>
          {categories.map((c) => {
            const Icon = ICONS[c.icon] ?? Package;
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                onClick={() => setOpen(false)}
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

        {/* The dock itself */}
        <nav
          aria-label={t('title')}
          className='flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-background/90 p-1.5 shadow-lg backdrop-blur md:gap-0.5'
        >
          <span
            className='me-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary md:flex'
            aria-hidden='true'
          >
            <LayoutGrid className='h-4 w-4' />
          </span>
          {categories.map((c) => {
            const Icon = ICONS[c.icon] ?? Package;
            const active = pathname === `/category/${c.slug}`;
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                aria-label={c.nameFa}
                title={c.nameFa}
                className={cn(
                  'group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-primary'
                )}
              >
                <Icon className='h-4.5 w-4.5' />
                {/* Tooltip */}
                <span className='pointer-events-none absolute -top-9 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100'>
                  {c.nameFa}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default CategoryDock;
