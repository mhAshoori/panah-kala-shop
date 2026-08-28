import type { Metadata } from 'next';
import type { ShippingAddress } from '@/types';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { getValidUserId } from '@/lib/auth-helpers';
import ShippingAddressForm from './shipping-address-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('shippingAddress') };
}

const ShippingAddressPage = async () => {
  const cart = await getMyCart();
  if (!cart || cart.items.length === 0) {
    redirect('/cart');
  }

  const session = await auth();

  // Not signed in — or the session is stale (user deleted after a reseed):
  // send to sign-in with a return path instead of crashing with User not found
  const userId = await getValidUserId();
  if (!session?.user?.id || !userId) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent('/shipping-address')}`);
  }

  const user = await getUserById(userId);
  const t = await getTranslations('checkout');

  return (
    <div className='max-w-2xl mx-auto'>
      <h1 className='h2-bold py-4'>{t('shippingAddress')}</h1>
      <ShippingAddressForm address={(user.address as ShippingAddress) ?? null} />
    </div>
  );
};

export default ShippingAddressPage;
