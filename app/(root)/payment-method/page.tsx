import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { getUserById } from '@/lib/actions/user.actions';
import { getMyCart } from '@/lib/actions/cart.actions';
import { canPayCashOnDelivery } from '@/lib/actions/product.actions';
import { getValidUserId } from '@/lib/auth-helpers';
import PaymentMethodForm from './payment-method-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('paymentMethod') };
}

const PaymentMethodPage = async () => {
  const session = await auth();
  const userId = await getValidUserId();
  if (!session?.user?.id || !userId) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent('/place-order')}`);
  }

  const user = await getUserById(userId);
  const t = await getTranslations('checkout');

  // COD is only offered when every product in the cart opts in
  const cart = await getMyCart();
  const productIds = (cart?.items ?? []).map((i) => i.productId);
  const codAllowed = await canPayCashOnDelivery([...new Set(productIds)]);

  return (
    <div className='max-w-xl mx-auto'>
      <h1 className='h2-bold py-4'>{t('paymentMethod')}</h1>
      <PaymentMethodForm
        preferredPaymentMethod={user.paymentMethod}
        codAllowed={codAllowed}
      />
    </div>
  );
};

export default PaymentMethodPage;
