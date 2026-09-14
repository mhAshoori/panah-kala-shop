import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { getOrderById } from '@/lib/actions/order.actions';
import { markOrderSeen } from '@/lib/actions/admin.actions';
import AdminOrderCommentForm from './admin-order-comment-form';
import OrderDetailsTable from '@/app/(root)/order/[id]/order-details-table';
import TrackCodeForm from '@/components/shared/admin/track-code-form';
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

  // Opening the order in the admin panel counts as reading it
  if (!order.adminSeenAt) await markOrderSeen(id);

  const t = await getTranslations('admin');

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>
        {t('orderDetails')} — {order.id.slice(-6)}
      </h1>
      <TrackCodeForm orderId={order.id} trackCode={order.trackCode} />
      <AdminOrderCommentForm orderId={order.id} initialComment={order.adminComment ?? null} />
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
