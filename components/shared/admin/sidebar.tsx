'use client';

import { useTranslations } from 'next-intl';
import AdminChat from '@/components/shared/assistant/admin-chat';
import { Link, usePathname } from '@/i18n/navigation';
import {
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Settings,
  Shapes,
  Ticket,
  Users,
} from 'lucide-react';
import { SignOutUser } from '@/lib/actions/user.actions';
import { cn } from '@/lib/utils';

const MENU_ITEMS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { href: '/admin', label: 'overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/homepage', label: 'homepage', icon: Home },
  { href: '/admin/orders', label: 'orders', icon: ShoppingCart },
  { href: '/admin/products', label: 'products', icon: Package },
  { href: '/admin/categories', label: 'categories', icon: Shapes },
  { href: '/admin/coupons', label: 'couponsTitle', icon: Ticket },
  { href: '/admin/users', label: 'users', icon: Users },
  { href: '/admin/settings', label: 'aiSettingsTitle', icon: Settings },
];

const AdminSidebar = () => {
  const t = useTranslations('admin');
  const tHeader = useTranslations('header');
  const pathname = usePathname();

  return (
    <nav
      className='flex gap-2 overflow-x-auto md:flex-col md:overflow-visible'
      aria-label={t('dashboard')}
    >
      {/* Back to the storefront */}
      <Link
        href='/'
        className='flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      >
        <ExternalLink className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
        <span className='whitespace-nowrap'>{t('viewStore')}</span>
      </Link>

      <AdminChat />

      {MENU_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
            <span className='whitespace-nowrap'>{t(label)}</span>
          </Link>
        );
      })}

      {/* Sign out */}
      <form action={SignOutUser}>
        <button
          type='submit'
          className='flex w-full shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive'
        >
          <LogOut className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
          <span className='whitespace-nowrap'>{tHeader('signOut')}</span>
        </button>
      </form>
    </nav>
  );
};

export default AdminSidebar;
