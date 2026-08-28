'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  deleteOrder,
  updateOrderToDelivered,
} from '@/lib/actions/admin.actions';

const OrderActions = ({
  orderId,
  isPaid,
  isDelivered,
  paymentMethod,
}: {
  orderId: string;
  isPaid: boolean;
  isDelivered: boolean;
  paymentMethod: string;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const markDelivered = () => {
    startTransition(async () => {
      try {
        await updateOrderToDelivered(orderId);
        toast.success(t('orderDelivered'));
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : tCommon('error')
        );
      }
    });
  };

  const remove = () => {
    if (!window.confirm(t('deleteOrderConfirm'))) return;
    startTransition(async () => {
      try {
        await deleteOrder(orderId);
        toast.success(t('orderDeleted'));
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
      {!isDelivered && (isPaid || paymentMethod === 'cod') && (
        <Button
          size='sm'
          variant='outline'
          disabled={isPending}
          onClick={markDelivered}
        >
          {isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <CheckCircle2 className='h-4 w-4' />
          )}
          <span className='hidden lg:inline'>{t('markDelivered')}</span>
        </Button>
      )}
      <Button
        size='sm'
        variant='destructive'
        disabled={isPending}
        onClick={remove}
      >
        <Trash2 className='h-4 w-4' />
        <span className='hidden lg:inline'>{t('delete')}</span>
      </Button>
    </div>
  );
};

export default OrderActions;
