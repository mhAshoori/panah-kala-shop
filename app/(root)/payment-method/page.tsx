import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { getUserById } from '@/lib/actions/user.actions';
import PaymentMethodForm from './payment-method-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('paymentMethod') };
}

const PaymentMethodPage = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent('/place-order')}`);
  }

  const user = await getUserById(session.user.id);
  const t = await getTranslations('checkout');

  return (
    <div className='max-w-xl mx-auto'>
      <h1 className='h2-bold py-4'>{t('paymentMethod')}</h1>
      <PaymentMethodForm preferredPaymentMethod={user.paymentMethod} />
    </div>
  );
};

export default PaymentMethodPage;
