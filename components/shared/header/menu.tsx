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
import LanguageToggle from './language-toggle';
import UserButton from './user-button';
import CartButton from './cart-button';

const Menu = () => {
  const t = useTranslations('header');

  return (
    <div className="flex justify-end gap-3">
      <nav className="md:flex hidden w-full max-w-xs items-center gap-1">
        <ModeToggle />
        <LanguageToggle />
        <CartButton />
        <UserButton />
      </nav>
      <nav className="md:hidden">
        <Sheet>
          <SheetTrigger className="align-middle">
            <EllipsisVertical />
          </SheetTrigger>
          <SheetContent className="flex flex-col items-start gap-3">
            <SheetTitle>{t('menu')}</SheetTitle>
            <ModeToggle />
            <LanguageToggle />
            <CartButton />
            <UserButton />
            <SheetDescription></SheetDescription>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};

export default Menu;
