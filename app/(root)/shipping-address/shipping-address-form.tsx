'use client';

import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { shippingAddressSchema } from '@/lib/validator';
import { updateUserAddress } from '@/lib/actions/user.actions';
import CheckoutSteps from '@/components/shared/checkout-steps';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { ShippingAddress } from '@/types';
import { z } from 'zod';

const ShippingAddressForm = ({
  address,
}: {
  address: ShippingAddress | null;
}) => {
  const router = useRouter();
  const t = useTranslations('checkout');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof shippingAddressSchema>>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: address ?? {
      fullName: '',
      streetAddress: '',
      city: '',
      province: '',
      postalCode: '',
      phone: '',
      country: '',
    },
  });

  const fields: {
    name: keyof z.infer<typeof shippingAddressSchema>;
    label: string;
    type?: string;
  }[] = [
    { name: 'fullName', label: t('fullName') },
    { name: 'streetAddress', label: t('streetAddress') },
    { name: 'city', label: t('city') },
    { name: 'province', label: t('province') },
    { name: 'postalCode', label: t('postalCode') },
    { name: 'phone', label: t('phone'), type: 'tel' },
    { name: 'country', label: t('country') },
  ];

  const onSubmit: SubmitHandler<z.infer<typeof shippingAddressSchema>> =
    async (values) => {
      startTransition(async () => {
        const res = await updateUserAddress(values);

        if (!res.success) {
          toast.error(res.message);
          return;
        }

        router.push('/payment-method');
      });
    };

  return (
    <>
      <CheckoutSteps current={1} />
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-4'
      >
        <FieldGroup>
          <div className='grid gap-4 md:grid-cols-2'>
            {fields.map((f) => (
              <Controller
                key={f.name}
                name={f.name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field className='w-full' data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
                    <Input
                      {...field}
                      id={f.name}
                      type={f.type ?? 'text'}
                      aria-invalid={fieldState.invalid}
                      placeholder={f.label}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            ))}
          </div>

          <div className='flex gap-2'>
            <Button type='submit' disabled={isPending}>
              {isPending ? (
                <Loader className='animate-spin w-4 h-4' />
              ) : (
                tc('next')
              )}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  );
};

export default ShippingAddressForm;