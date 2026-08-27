'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { signInDefaultValues } from '@/lib/constants';
import { signInWithCredentials } from '@/lib/actions/user.actions';

const SignInButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');

  return (
    <Button disabled={pending} className='w-full' variant='default'>
      {pending ? `${t('signingIn')}...` : t('signIn')}
    </Button>
  );
};

const CredentialsSignInForm = () => {
  const [data, action] = useActionState(signInWithCredentials, {
    success: false,
    message: '',
  });

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const t = useTranslations('auth');

  return (
    <form action={action}>
      <input type='hidden' name='callbackUrl' value={callbackUrl} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='email'>{t('email')}</FieldLabel>
          <Input
            id='email'
            name='email'
            required
            type='email'
            autoComplete='email'
            defaultValue={signInDefaultValues.email}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='password'>{t('password')}</FieldLabel>
          <Input
            id='password'
            name='password'
            required
            type='password'
            autoComplete='current-password'
            defaultValue={signInDefaultValues.password}
          />
        </Field>
      </FieldGroup>

      <div className='mt-6 space-y-4'>
        <SignInButton />
        {!data.success && data.message !== '' && (
          <Alert variant='destructive'>
            <AlertTitle>{data.message}</AlertTitle>
          </Alert>
        )}
        <p className='text-sm text-center text-muted-foreground'>
          {t('noAccount')}{' '}
          <Link
            target='_self'
            className='link text-primary'
            href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            {t('signUp')}
          </Link>
        </p>
      </div>
    </form>
  );
};

export default CredentialsSignInForm;