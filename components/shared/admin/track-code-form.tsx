'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { setOrderTrackCode } from '@/lib/actions/admin.actions';
import { useRouter } from 'next/navigation';

// Admin: enter/edit the postal tracking code ("کد رهگیری") after shipping.
const TrackCodeForm = ({
  orderId,
  trackCode,
}: {
  orderId: string;
  trackCode?: string | null;
}) => {
  const t = useTranslations('order');
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(trackCode ?? '');
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        await setOrderTrackCode(orderId, value);
        toast.success(t('trackCodeSaved'));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error');
      }
    });
  };

  return (
    <Card>
      <CardContent className='p-4'>
        <Field>
          <FieldLabel htmlFor='trackCode'>{t('trackCode')}</FieldLabel>
          <div className='flex max-w-md gap-2'>
            <Input
              id='trackCode'
              value={value}
              onChange={(e) => setValue(e.target.value)}
              // Persian digits typed by users are normalized on the server
              inputMode='numeric'
              dir='ltr'
              placeholder='۲۰ تا ۲۴ رقم'
            />
            <Button onClick={save} disabled={pending}>
              {pending && <Loader className='h-4 w-4 animate-spin' />}
              {t('save')}
            </Button>
          </div>
          <p className='text-xs text-muted-foreground'>{t('trackCodeHint')}</p>
        </Field>
      </CardContent>
    </Card>
  );
};

export default TrackCodeForm;
