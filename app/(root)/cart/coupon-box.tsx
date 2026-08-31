'use client';

import { useActionState, useEffect, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, TicketX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  applyCouponToCart,
  removeCouponFromCart,
} from '@/lib/actions/cart.actions';
import { formatNumberLocale } from '@/lib/persian';

const ApplyButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('cart');

  return (
    <Button type='submit' size='sm' disabled={pending}>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {t('couponApply')}
    </Button>
  );
};

const CouponBox = ({
  couponCode,
  couponDiscount,
  locale,
}: {
  couponCode?: string | null;
  couponDiscount?: string | null;
  locale: string;
}) => {
  const t = useTranslations('cart');
  const tCommon = useTranslations('common');
  const [state, formAction] = useActionState(applyCouponToCart, {
    success: false,
    message: '',
  });
  const [isRemoving, startRemove] = useTransition();

  useEffect(() => {
    if (state.message) {
      if (state.success) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  const handleRemove = () => {
    startRemove(async () => {
      const res = await removeCouponFromCart();
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    });
  };

  if (couponCode) {
    return (
      <div className='flex items-center justify-between rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3'>
        <div className='flex min-w-0 items-center gap-2 text-sm'>
          <span className='rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground'>
            {couponCode}
          </span>
          <span className='truncate text-xs text-muted-foreground'>
            −{formatNumberLocale(couponDiscount ?? '0', locale)}{' '}
            {tCommon('currency')}
          </span>
        </div>
        <Button
          size='sm'
          variant='ghost'
          className='text-destructive hover:text-destructive'
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label={t('couponRemove')}
        >
          {isRemoving ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <TicketX className='h-4 w-4' />
          )}
          {t('couponRemove')}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className='flex items-center gap-2'>
      <Input
        name='code'
        placeholder={t('couponPlaceholder')}
        className='h-9 flex-1 font-mono text-sm uppercase'
        dir='ltr'
        maxLength={40}
        required
      />
      <ApplyButton />
    </form>
  );
};

export default CouponBox;
