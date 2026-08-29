'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const MainNav = ({ className }: { className?: string }) => {
  const pathname = usePathname();
  const t = useTranslations('account');

  const links = [
    { title: t('profile'), href: '/user/profile' as const },
    { title: t('orders'), href: '/user/orders' as const },
    { title: t('addresses'), href: '/user/addresses' as const },
  ];

  return (
    <nav
      className={cn(
        'flex items-center gap-4 lg:gap-6 border-b pb-2',
        className
      )}
    >
      {links.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname.startsWith(item.href) ? '' : 'text-muted-foreground'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
};

export default MainNav;