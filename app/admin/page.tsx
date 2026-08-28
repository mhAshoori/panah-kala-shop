import { getLocale, getTranslations } from 'next-intl/server';
import {
  Banknote,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import SalesChart from '@/components/shared/admin/sales-chart';
import { getOrderSummary } from '@/lib/actions/admin.actions';
import { formatId } from '@/lib/utils';
import { formatCurrencyLocale, formatNumberLocale } from '@/lib/persian';
import { Link } from '@/i18n/navigation';

const AdminOverviewPage = async () => {
  const locale = await getLocale();

  const t = await getTranslations('admin');
  const tOrder = await getTranslations('order');
  const tCommon = await getTranslations('common');

  const summary = await getOrderSummary();

const cards = [
  { title: t('totalRevenue'), value: formatCurrencyLocale(summary.totalSales, locale), icon: Banknote },
  { title: t('totalOrders'), value: formatNumberLocale(summary.ordersCount, locale), icon: ShoppingCart },
  { title: t('totalProducts'), value: formatNumberLocale(summary.productsCount, locale), icon: Package },
  { title: t('totalUsers'), value: formatNumberLocale(summary.usersCount, locale), icon: Users },
];

  return (
    <div className='space-y-6'>
      <h1 className='h2-bold'>{t('overview')}</h1>

      {/* Summary cards */}
      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {cards.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className='flex-row items-center justify-between'>
              <CardTitle className='text-muted-foreground'>{title}</CardTitle>
              <Icon className='h-5 w-5 text-muted-foreground' aria-hidden='true' />
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold'>
                {value}
                {title === t('totalRevenue') && (
                  <span className='ms-1 align-middle text-xs font-normal text-muted-foreground'>
                    {tCommon('currency')}
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly sales chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('monthlySales')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={summary.monthlySales} locale={locale} />
        </CardContent>
      </Card>

      {/* Latest sales */}
      <Card>
        <CardHeader>
          <CardTitle>{t('latestSales')}</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tOrder('orderId')}</TableHead>
                <TableHead>{t('user')}</TableHead>
                <TableHead>{tOrder('total')}</TableHead>
                <TableHead>{tOrder('paidAt')}</TableHead>
                <TableHead className='text-end'>{tOrder('details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.latestSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='text-center text-muted-foreground'>
                    {t('noSalesYet')}
                  </TableCell>
                </TableRow>
              ) : (
                summary.latestSales.map((order) => (
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
                    <TableCell>{formatCurrencyLocale(order.totalPrice, locale)}</TableCell>
                    <TableCell>
                      {order.isPaid ? (
                        <Badge variant='secondary'>{t('paid')}</Badge>
                      ) : (
                        <Badge variant='outline'>{tOrder('notPaid')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-end'>
                      <Link href={`/order/${order.id}`} className='link text-primary'>
                        {tOrder('details')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverviewPage;
