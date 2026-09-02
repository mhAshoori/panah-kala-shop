'use client';

// Mobile menu sheet for the admin panel (shadcn mobile-menu-sheet pattern):
// a sticky top bar with the trigger, and a Sheet carrying everything the
// desktop sidebar holds — menu items, view-store, toggles, sign-out, AI chat.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  ExternalLink,
  LogOut,
  Menu,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import SiteLanguageToggle from '@/components/shared/admin/site-language-toggle';
import SiteFontToggle from '@/components/shared/admin/site-font-toggle';
import SiteThemeToggle from '@/components/shared/admin/site-theme-toggle';
import { ADMIN_MENU_ITEMS } from '@/components/shared/admin/sidebar';
import { SignOutUser } from '@/lib/actions/user.actions';
import { OPEN_ADMIN_CHAT_EVENT } from '@/components/shared/assistant/admin-chat';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const AdminMobileMenuSheet = ({
  currentFont,
  currentTheme,
}: {
  currentFont: string;
  currentTheme: string;
}) => {
  const t = useTranslations('admin');
  const tHeader = useTranslations('header');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Sticky top bar (small screens only) */}
      <div className='sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/95 p-3 backdrop-blur md:hidden'>
        <SheetTrigger
          aria-label={t('dashboard')}
          className='flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <Menu className='h-5 w-5' />
        </SheetTrigger>
        <p className='text-sm font-bold'>{t('dashboard')}</p>
        {/* Spacer keeps the title visually centered */}
        <span className='h-10 w-10' aria-hidden='true' />
      </div>

      <SheetContent
        side='right'
        className='flex flex-col gap-5 overflow-y-auto p-6'
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetTitle>{t('dashboard')}</SheetTitle>

        {/* View store */}
        <Link
          href='/'
          onClick={close}
          className='flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <ExternalLink className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
          {t('viewStore')}
        </Link>

        {/* AI assistant */}
        <button
          type='button'
          onClick={() => {
            close();
            window.dispatchEvent(new Event(OPEN_ADMIN_CHAT_EVENT));
          }}
          className='flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted'
        >
          <Bot className='h-4 w-4' aria-hidden='true' />
          {t('aiAssistant')}
        </button>

        {/* Menu items */}
        <nav className='flex flex-col gap-1' aria-label={t('dashboard')}>
          {ADMIN_MENU_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
                {t(label)}
              </Link>
            );
          })}
        </nav>

        {/* Appearance toggles */}
        <div className='space-y-2 border-t pt-4'>
          <SiteLanguageToggle />
          <SiteFontToggle current={currentFont} />
          <SiteThemeToggle current={currentTheme} />
        </div>

        {/* Sign out */}
        <form action={SignOutUser}>
          <button
            type='submit'
            className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive'
          >
            <LogOut className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
            {tHeader('signOut')}
          </button>
        </form>

        <SheetDescription className='sr-only'>{t('dashboard')}</SheetDescription>
      </SheetContent>
    </Sheet>
  );
};

export default AdminMobileMenuSheet;
