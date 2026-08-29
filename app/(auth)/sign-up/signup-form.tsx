'use client';
import { useEffect, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signUpDefaultValues } from '@/lib/constants';
import { signUpUser } from '@/lib/actions/user.actions';

const SignUpButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');

  return (
    <Button disabled={pending} className='w-full' variant='default'>
      {pending ? `${t('createAccount')}...` : t('signUp')}
    </Button>
  );
};

const SignUpForm = () => {
  const [data, action] = useActionState(signUpUser, {
    success: false,
    message: '',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const retriedRef = useRef(false);

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const t = useTranslations('auth');

  // Transparent single retry after a stale auth cookie was cleared server-side
  useEffect(() => {
    if (data.retry && !retriedRef.current) {
      retriedRef.current = true;
      formRef.current?.requestSubmit();
    }
    if (!data.retry) {
      retriedRef.current = false;
    }
  }, [data]);

  return (
    <form action={action} ref={formRef}>
      <input type='hidden' name='callbackUrl' value={callbackUrl} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='name'>{t('name')}</FieldLabel>
          <Input
            id='name'
            name='name'
            required
            type='text'
            autoComplete='name'
            defaultValue={signUpDefaultValues.name}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='email'>{t('email')}</FieldLabel>
          <Input
            id='email'
            name='email'
            required
            type='email'
            autoComplete='email'
            defaultValue={signUpDefaultValues.email}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='password'>{t('password')}</FieldLabel>
          <Input
            id='password'
            name='password'
            required
            type='password'
            minLength={6}
            autoComplete='new-password'
            defaultValue={signUpDefaultValues.password}
          />
          <FieldDescription>حداقل ۶ کاراکتر / min. 6 chars</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor='confirmPassword'>
            {t('confirmPassword')}
          </FieldLabel>
          <Input
            id='confirmPassword'
            name='confirmPassword'
            required
            type='password'
            minLength={6}
            autoComplete='new-password'
            defaultValue={signUpDefaultValues.confirmPassword}
          />
          {!data.success && data.message !== '' && (
            <FieldError>{data.message}</FieldError>
          )}
        </Field>
      </FieldGroup>

      <div className='mt-6 space-y-4'>
        <SignUpButton />
        <p className='text-sm text-center text-muted-foreground'>
          {t('haveAccount')}{' '}
          <Link
            target='_self'
            className='link text-primary'
            href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            {t('signIn')}
          </Link>
        </p>
      </div>
    </form>
  );
};

export default SignUpForm;