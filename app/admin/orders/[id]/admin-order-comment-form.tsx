'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { setOrderComment } from '@/lib/actions/admin.actions';

// Admin "store message" to the buyer — shown on their order page
const AdminOrderCommentForm = ({
  orderId,
  initialComment,
}: {
  orderId: string;
  initialComment: string | null;
}) => {
  const t = useTranslations('admin');
  const [value, setValue] = useState(initialComment ?? '');
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      try {
        await setOrderComment(orderId, value);
        toast.success(t('orderCommentSaved'));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    });

  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium'>{t('orderComment')}</p>
      <Textarea
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('orderCommentPlaceholder')}
        className='text-right' dir='rtl'
      />
      <Button size='sm' onClick={save} disabled={isPending}>
        {t('save')}
      </Button>
    </div>
  );
};

export default AdminOrderCommentForm;
