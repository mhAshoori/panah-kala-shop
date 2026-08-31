'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const DeleteDialog = ({
  id,
  action,
  confirmKey = 'deleteProductConfirm',
  label,
  triggerIcon,
}: {
  id: string;
  action: (id: string) => Promise<{ success: boolean; message?: string }>;
  /** i18n key (admin namespace) for the confirmation question */
  confirmKey?: string;
  /** Optional label override (defaults to t('delete')) */
  label?: React.ReactNode;
  /** Optional icon to render inside the trigger button */
  triggerIcon?: React.ReactNode;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await action(id);
      if (res.success) {
        toast.success(res.message ?? t('delete'));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message || tCommon('error'));
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size='sm' variant='destructive'>
          {triggerIcon}
          {label ?? t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
          <AlertDialogDescription>{t(confirmKey)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {tCommon('cancel')}
          </AlertDialogCancel>
          <Button variant='destructive' disabled={isPending} onClick={onDelete}>
            {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
            {t('delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDialog;
