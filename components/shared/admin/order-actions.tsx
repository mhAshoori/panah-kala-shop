'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Banknote, CheckCircle2, Loader2, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  deleteOrder,
  updateOrderToDelivered,
  updateOrderToPaid,
} from '@/lib/actions/admin.actions';

// Two-step fulfilment: 1) mark as paid, 2) mark as delivered (paid first!)
const OrderActions = ({
  orderId,
  isPaid,
  isDelivered,
}: {
  orderId: string;
  isPaid: boolean;
  isDelivered: boolean;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<unknown>, successMsg?: string) => {
    startTransition(async () => {
      try {
        await action();
        if (successMsg) toast.success(successMsg);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : tCommon('error')
        );
      }
    });
  };

  return (
    <div className='flex items-center justify-end gap-1'>
      {!isPaid && (
        <Button
          size='sm'
          variant='outline'
          disabled={isPending}
          onClick={() => run(() => updateOrderToPaid(orderId), t('orderPaid'))}
        >
          {isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Banknote className='h-4 w-4' />
          )}
          <span className='hidden xl:inline'>{t('markPaid')}</span>
        </Button>
      )}
      {isPaid && !isDelivered && (
        <Button
          size='sm'
          variant='outline'
          disabled={isPending}
          onClick={() =>
            run(() => updateOrderToDelivered(orderId), t('orderDelivered'))
          }
        >
          {isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Truck className='h-4 w-4' />
          )}
          <span className='hidden xl:inline'>{t('markDelivered')}</span>
        </Button>
      )}
      <Button
        size='sm'
        variant='destructive'
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t('deleteOrderConfirm'))) return;
          run(() => deleteOrder(orderId), t('orderDeleted'));
        }}
      >
        {isPending ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <Trash2 className='h-4 w-4' />
        )}
        <span className='hidden xl:inline'>{t('delete')}</span>
      </Button>
      {isDelivered && (
        <CheckCircle2 className='h-4 w-4 text-primary' aria-label={t('orderDelivered')} />
      )}
    </div>
  );
};

export default OrderActions;
