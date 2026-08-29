'use client';

import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SessionProvider, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';

import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { updateProfileSchema } from '@/lib/validator';
import { updateProfile } from '@/lib/actions/user.actions';

const ProfileForm = ({
  name,
  email,
  mobile,
  nationalId,
  cardNumber,
  sheba,
  birthDate,
  defaultAddress,
}: {
  name: string;
  email?: string | null;
  mobile?: string | null;
  nationalId?: string | null;
  cardNumber?: string | null;
  sheba?: string | null;
  birthDate?: Date | null;
  defaultAddress?: string | null;
}) => {
  return (
    <SessionProvider>
      <ProfileFormInner
        name={name}
        email={email}
        mobile={mobile}
        nationalId={nationalId}
        cardNumber={cardNumber}
        sheba={sheba}
        birthDate={birthDate}
        defaultAddress={defaultAddress}
      />
    </SessionProvider>
  );
};

const ProfileFormInner = ({
  name,
  email,
  mobile,
  nationalId,
  cardNumber,
  sheba,
  birthDate,
  defaultAddress,
}: {
  name: string;
  email?: string | null;
  mobile?: string | null;
  nationalId?: string | null;
  cardNumber?: string | null;
  sheba?: string | null;
  birthDate?: Date | null;
  defaultAddress?: string | null;
}) => {
  const { update } = useSession();
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name,
      email: email ?? undefined,
      mobile: mobile ?? '',
      nationalId: nationalId ?? '',
      cardNumber: cardNumber ?? '',
      sheba: sheba ?? '',
      birthDate: birthDate
        ? new Date(birthDate).toISOString().slice(0, 10)
        : '',
    },
  });

  const onSubmit = form.handleSubmit(
    async (values: z.infer<typeof updateProfileSchema>) => {
    startTransition(async () => {
      const res = await updateProfile(values);

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      // Refresh the session so the header user name updates too
      await update({ name: values.name });
      toast.success(t('saved'));
    });
  });

  return (
    <form onSubmit={onSubmit} className='space-y-4'>
      <FieldGroup>
        <Controller
          name='name'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='name'>{t('name')}</FieldLabel>
              <Input
                {...field}
                id='name'
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='email'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input {...field} id='email' disabled type='email' />
            </Field>
          )}
        />

        <Controller
          name='mobile'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='mobile'>{t('mobile')}</FieldLabel>
              <Input {...field} id='mobile' type='tel' required />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='nationalId'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='nationalId'>{t('nationalId')}</FieldLabel>
              <Input {...field} id='nationalId' inputMode='numeric' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='cardNumber'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='cardNumber'>{t('cardNumber')}</FieldLabel>
              <Input {...field} id='cardNumber' inputMode='numeric' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='sheba'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='sheba'>{t('sheba')}</FieldLabel>
              <Input {...field} id='sheba' placeholder='IR' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name='birthDate'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='birthDate'>{t('birthDate')}</FieldLabel>
              <Input {...field} id='birthDate' type='date' />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {/* Default address summary + link */}
      <Card size='sm'>
        <CardContent className='space-y-1 p-4'>
          <p className='text-sm font-medium'>{t('defaultAddressHint')}</p>
          {defaultAddress ? (
            <p dir='rtl' className='text-xs text-muted-foreground text-right'>
              {defaultAddress}
            </p>
          ) : (
            <p className='text-xs text-muted-foreground'>{t('noAddresses')}</p>
          )}
          <Button asChild variant='link' size='sm' className='h-auto p-0'>
            <a href='/user/addresses'>{t('manageAddresses')}</a>
          </Button>
        </CardContent>
      </Card>

      <Button type='submit' disabled={isPending}>
        {isPending ? (
          <>
            <Loader className='animate-spin w-4 h-4' /> {tc('loading')}
          </>
        ) : (
          t('updateProfile')
        )}
      </Button>
    </form>
  );
};

export default ProfileForm;