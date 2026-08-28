'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';
import { z } from 'zod';

import CheckoutSteps from '@/components/shared/checkout-steps';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { updateUserPaymentMethod } from '@/lib/actions/user.actions';
import { DEFAULT_PAYMENT_METHOD } from '@/lib/constants';
import { paymentMethodSchema } from '@/lib/validator';
import { useRouter } from '@/i18n/navigation';

const methodLabelKey: Record<string, string> = {
  zarinpal: 'checkout.zarinpal',
  cod: 'checkout.cashOnDelivery',
};

const PaymentMethodForm = ({
  preferredPaymentMethod,
  codAllowed,
}: {
  preferredPaymentMethod: string | null;
  codAllowed: boolean;
}) => {
  const router = useRouter();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const methods = codAllowed
    ? (['zarinpal', 'cod'] as const)
    : (['zarinpal'] as const);

  const form = useForm<z.infer<typeof paymentMethodSchema>>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type:
        preferredPaymentMethod === 'cod' && !codAllowed
          ? DEFAULT_PAYMENT_METHOD
          : preferredPaymentMethod || DEFAULT_PAYMENT_METHOD,
    },
  });

  const onSubmit = async (values: z.infer<typeof paymentMethodSchema>) => {
    startTransition(async () => {
      const res = await updateUserPaymentMethod(values);

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      router.push('/place-order');
    });
  };

  return (
    <>
      <CheckoutSteps current={2} />
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <Controller
          name='type'
          control={form.control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              dir='rtl'
              className='gap-4'
            >
              {methods.map((method) => (
                <Field key={method} orientation='horizontal'>
                  <FieldLabel
                    htmlFor={method}
                    dir='rtl'
                    className='flex w-full flex-row-reverse items-center justify-between gap-4 rounded-lg border p-4 font-normal cursor-pointer hover:bg-muted/50'
                  >
                    <span className='text-start'>
                      {t(methodLabelKey[method] ?? 'checkout.zarinpal')}
                      {method === 'cod' && (
                        <span className='block text-xs text-muted-foreground mt-1'>
                          {t('checkout.codDesc')}
                        </span>
                      )}
                    </span>
                    <RadioGroupItem id={method} value={method} />
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          )}
        />

        <Button type='submit' disabled={isPending}>
          {isPending ? (
            <>
              <Loader className='animate-spin w-4 h-4' />{' '}
              {t('common.loading')}
            </>
          ) : (
            t('common.next')
          )}
        </Button>
      </form>
    </>
  );
};

export default PaymentMethodForm;