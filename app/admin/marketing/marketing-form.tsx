'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { sendSpecialOffer } from '@/lib/actions/marketing.actions';
import { useRouter } from 'next/navigation';

const SubmitButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('admin');

  return (
    <Button type='submit' disabled={pending} className='w-full sm:w-auto'>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {t('sendOffer')}
    </Button>
  );
};

const MarketingForm = () => {
  const t = useTranslations('admin');
  const router = useRouter();

  const [state, formAction] = useActionState(sendSpecialOffer, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) toast.success(state.message);
      else toast.error(state.message);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardContent className='p-4'>
        <form action={formAction} className='space-y-4'>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='subject'>{t('offerSubject')}</FieldLabel>
              <Input id='subject' name='subject' dir='ltr' required maxLength={120} />
            </Field>
            <Field>
              <FieldLabel htmlFor='title'>{t('offerTitle')}</FieldLabel>
              <Input id='title' name='title' required maxLength={80} />
            </Field>
            <Field>
              <FieldLabel htmlFor='body'>{t('offerBody')}</FieldLabel>
              <textarea
                id='body'
                name='body'
                required
                maxLength={1000}
                rows={4}
                className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30'
              />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field>
                <FieldLabel htmlFor='couponCode'>{t('offerCouponCode')}</FieldLabel>
                <Input id='couponCode' name='couponCode' dir='ltr' maxLength={40} placeholder='WEEKEND20' />
                <FieldDescription dir='rtl'>{t('offerCouponHint')}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor='discountLine'>{t('offerDiscountLine')}</FieldLabel>
                <Input id='discountLine' name='discountLine' maxLength={80} placeholder='٪۲۰ تخفیف ویژه' />
              </Field>
              <Field>
                <FieldLabel htmlFor='ctaPath'>{t('offerCtaPath')}</FieldLabel>
                <Input id='ctaPath' name='ctaPath' dir='ltr' maxLength={200} placeholder='/search?sort=cheapest' />
              </Field>
            </div>
          </FieldGroup>
          <div className='flex items-center gap-3'>
            <SubmitButton />
            <p className='text-xs text-muted-foreground'>{t('offerRecipientsHint')}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MarketingForm;
