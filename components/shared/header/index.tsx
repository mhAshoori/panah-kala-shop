import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { APP_NAME } from '@/lib/constants';
import { Link } from '@/i18n/navigation';
import Menu from './menu';
import SearchBar from './search';
import CategoryMenu from './category-menu';
import { getCategoriesWithCount } from '@/lib/actions/product.actions';

const Header = async () => {
  const t = await getTranslations('header');
  const categories = await getCategoriesWithCount();

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
          {/* Category mega menu (desktop) */}
          <div className='hidden lg:block'>
            <CategoryMenu categories={categories} />
          </div>
        </div>
        <div className='hidden md:block flex-1 justify-center'>
          <SearchBar />
        </div>
        <Menu />
      </div>
    </header>
  );
};

export default Header;
