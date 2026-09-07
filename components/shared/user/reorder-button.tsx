'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { reorderOrder } from '@/lib/actions/order.actions';

const ReorderButton = ({ orderId }: { orderId: string }) => {
  const t = useTranslations('order');
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await reorderOrder(orderId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={isPending}
      onClick={onClick}
    >
      {isPending ? (
        <RotateCcw className='h-4 w-4 animate-spin' />
      ) : (
        <RotateCcw className='h-4 w-4' />
      )}
      {t('reorder')}
    </Button>
  );
};

export default ReorderButton;
