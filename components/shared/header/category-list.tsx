import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DockCategory } from './category-menu';

// Plain stacked main-category list used inside the mobile sheet
export const CategoryList = ({ categories }: { categories: DockCategory[] }) => {
  const t = useTranslations('category');

  const mains = categories.filter((c) => !c.parentId);
  if (mains.length === 0) return null;

  return (
    <div className='w-full space-y-1'>
      <p className='px-1 pb-1 text-xs font-semibold text-muted-foreground'>
        {t('title')}
      </p>
      {mains.map((c) => (
        <Link
          key={c.slug}
          href={`/category/${c.slug}`}
          className='flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted'
        >
          <span>{c.nameFa}</span>
          <span className='text-xs text-muted-foreground'>{c.count}</span>
        </Link>
      ))}
    </div>
  );
};
