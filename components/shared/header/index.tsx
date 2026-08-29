import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { APP_NAME } from '@/lib/constants';
import { Link } from '@/i18n/navigation';
import Menu from './menu';
import SearchBar from './search';
import CategoryMenu from './category-menu';
import { getCategoryTree, type CategoryNode } from '@/lib/actions/product.actions';

const Header = async () => {
  const t = await getTranslations('header');
  const tree = await getCategoryTree();

  // Flatten the whole tree (mains + subs + sub-subs) for the mega menu
  const flat: Omit<CategoryNode, 'children'>[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const c of nodes) {
      flat.push({
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameFa: c.nameFa,
        icon: c.icon,
        sortOrder: c.sortOrder,
        parentId: c.parentId,
        count: c.count,
      });
      walk(c.children);
    }
  };
  walk(tree);

  const mainsOnly = tree.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameFa: c.nameFa,
    icon: c.icon,
    parentId: null,
    count: c.count,
  }));

  return (
    <header className='sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75'>
      <div className='wrapper flex-between gap-4'>
        <div className='flex items-center gap-3'>
          <Link href='/' className='flex-start'>
            <Image
              priority={true}
              src='/images/logo.svg'
              width={48}
              height={48}
              alt={`${APP_NAME} logo`}
            />
            <span className='hidden lg:block font-bold text-2xl ms-3'>
              {t('brandName')}
            </span>
          </Link>
          {/* Category mega menu — available at every screen size */}
          <CategoryMenu categories={flat} />
        </div>
        <div className='hidden md:block min-w-0 flex-1 justify-center'>
          <SearchBar
            categories={mainsOnly.map((c) => ({
              value: c.name,
              label: c.nameFa,
            }))}
          />
        </div>
        <Menu categories={mainsOnly} />
      </div>
    </header>
  );
};

export default Header;
