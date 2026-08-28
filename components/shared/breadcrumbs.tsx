import { Fragment } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { getLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type Crumb = {
  label: string;
  href?: string;
};

// Visual breadcrumb trail (last item = current page, rendered as plain text)
const Breadcrumbs = async ({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) => {
  const locale = await getLocale();
  const isFa = locale === 'fa';

  const itemsWithHome: Crumb[] = [
    { label: isFa ? 'خانه' : 'Home', href: '/' },
    ...items,
  ];

  return (
    <nav
      aria-label='Breadcrumb'
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground',
        className
      )}
    >
      {itemsWithHome.map((item, i) => {
        const isLast = i === itemsWithHome.length - 1;
        const Chevron = isFa ? ChevronLeft : ChevronRight;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <Chevron
                className='h-3.5 w-3.5 shrink-0 text-muted-foreground/60'
                aria-hidden='true'
              />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className='flex items-center gap-1 transition-colors hover:text-primary'
              >
                {i === 0 && <Home className='h-3.5 w-3.5' aria-hidden='true' />}
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={cn(isLast && 'font-medium text-foreground')}
              >
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
