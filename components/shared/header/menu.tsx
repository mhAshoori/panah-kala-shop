import MobileMenuSheet from './mobile-menu-sheet';
import ModeToggle from './mode-toggle';
import UserButton from './user-button';
import CartButton from './cart-button';
import type { DockCategory } from './category-menu';

const Menu = ({ categories }: { categories: DockCategory[] }) => {
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
              <UserButton />
              <CartButton />
              <ModeToggle />
            </>
          }
        />
      </nav>
    </div>
  );
};

export default Menu;
