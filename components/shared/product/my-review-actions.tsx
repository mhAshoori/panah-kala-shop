'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteMyReview } from '@/lib/actions/review.actions';
import ReviewForm from '@/components/shared/product/review-form';
import { Review } from '@/types';

const MyReviewActions = ({
  review,
}: {
  review: {
    id: string;
    productId: string;
    rating: number;
    title: string;
    description: string;
  };
}) => {
  const t = useTranslations('review');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const remove = () => {
    startTransition(async () => {
      const res = await deleteMyReview(review.id);
      if (res.success) toast.success(t('deletedMine'));
      else toast.error(res.message || tCommon('error'));
    });
  };

  return (
    <div className='flex items-center gap-2'>
      <Button
        size='sm'
        variant='outline'
        disabled={isPending}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className='h-4 w-4' />
        {tCommon('edit')}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size='sm' variant='destructive' disabled={isPending}>
            <Trash2 className='h-4 w-4' />
            {tCommon('delete')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReviewForm
        productId={review.productId}
        existingReview={review as Review}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
};

export default MyReviewActions;
