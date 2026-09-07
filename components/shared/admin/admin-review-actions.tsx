'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  setReviewApproval,
  deleteReviewAdmin,
} from '@/lib/actions/review.actions';

const AdminReviewActions = ({
  reviewId,
  isApproved,
}: {
  reviewId: string;
  isApproved: boolean;
}) => {
  const t = useTranslations('admin');
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const res = await setReviewApproval(reviewId, !isApproved);
      if (res.success) toast.success(t('reviewUpdated'));
      else toast.error(res.message || t('error'));
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteReviewAdmin(reviewId);
      if (res.success) toast.success(t('deleted'));
      else toast.error(res.message || t('error'));
    });
  };

  return (
    <div className='flex items-center justify-end gap-1'>
      <Button
        size='sm'
        variant={isApproved ? 'outline' : 'default'}
        disabled={isPending}
        onClick={toggle}
      >
        {isApproved ? <X className='h-4 w-4' /> : <Check className='h-4 w-4' />}
        {isApproved ? t('unapprove') : t('approve')}
      </Button>
      <Button
        size='sm'
        variant='destructive'
        disabled={isPending}
        onClick={remove}
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  );
};

export default AdminReviewActions;
