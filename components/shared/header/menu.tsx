import { useTranslations } from 'next-intl';
import { EllipsisVertical, ShoppingCart, UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import ModeToggle from './mode-toggle';
import LanguageToggle from './language-toggle';

const Menu = () => {
  const t = useTranslations('header');

  return (
    <div className="flex justify-end gap-3">
      <nav className="md:flex hidden w-full max-w-xs items-center gap-1">
        <ModeToggle />
        <LanguageToggle />
        <Button asChild variant="ghost">
          <Link href="/cart">
            <ShoppingCart />
            {t('cart')}
          </Link>
        </Button>
        <Button asChild>
          <Link href="/sign-in">
            <UserIcon />
            {t('signIn')}
          </Link>
        </Button>
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
            <Button asChild variant="ghost">
              <Link href="/cart">
                <ShoppingCart />
                {t('cart')}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in">
                <UserIcon />
                {t('signIn')}
              </Link>
            </Button>
            <SheetDescription></SheetDescription>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};

export default Menu;
