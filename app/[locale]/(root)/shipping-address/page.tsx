import type { Metadata } from 'next';
import type { ShippingAddress } from '@/types';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { auth } from '@/auth';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { withLocalePath } from '@/lib/utils';
import ShippingAddressForm from './shipping-address-form';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('shippingAddress') };
}

const ShippingAddressPage = async (props: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const cart = await getMyCart();
  if (!cart || cart.items.length === 0) {
    redirect(withLocalePath('/cart', locale));
  }

  const session = await auth();

  // Not signed in yet — send to sign-in with return path
  if (!session?.user?.id) {
    redirect(
      withLocalePath(
        `/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/shipping-address`)}`,
        locale
      )
    );
  }

  const user = await getUserById(session.user.id);
  const t = await getTranslations('checkout');

  return (
    <div className='max-w-2xl mx-auto'>
      <h1 className='h2-bold py-4'>{t('shippingAddress')}</h1>
      <ShippingAddressForm address={(user.address as ShippingAddress) ?? null} />
    </div>
  );
};

export default ShippingAddressPage;