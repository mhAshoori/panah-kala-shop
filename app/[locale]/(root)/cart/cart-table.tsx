'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
import {
  addItemToCart,
  removeItemFromCart,
} from '@/lib/actions/cart.actions';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';
import { Cart } from '@/types';

const CartTable = ({
  cart,
  title,
}: {
  cart?: Cart | null;
  title: string;
}) => {
  const router = useRouter();
  const t = useTranslations('cart');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <h1 className='py-4 h2-bold'>{title}</h1>
      {!cart || cart.items.length === 0 ? (
        <div className='flex flex-col items-center gap-4 py-16'>
          <p className='text-lg text-muted-foreground'>{t('empty')}</p>
          <Button onClick={() => router.push('/')}>
            {t('continueShopping')}
          </Button>
        </div>
      ) : (
        <div className='grid md:grid-cols-4 md:gap-5'>
          <div className='overflow-x-auto md:col-span-3'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('item')}</TableHead>
                  <TableHead className='text-center'>{t('quantity')}</TableHead>
                  <TableHead className='text-end'>{t('price')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell>
                      <a
                        href={`/product/${item.slug}`}
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
                    <TableCell className='flex-center gap-2'>
                      <Button
                        disabled={isPending}
                        variant='outline'
                        type='button'
                        onClick={() =>
                          startTransition(async () => {
                            const res = await removeItemFromCart(
                              item.productId
                            );
                            if (!res.success) {
                              toast.error(res.message);
                            }
                          })
                        }
                      >
                        {isPending ? (
                          <div className='w-4 h-4 border-2 border-muted-foreground rounded-full animate-spin' />
                        ) : (
                          '-'
                        )}
                      </Button>
                      <span className='px-2'>{item.qty}</span>
                      <Button
                        disabled={isPending}
                        variant='outline'
                        type='button'
                        onClick={() =>
                          startTransition(async () => {
                            const res = await addItemToCart(item);
                            if (!res.success) {
                              toast.error(res.message);
                            }
                          })
                        }
                      >
                        +
                      </Button>
                    </TableCell>
                    <TableCell className='text-end'>
                      {formatCurrency(item.price)}{' '}
                      <span className='text-xs text-muted-foreground'>
                        {tc('currency')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Subtotal card */}
          <Card>
            <CardContent className='p-4 gap-4'>
              <div className='pb-3 text-xl flex-between'>
                <span>
                  {t('subtotal')} (
                  {cart.items.reduce((a, c) => a + c.qty, 0)})
                </span>
                <span className='font-bold'>
                  {formatCurrency(cart.itemsPrice)}
                </span>
              </div>
              <Button
                onClick={() =>
                  startTransition(() => router.push('/shipping-address'))
                }
                className='w-full'
                disabled={isPending}
              >
                {isPending
                  ? tc('loading')
                  : t('checkout')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default CartTable;