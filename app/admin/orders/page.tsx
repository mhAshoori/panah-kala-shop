import { getLocale, getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AdminSearch from '@/components/shared/admin/search';
import OrderActions from '@/components/shared/admin/order-actions';
import Pagination from '@/components/shared/pagination';
import { getAllOrders } from '@/lib/actions/admin.actions';
import { formatDateTime, formatId } from '@/lib/utils';
import { formatCurrencyLocale } from '@/lib/persian';

const AdminOrdersPage = async (props: {
  searchParams: Promise<{ page: string; q?: string }>;
}) => {
  const locale = await getLocale();
  const { page, q } = await props.searchParams;

  const t = await getTranslations('admin');
  const tOrder = await getTranslations('order');
  const tCommon = await getTranslations('common');

  const orders = await getAllOrders({
    page: Number(page) || 1,
    query: q,
  });

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('orders')}</h1>
      <AdminSearch />

      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tOrder('orderId')}</TableHead>
              <TableHead>{t('user')}</TableHead>
              <TableHead>{tOrder('date')}</TableHead>
              <TableHead>{tOrder('total')}</TableHead>
              <TableHead>{tOrder('paidAt')}</TableHead>
              <TableHead>{tOrder('deliveredAt')}</TableHead>
              <TableHead className='text-end'>{t('edit')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center text-muted-foreground'>
                  {tCommon('notFound')}
                </TableCell>
              </TableRow>
            ) : (
              orders.data.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className='font-mono text-xs'>
                    {formatId(order.id)}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span>{order.user?.name}</span>
                      <span className='text-xs text-muted-foreground'>
                        {order.user?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(order.createdAt).dateOnly}</TableCell>
                  <TableCell>{formatCurrencyLocale(order.totalPrice, locale)}</TableCell>
                  <TableCell>
                    {order.isPaid ? (
                      <Badge variant='secondary'>{t('paid')}</Badge>
                    ) : (
                      <Badge variant='outline'>{tOrder('notPaid')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.isDelivered ? (
                      <Badge variant='secondary'>{tOrder('delivered')}</Badge>
                    ) : (
                      <Badge variant='outline'>{tOrder('notDelivered')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-end'>
                    <OrderActions
                      orderId={order.id}
                      isPaid={order.isPaid}
                      isDelivered={order.isDelivered}
                      paymentMethod={order.paymentMethod}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={Number(page) || 1} totalPages={orders.totalPages} />
    </div>
  );
};

export default AdminOrdersPage;
