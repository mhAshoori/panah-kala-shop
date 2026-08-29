'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime, formatId } from '@/lib/utils';
import { formatNumberLocale } from '@/lib/persian';
import ZarinpalButton from './zarinpal-button';
import type { Order } from '@/types';

const OrderDetailsTable = ({
  order,
  hidePayButton = false,
}: {
  order: Order;
  /** Admin views: no customer payment button */
  hidePayButton?: boolean;
}) => {
  const t = useTranslations('order');
  const tc = useTranslations('checkout');
  const locale = useLocale();
  const searchParams = useSearchParams();

  // Show a toast after a ZarinPal callback redirect
  useEffect(() => {
    const paid = searchParams.get('paid');
    if (paid === 'success') toast.success(t('paymentSuccess'));
    if (paid === 'failed') toast.error(t('paymentFailed'));
  }, [searchParams, t]);

  const { shippingAddress, orderItems, itemsPrice, taxPrice, shippingPrice, totalPrice, paymentMethod, isPaid, paidAt, isDelivered, deliveredAt, paymentResult, id } = order;

  return (
    <>
      <h1 className='py-4 h2-bold'>
        {t('title')} {formatId(id)}
      </h1>
      <div className='grid md:grid-cols-3 md:gap-5'>
        <div className='overflow-x-auto md:col-span-2 space-y-4'>
          {/* Payment method */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>{t('paymentMethod')}</h2>
              <p>
                {paymentMethod === 'cod'
                  ? tc('cashOnDelivery')
                  : tc('zarinpal')}
              </p>
              {isPaid ? (
                <Badge variant='secondary' className='mt-2'>
                  {t('paidAt')}: {formatDateTime(paidAt!).dateTime} ·{' '}
                  {t('refId')}: {paymentResult?.refId ?? '—'}
                </Badge>
              ) : (
                <Badge variant='destructive' className='mt-2'>
                  {t('notPaid')}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>{t('shippingAddress')}</h2>
              <p>{shippingAddress.fullName}</p>
              <p className='text-muted-foreground'>
                {shippingAddress.streetAddress}, {shippingAddress.city},{' '}
                {shippingAddress.province}, {shippingAddress.postalCode} ·{' '}
                {shippingAddress.phone}
              </p>
              {isDelivered ? (
                <Badge variant='secondary' className='mt-2'>
                  {t('deliveredAt')}: {formatDateTime(deliveredAt!).dateTime}
                </Badge>
              ) : (
                <Badge variant='outline' className='mt-2'>
                  {t('notDelivered')}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>{t('orderItems')}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('item')}</TableHead>
                    <TableHead>{t('qty')}</TableHead>
                    <TableHead className='text-end'>{t('price')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <Link
                          href={`/product/${item.slug}`}
                          className='flex items-center gap-2'
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={56}
                            height={56}
                            className='h-14 w-14 rounded-lg object-cover'
                          />
                          <span className='text-sm'>{item.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className='px-2 tabular-nums'>
                          {formatNumberLocale(item.qty, locale)}
                        </span>
                      </TableCell>
                      <TableCell className='text-end tabular-nums'>
                        {formatNumberLocale(item.price, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardContent className='p-4 space-y-4 gap-4'>
              <h2 className='text-xl pb-4'>{t('orderSummary')}</h2>
              <div className='flex justify-between'>
                <div>{t('itemsPrice')}</div>
                <div>{formatNumberLocale(itemsPrice, locale)}</div>
              </div>
              <div className='flex justify-between'>
                <div>{t('taxPrice')}</div>
                <div>{formatNumberLocale(taxPrice, locale)}</div>
              </div>
              <div className='flex justify-between'>
                <div>{t('shippingPrice')}</div>
                <div>{formatNumberLocale(shippingPrice, locale)}</div>
              </div>
              <div className='flex justify-between font-semibold border-t pt-3'>
                <div>{t('total')}</div>
                <div>{formatNumberLocale(totalPrice, locale)}</div>
              </div>

              {!hidePayButton && !isPaid && paymentMethod === 'zarinpal' && (
                <ZarinpalButton orderId={id} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default OrderDetailsTable;