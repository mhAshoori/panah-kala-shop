'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  addItemToCart,
  removeItemFromCart,
} from '@/lib/actions/cart.actions';
import type { Cart, CartItem } from '@/types';

const AddToCart = ({
  cart,
  item,
}: {
  cart?: Cart | null;
  item: Omit<CartItem, 'qty'> & { qty?: number };
}) => {
  const router = useRouter();
  const t = useTranslations('product');
  const [isPending, startTransition] = useTransition();

  const go = () => router.push('/cart');

  // Add item to cart
  const handleAddToCart = async () => {
    startTransition(async () => {
      const res = await addItemToCart({ qty: 1, ...item });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(res.message, {
        action: {
          label: t('goToCart'),
          onClick: go,
        },
      });
    });
  };

  // Remove item from cart
  const handleRemoveFromCart = async () => {
    startTransition(async () => {
      const res = await removeItemFromCart(item.productId);

      toast(res.message, {
        ...(res.success ? {} : { style: { background: '#f87171' } }),
      });
    });
  };

  const existItem =
    cart && cart.items.find((x) => x.productId === item.productId);

  return existItem ? (
    <div className='flex items-center justify-center gap-2'>
      <Button
        type='button'
        variant='outline'
        disabled={isPending}
        onClick={handleRemoveFromCart}
      >
        {isPending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Minus className='w-4 h-4' />
        )}
      </Button>
      <span className='px-3 text-lg font-semibold'>{existItem.qty}</span>
      <Button
        type='button'
        variant='outline'
        disabled={isPending}
        onClick={handleAddToCart}
      >
        {isPending ? (
          <Loader className='w-4 h-4 animate-spin' />
        ) : (
          <Plus className='w-4 h-4' />
        )}
      </Button>
    </div>
  ) : (
    <Button className='w-full' type='button' disabled={isPending} onClick={handleAddToCart}>
      {isPending ? (
        <>
          <Loader className='w-4 h-4 animate-spin' /> {t('adding')}
        </>
      ) : (
        <>
          <Plus className='w-4 h-4' /> {t('addToCart')}
        </>
      )}
    </Button>
  );
};

export default AddToCart;