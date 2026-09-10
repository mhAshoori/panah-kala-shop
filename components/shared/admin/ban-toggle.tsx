'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Ban, Undo2 } from 'lucide-react';

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
import { setUserBanned } from '@/lib/actions/user.actions';

const BanToggle = ({
  userId,
  userName,
  banned,
}: {
  userId: string;
  userName: string;
  banned: boolean;
}) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const res = await setUserBanned(userId, !banned);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type='button'
          variant={banned ? 'outline' : 'destructive'}
          size='sm'
          disabled={isPending}
        >
          {banned ? <Undo2 className='h-4 w-4' /> : <Ban className='h-4 w-4' />}
          {banned ? t('unbanUser') : t('banUser')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {banned ? t('unbanUserTitle') : t('banUserTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {banned
              ? t('unbanUserConfirm', { name: userName })
              : t('banUserConfirm', { name: userName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={toggle}>
            {banned ? t('unbanUser') : t('banUser')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BanToggle;
