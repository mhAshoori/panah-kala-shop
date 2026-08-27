import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { auth } from '@/auth';
import { getUserById } from '@/lib/actions/user.actions';
import { withLocalePath } from '@/lib/utils';
import PaymentMethodForm from './payment-method-form';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('paymentMethod') };
}

const PaymentMethodPage = async (props: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      withLocalePath(
        `/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/place-order`)}`,
        locale
      )
    );
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