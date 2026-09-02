'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import {
  ExternalLink,
  Home,
  LayoutDashboard,
  Mail,
  Package,
  ShoppingCart,
  Settings,
  Shapes,
  Ticket,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ADMIN_MENU_ITEMS: {
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
  { href: '/admin/marketing', label: 'marketing', icon: Mail },
  { href: '/admin/settings', label: 'aiSettingsTitle', icon: Settings },
];

const AdminSidebar = () => {
  const t = useTranslations('admin');
  const pathname = usePathname();

  return (
    // Hidden on small screens — the mobile menu sheet takes over
    <nav className='hidden md:flex md:flex-col md:gap-2' aria-label={t('dashboard')}>
      {/* Back to the storefront */}
      <Link
        href='/'
        className='flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      >
        <ExternalLink className='h-4 w-4 rtl:-scale-x-100' aria-hidden='true' />
        <span className='whitespace-nowrap'>{t('viewStore')}</span>
      </Link>

      {ADMIN_MENU_ITEMS.map(({ href, label, icon: Icon, exact }) => {
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
    </nav>
  );
};

export default AdminSidebar;
