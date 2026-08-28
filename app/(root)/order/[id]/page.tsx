import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { getOrderById } from '@/lib/actions/order.actions';
import OrderDetailsTable from './order-details-table';
import type { ShippingAddress } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('order');
  return { title: t('title') };
}

const OrderDetailsPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const ct = await getTranslations('common');

  return (
    <Suspense fallback={<div className='h2-bold py-4'>{ct('loading')}</div>}>
      <OrderDetailsTable
        order={{
          ...order,
          shippingAddress: order.shippingAddress as ShippingAddress,
        }}
      />
    </Suspense>
  );
};

export default OrderDetailsPage;
