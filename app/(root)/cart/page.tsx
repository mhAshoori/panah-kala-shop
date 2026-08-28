import type { Metadata } from 'next';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getTranslations } from 'next-intl/server';
import CartTable from './cart-table';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cart');
  return { title: t('title') };
}

const CartPage = async () => {
  const cart = await getMyCart();
  const t = await getTranslations('cart');

  return <CartTable cart={cart} title={t('title')} />;
};

export default CartPage;
