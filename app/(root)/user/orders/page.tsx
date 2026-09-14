import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyOrders } from '@/lib/actions/order.actions';
import { formatCurrency, formatDateTime, formatId } from '@/lib/utils';
import { auth } from '@/auth';
import PageSizeSelector from '@/components/shared/page-size-selector';
import ReorderButton from '@/components/shared/user/reorder-button';
import { parsePageSize } from '@/lib/constants';
import { getStorePageSize } from '@/lib/store-config';
import Pagination from '@/components/shared/pagination';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('order');
  return { title: t('myOrders') };
}

const OrdersPage = async (props: {
  searchParams: Promise<{ page: string; size?: string }>;
}) => {
  const { page, size } = await props.searchParams;
  const pageSize = await getStorePageSize();

  const session = await auth();
  if (!session) redirect('/sign-in');

  const t = await getTranslations('order');
  const locale = await getLocale();

  const orders = await getMyOrders({
    page: Number(page) || 1,
    limit: parsePageSize(size, pageSize),
  });

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='h2-bold'>{t('myOrders')}</h2>
        <PageSizeSelector current={parsePageSize(size, pageSize)} base={pageSize} />
      </div>
      {orders.data.length === 0 ? (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          {t('noOrders')}
        </p>
      ) : (
      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('orderId')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('total')}</TableHead>
              <TableHead>{t('paidAt')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className='text-end'>{t('details')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.data.map((order) => (
              <TableRow key={order.id}>
                <TableCell className='font-mono text-xs'>
                  {formatId(order.id)}
                </TableCell>
                <TableCell>{formatDateTime(order.createdAt, locale as 'fa' | 'en').dateOnly}</TableCell>
                <TableCell>{formatCurrency(order.totalPrice)}</TableCell>
                <TableCell>
                  {order.isPaid && order.paidAt
                    ? formatDateTime(order.paidAt, locale as 'fa' | 'en').dateTime
                    : t('notPaid')}
                </TableCell>
                <TableCell>
                  {order.isDelivered
                    ? t('delivered')
                    : order.isPaid
                      ? t('processing')
                      : t('pending')}
                </TableCell>
                <TableCell className='text-end'>
                  <div className='flex items-center justify-end gap-2'>
                    <ReorderButton orderId={order.id} />
                    <Link href={`/order/${order.id}`} className='link text-primary'>
                      {t('details')}
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      {orders.totalPages > 1 && (
        <Pagination page={Number(page) || 1} totalPages={orders.totalPages} />
      )}
    </div>
  );
};

export default OrdersPage;