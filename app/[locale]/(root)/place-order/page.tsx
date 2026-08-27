import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';

import { auth } from '@/auth';
import CheckoutSteps from '@/components/shared/checkout-steps';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getMyCart } from '@/lib/actions/cart.actions';
import { getUserById } from '@/lib/actions/user.actions';
import { formatCurrency, withLocalePath } from '@/lib/utils';
import PlaceOrderForm from './place-order-form';
import type { ShippingAddress } from '@/types';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('placeOrder') };
}

const PlaceOrderPage = async (props: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const cart = await getMyCart();
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      withLocalePath(
        `/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/place-order`)}`,
        locale
      )
    );
  }

  const user = await getUserById(session.user.id);

  if (!cart || cart.items.length === 0) {
    redirect(withLocalePath('/cart', locale));
  }
  if (!user.address) {
    redirect(withLocalePath('/shipping-address', locale));
  }
  if (!user.paymentMethod) {
    redirect(withLocalePath('/payment-method', locale));
  }

  const userAddress = user.address as ShippingAddress;

  const [t, tc, cm] = await Promise.all([
    getTranslations('checkout'),
    getTranslations('cart'),
    getTranslations('common'),
  ]);

  return (
    <>
      <CheckoutSteps current={3} />
      <h1 className='py-4 h2-bold'>{t('placeOrder')}</h1>

      <div className='grid md:grid-cols-3 md:gap-5'>
        <div className='overflow-x-auto md:col-span-2 space-y-4'>
          {/* Shipping address */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>{t('shippingAddress')}</h2>
              <p>{userAddress.fullName}</p>
              <p className='text-muted-foreground'>
                {userAddress.streetAddress}, {userAddress.city},{' '}
                {userAddress.province}, {userAddress.postalCode},{' '}
                {userAddress.country} · {userAddress.phone}
              </p>
              <div className='mt-3'>
                <Button asChild variant='outline'>
                  <a href={`/${locale}/shipping-address`}>{cm('edit')}</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment method */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>{t('paymentMethod')}</h2>
              <p>
                {user.paymentMethod === 'cod'
                  ? t('cashOnDelivery')
                  : t('zarinpal')}
              </p>
              <div className='mt-3'>
                <Button asChild variant='outline'>
                  <a href={`/${locale}/payment-method`}>{cm('edit')}</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <h2 className='text-xl pb-4'>{tc('title')}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc('item')}</TableHead>
                    <TableHead>{tc('quantity')}</TableHead>
                    <TableHead className='text-end'>{tc('price')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.items.map((item) => (
                    <TableRow key={item.slug}>
                      <TableCell>
                        <a
                          href={`/${locale}/product/${item.slug}`}
                          className='flex items-center'
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                            className='rounded'
                          />
                          <span className='px-2'>{item.name}</span>
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className='px-2'>{item.qty}</span>
                      </TableCell>
                      <TableCell className='text-end'>
                        {formatCurrency(item.price)}
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
            <CardContent className='p-4 gap-4 space-y-4'>
              <h2 className='text-xl pb-2'>{t('orderSummary')}</h2>
              <div className='flex justify-between'>
                <div>{tc('subtotal')}</div>
                <div>{formatCurrency(cart.itemsPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>{tc('tax')}</div>
                <div>{formatCurrency(cart.taxPrice)}</div>
              </div>
              <div className='flex justify-between'>
                <div>{tc('shippingFee')}</div>
                <div>{formatCurrency(cart.shippingPrice)}</div>
              </div>
              <div className='flex justify-between font-semibold border-t pt-3'>
                <div>{tc('totalPrice')}</div>
                <div>{formatCurrency(cart.totalPrice)}</div>
              </div>
              <PlaceOrderForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PlaceOrderPage;