'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { Minus, Plus, ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  addItemToCart,
  removeItemFromCart,
} from '@/lib/actions/cart.actions';
import { formatNumberLocale } from '@/lib/persian';
import { Link, useRouter } from '@/i18n/navigation';
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
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const totalQty = cart?.items.reduce((a, c) => a + c.qty, 0) ?? 0;

  return (
    <>
      <h1 className='py-4 h2-bold'>{title}</h1>
      {!cart || cart.items.length === 0 ? (
        <div className='flex flex-col items-center gap-4 py-20 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
            <ShoppingCart className='h-8 w-8 text-muted-foreground' />
          </div>
          <p className='text-lg text-muted-foreground'>{t('empty')}</p>
          <Button asChild>
            <Link href='/'>{t('continueShopping')}</Link>
          </Button>
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-3 lg:items-start'>
          <div className='space-y-3 lg:col-span-2'>
            {cart.items.map((item) => (
              <Card key={item.slug} size='sm'>
                <CardContent className='flex flex-wrap items-center gap-4'>
                  <Link
                    href={`/product/${item.slug}`}
                    className='relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted'
                  >
                    <Image
                      src={item.image}
                      alt={item.nameFa ?? item.name}
                      fill
                      sizes='80px'
                      className='object-cover'
                    />
                  </Link>
                  <div className='min-w-0 flex-1'>
                    <Link
                      href={`/product/${item.slug}`}
                      className='line-clamp-2 text-sm font-medium hover:text-primary transition-colors'
                    >
                      {item.nameFa ?? item.name}
                    </Link>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {formatNumberLocale(item.price, locale)}{' '}
                      <span className='text-xs'>{tc('currency')}</span>
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      disabled={isPending}
                      variant='outline'
                      size='icon'
                      aria-label={t('remove')}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await removeItemFromCart(item.productId);
                          if (!res.success) {
                            toast.error(res.message);
                          }
                        })
                      }
                    >
                      <Minus className='h-4 w-4' />
                    </Button>
                    <span className='w-8 text-center text-sm font-medium tabular-nums'>
                      {formatNumberLocale(item.qty, locale)}
                    </span>
                    <Button
                      disabled={isPending}
                      variant='outline'
                      size='icon'
                      aria-label={t('add')}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await addItemToCart(item);
                          if (!res.success) {
                            toast.error(res.message);
                          }
                        })
                      }
                    >
                      <Plus className='h-4 w-4' />
                    </Button>
                  </div>
                  <div className='w-24 text-end text-sm font-semibold'>
                    {formatNumberLocale(Number(item.price) * item.qty, locale)}
                    <span className='ms-1 text-xs font-normal text-muted-foreground'>
                      {tc('currency')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary card */}
          <Card className='lg:sticky lg:top-24'>
            <CardContent className='flex flex-col gap-3 p-4'>
              <h2 className='text-lg font-semibold'>{t('subtotal')}</h2>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>{t('items')}</span>
                <span>{totalQty}</span>
              </div>
              <div className='flex justify-between border-t pt-3 text-base font-semibold'>
                <span>{t('totalPrice')}</span>
                <span>
                  {formatNumberLocale(cart.itemsPrice, locale)}
                  <span className='ms-1 text-xs font-normal text-muted-foreground'>
                    {tc('currency')}
                  </span>
                </span>
              </div>
              <Button
                onClick={() =>
                  startTransition(() => router.push('/shipping-address'))
                }
                className='mt-2 w-full'
                disabled={isPending}
              >
                {isPending ? tc('loading') : t('checkout')}
              </Button>
              <Button asChild variant='ghost' size='sm'>
                <Link href='/'>{t('continueShopping')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default CartTable;