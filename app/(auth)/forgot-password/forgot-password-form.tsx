'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '@/lib/actions/user.actions';

const SubmitButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('common');
  return (
    <Button type='submit' disabled={pending} className='w-full'>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {t('save')}
    </Button>
  );
};

const ForgotPasswordForm = () => {
  const t = useTranslations('auth');
  const [state, formAction] = useActionState(requestPasswordReset, null);

  return (
    <form action={formAction} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='email'>{t('email')}</Label>
        <Input
          id='email'
          name='email'
          type='email'
          dir='ltr'
          autoComplete='email'
          required
        />
      </div>
      <SubmitButton />
      {state?.message && (
        <p
          className={
            state.success ? 'text-sm text-green-600' : 'text-sm text-destructive'
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
};

export default ForgotPasswordForm;
