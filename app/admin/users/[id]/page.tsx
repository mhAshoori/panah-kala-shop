import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

import UpdateUserForm from './update-user-form';
import BanToggle from '@/components/shared/admin/ban-toggle';
import { getCustomerProfile } from '@/lib/actions/user.actions';
import { Badge } from '@/components/ui/badge';
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
import { formatDateTime, formatId } from '@/lib/utils';
import { formatCurrencyLocale, formatNumberLocale } from '@/lib/persian';

const AdminUserDetailPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const locale = await getLocale();

  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const tOrder = await getTranslations('order');

  const user = await getCustomerProfile(id);
  if (!user) notFound();

  return (
    <div className='max-w-5xl space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='h2-bold'>{user.name}</h1>
          <p className='text-sm text-muted-foreground' dir='ltr'>
            {user.email || user.mobile || formatId(user.id)}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {user.banned && (
            <Badge variant='destructive'>{t('bannedBadge')}</Badge>
          )}
          {user.role === 'admin' && (
            <Badge variant='outline'>{t('roleAdminBadge')}</Badge>
          )}
          <BanToggle
            userId={user.id}
            userName={user.name}
            banned={user.banned}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('totalOrders')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='h3-bold'>
              {formatNumberLocale(user._count.orders, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('totalSpent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='h3-bold'>
              {formatCurrencyLocale(user.totalSpent, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {t('reviewsCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='h3-bold'>
              {formatNumberLocale(user._count.reviews, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>{t('recentOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          {user.orders.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{tCommon('notFound')}</p>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('id')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className='font-mono text-xs'>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className='hover:text-primary transition-colors'
                        >
                          {formatId(o.id)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {formatDateTime(o.createdAt).dateTime}
                      </TableCell>
                      <TableCell>
                        {formatCurrencyLocale(o.totalPrice, locale)}
                      </TableCell>
                      <TableCell>
                        {o.isDelivered ? (
                          <Badge>{tOrder('delivered')}</Badge>
                        ) : o.isPaid ? (
                          <Badge variant='outline'>{tOrder('paid')}</Badge>
                        ) : (
                          <Badge variant='secondary'>{tOrder('pending')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role / name editing stays below */}
      <div>
        <h2 className='mb-3 font-semibold'>{t('editUser')}</h2>
        <UpdateUserForm
          user={{ id: user.id, name: user.name, role: user.role }}
        />
      </div>
    </div>
  );
};

export default AdminUserDetailPage;
