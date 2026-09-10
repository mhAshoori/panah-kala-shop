'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/lib/actions/user.actions';

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

const ResetPasswordForm = ({
  token,
  email,
}: {
  token: string;
  email: string;
}) => {
  const t = useTranslations('auth');
  const router = useRouter();
  const [state, formAction] = useActionState(resetPassword, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
      router.push('/sign-in');
    }
  }, [state, router]);

  return (
    <form action={formAction} className='space-y-4'>
      <input type='hidden' name='token' value={token} />
      <input type='hidden' name='email' value={email} />
      <div className='space-y-2'>
        <Label htmlFor='newPassword'>{t('newPassword')}</Label>
        <Input
          id='newPassword'
          name='newPassword'
          type='password'
          dir='ltr'
          autoComplete='new-password'
          required
        />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='confirmPassword'>{t('confirmNewPassword')}</Label>
        <Input
          id='confirmPassword'
          name='confirmPassword'
          type='password'
          dir='ltr'
          autoComplete='new-password'
          required
        />
      </div>
      <SubmitButton />
      {!state?.success && state?.message && (
        <p className='text-sm text-destructive'>{state.message}</p>
      )}
    </form>
  );
};

export default ResetPasswordForm;
