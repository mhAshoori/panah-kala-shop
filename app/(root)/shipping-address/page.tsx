import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getMyCart } from '@/lib/actions/cart.actions';
import { getValidUserId } from '@/lib/auth-helpers';
import { prisma } from '@/db/prisma';
import ShippingAddressManager from './shipping-address-manager';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('shippingAddress') };
}

const ShippingAddressPage = async () => {
  const cart = await getMyCart();
  if (!cart || cart.items.length === 0) {
    redirect('/cart');
  }

  const userId = await getValidUserId();
  if (!userId) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent('/shipping-address')}`);
  }

  const t = await getTranslations('checkout');

  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const saved = addresses.map((a) => ({
    id: a.id,
    isDefault: a.isDefault,
    fullName: a.fullName,
    streetAddress: a.streetAddress,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    phone: a.phone,
  }));

  return (
    <div className='mx-auto max-w-2xl'>
      <h1 className='h2-bold py-4'>{t('shippingAddress')}</h1>
      <ShippingAddressManager addresses={saved} />
    </div>
  );
};

export default ShippingAddressPage;
