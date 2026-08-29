'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { EllipsisVertical } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import SearchBar from './search';
import type { DockCategory } from './category-menu';

/**
 * Mobile actions sheet. The sheet closes itself whenever a link inside it is
 * used (cart, user menu, …) so navigation feels immediate. The action icons
 * are server-rendered and passed in as a slot.
 */
const MobileMenuSheet = ({
  categories,
  actions,
}: {
  categories: DockCategory[];
  actions: ReactNode;
}) => {
  const t = useTranslations('header');
  const [open, setOpen] = useState(false);

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

        {/* Compact search: categories live in the header mega menu */}
        <div className='w-full min-w-0'>
          <SearchBar categories={categories} compact />
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
