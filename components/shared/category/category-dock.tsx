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
 * storefront with one icon per category. Hovering (desktop) or tapping the
 * grid handle opens a panel listing every category with its product count.
 * Works on phones and desktops alike.
 */
const CategoryDock = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('category');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (categories.length === 0) return null;

  return (
    <div
      className='fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]'
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className='relative flex flex-col items-center'>
        {/* Expanded panel (all screen sizes; closes on selection) */}
        <div
          className={cn(
            'absolute bottom-full mb-3 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border bg-popover/95 p-2 shadow-xl backdrop-blur transition-all duration-200',
            open
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-2 opacity-0'
          )}
        >
          <p className='px-3 pb-1.5 pt-2 text-xs font-semibold text-muted-foreground'>
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
                <Icon className='h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
                <span className='flex-1 truncate'>{c.nameFa}</span>
                <span className='text-xs text-muted-foreground'>
                  {c._count.products}
                </span>
              </Link>
            );
          })}
        </div>

        {/* The dock itself — horizontally scrollable on small screens */}
        <nav
          aria-label={t('title')}
          className='flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border bg-background/90 p-1.5 shadow-lg backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          {/* Grid handle toggles the panel (tap-friendly on phones) */}
          <button
            type='button'
            aria-expanded={open}
            aria-label={t('title')}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'me-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
              open
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <LayoutGrid className='h-4 w-4' />
          </button>
          {categories.map((c) => {
            const Icon = ICONS[c.icon] ?? Package;
            const active = pathname === `/category/${c.slug}`;
            return (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                aria-label={c.nameFa}
                title={c.nameFa}
                onClick={() => setOpen(false)}
                className={cn(
                  'group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-primary'
                )}
              >
                <Icon className='h-4 w-4' />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default CategoryDock;
