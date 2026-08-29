import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import ProductList from '@/components/shared/product/product-list';
import { getMyFavorites } from '@/lib/actions/favorite.actions';
import { getValidUserId } from '@/lib/auth-helpers';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account');
  return { title: t('favorites') };
}

const FavoritesPage = async () => {
  const userId = await getValidUserId();
  const t = await getTranslations('account');

  if (!userId) {
    return (
      <div className='space-y-4'>
        <h1 className='h2-bold'>{t('favorites')}</h1>
        <p className='text-sm text-muted-foreground'>
          {t('noFavorites')}
        </p>
        <Link href='/sign-in' className='link text-primary text-sm'>
          {t('signInToFavorite')}
        </Link>
      </div>
    );
  }

  const { products } = await getMyFavorites();

  return (
    <div className='space-y-2'>
      <h1 className='h2-bold'>{t('favorites')}</h1>
      <ProductList title={undefined} data={products} />
    </div>
  );
};

export default FavoritesPage;
