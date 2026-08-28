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
import { Loader } from 'lucide-react';
import { updateProfileSchema } from '@/lib/validator';
import { updateProfile } from '@/lib/actions/user.actions';

const ProfileForm = ({ name, email }: { name: string; email: string }) => {
  return (
    <SessionProvider>
      <ProfileFormInner name={name} email={email} />
    </SessionProvider>
  );
};

const ProfileFormInner = ({ name, email }: { name: string; email: string }) => {
  const { update } = useSession();
  const t = useTranslations('account');
  const tc = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name, email },
  });

  const onSubmit = async (values: z.infer<typeof updateProfileSchema>) => {
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
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
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
      </FieldGroup>

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