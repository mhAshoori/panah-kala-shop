import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyOrders } from '@/lib/actions/order.actions';
import { formatCurrency, formatDateTime, formatId, withLocalePath } from '@/lib/utils';
import { auth } from '@/auth';
import Pagination from '@/components/shared/pagination';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'order' });
  return { title: t('myOrders') };
}

const OrdersPage = async (props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page: string }>;
}) => {
  const { locale } = await props.params;
  const { page } = await props.searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session) redirect(withLocalePath('/sign-in', locale));

  const t = await getTranslations('order');

  const orders = await getMyOrders({ page: Number(page) || 1 });

  return (
    <div className='space-y-4'>
      <h2 className='h2-bold'>{t('myOrders')}</h2>
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
                <TableCell>{formatDateTime(order.createdAt).dateOnly}</TableCell>
                <TableCell>{formatCurrency(order.totalPrice)}</TableCell>
                <TableCell>
                  {order.isPaid && order.paidAt
                    ? formatDateTime(order.paidAt).dateTime
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
                  <Link href={`/order/${order.id}`} className='link text-primary'>
                    {t('details')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {orders.totalPages > 1 && (
        <Pagination page={Number(page) || 1} totalPages={orders.totalPages} />
      )}
    </div>
  );
};

export default OrdersPage;