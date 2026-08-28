import { useTranslations } from 'next-intl';
import { EllipsisVertical } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import ModeToggle from './mode-toggle';
import UserButton from './user-button';
import CartButton from './cart-button';
import SearchBar from './search';
import type { DockCategory } from '@/components/shared/category/category-dock';

const Menu = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('header');

  return (
    <div className='flex justify-end gap-3'>
      <nav className='md:flex hidden w-full max-w-xs items-center gap-1'>
        <ModeToggle />
        <CartButton />
        <UserButton />
      </nav>
      <nav className='md:hidden'>
        <Sheet>
          <SheetTrigger className='align-middle' aria-label={t('menu')}>
            <EllipsisVertical />
          </SheetTrigger>
          <SheetContent className='flex flex-col items-start gap-5 overflow-y-auto p-6'>
            <SheetTitle className='mb-1'>{t('menu')}</SheetTitle>
            <div className='w-full'>
              <SearchBar />
            </div>
            {/* Categories live in the floating dock on small screens — no
                duplicate list here. */}
            <div className='mt-1 space-y-4'>
              <ModeToggle />
              <CartButton />
              <UserButton />
            </div>
            <SheetDescription className='sr-only'>{t('menu')}</SheetDescription>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};

export default Menu;
