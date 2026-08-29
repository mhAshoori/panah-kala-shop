import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getOrderById } from '@/lib/actions/order.actions';
import OrderDetailsTable from '@/app/(root)/order/[id]/order-details-table';
import type { ShippingAddress } from '@/types';
import { APP_NAME } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('order');
  return { title: `${t('title')} | ${APP_NAME}` };
}

// Full order details for a single order — admin only (route-guarded layout)
const AdminOrderDetailsPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const t = await getTranslations('admin');

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>
        {t('orderDetails')} — {order.id.slice(-6)}
      </h1>
      <OrderDetailsTable
        order={{
          ...order,
          shippingAddress: order.shippingAddress as ShippingAddress,
        }}
        hidePayButton
      />
    </div>
  );
};

export default AdminOrderDetailsPage;
