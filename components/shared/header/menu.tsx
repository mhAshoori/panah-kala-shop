import { useTranslations } from 'next-intl';

import MobileMenuSheet from './mobile-menu-sheet';
import ModeToggle from './mode-toggle';
import UserButton from './user-button';
import CartButton from './cart-button';
import type { DockCategory } from './category-menu';

const Menu = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('header');

  return (
    <div className='flex justify-end gap-3'>
      <nav className='hidden items-center gap-1 md:flex'>
        <ModeToggle />
        <CartButton />
        <UserButton />
      </nav>
      <nav className='md:hidden'>
        <MobileMenuSheet
          categories={categories}
          actions={
            <>
              <ModeToggle />
              <CartButton />
              <UserButton />
            </>
          }
        />
      </nav>
    </div>
  );
};

export default Menu;
