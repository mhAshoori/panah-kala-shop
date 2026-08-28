import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { getOrderById } from '@/lib/actions/order.actions';
import { getValidUserId } from '@/lib/auth-helpers';
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

  // Privacy: only the buyer or an admin may view an order
  const [order, userId, session] = await Promise.all([
    getOrderById(id),
    getValidUserId(),
    auth(),
  ]);
  if (!order) notFound();

  const isOwner = userId && order.userId === userId;
  const isAdmin = session?.user?.role === 'admin';
  if (!isOwner && !isAdmin) notFound();

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
