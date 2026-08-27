import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getOrderById } from '@/lib/actions/order.actions';
import OrderDetailsTable from './order-details-table';
import type { ShippingAddress } from '@/types';

export async function generateMetadata(props: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'order' });
  return { title: t('title') };
}

const OrderDetailsPage = async (props: {
  params: Promise<{ id: string; locale: string }>;
}) => {
  const { id, locale } = await props.params;
  setRequestLocale(locale);

  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <OrderDetailsTable
      order={{
        ...order,
        shippingAddress: order.shippingAddress as ShippingAddress,
      }}
    />
  );
};

export default OrderDetailsPage;