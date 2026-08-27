import type { Metadata } from 'next';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getTranslations } from 'next-intl/server';
import CartTable from './cart-table';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'cart' });
  return { title: t('title') };
}

const CartPage = async () => {
  const cart = await getMyCart();
  const t = await getTranslations('cart');

  return <CartTable cart={cart} title={t('title')} />;
};

export default CartPage;