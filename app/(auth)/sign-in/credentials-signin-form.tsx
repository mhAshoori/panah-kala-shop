'use client';

import { useState, useTransition, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { AuthError } from 'next-auth';
import { Loader2, Smartphone, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { requestPhoneOtp } from '@/lib/actions/user.actions';
import { signInDefaultValues } from '@/lib/constants';

type Mode = 'password' | 'phone';

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className='w-full' variant='default'>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

// Send-code button posts to the requestPhoneOtp action
const SendCodeForm = ({ phone }: { phone: string }) => {
  const t = useTranslations('auth');
  const [, action] = useActionState(requestPhoneOtp, {
    success: false,
    message: '',
  });
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className='text-center text-xs text-muted-foreground' dir='rtl'>
        {t('otpSentHint')}
      </p>
    );
  }

  return (
    <form action={action}>
      <input type='hidden' name='phone' value={phone} />
      <Button
        type='submit'
        variant='outline'
        className='w-full'
        disabled={!phone}
        onClick={() => setSent(true)}
      >
        {t('sendCode')}
      </Button>
    </form>
  );
};

const CredentialsSignInForm = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState(signInDefaultValues.email);
  const [password, setPassword] = useState(signInDefaultValues.password);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  const passwordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await signIn('credentials', {
          email,
          password,
          redirectTo: callbackUrl,
        });
      } catch (err) {
        if (err instanceof AuthError) {
          setError(t('invalidCredentials'));
        } else {
          setError(tCommon('error'));
        }
      }
    });
  };

  const phoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await signIn('sms', { phone, code, redirectTo: callbackUrl });
      } catch (err) {
        if (err instanceof AuthError) {
          setError(t('invalidCredentials'));
        } else {
          setError(tCommon('error'));
        }
      }
    });
  };

  return (
    <div className='space-y-4'>
      {/* Mode tabs */}
      <div className='grid grid-cols-2 gap-2 rounded-lg bg-muted p-1'>
        <button
          type='button'
          onClick={() => setMode('password')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
            mode === 'password'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground'
          )}
        >
          <KeyRound className='h-3.5 w-3.5' />
          {t('signIn')}
        </button>
        <button
          type='button'
          onClick={() => setMode('phone')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
            mode === 'phone'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground'
          )}
        >
          <Smartphone className='h-3.5 w-3.5' />
          {t('phoneSignIn')}
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={passwordSubmit}>
          <input type='hidden' name='callbackUrl' value={callbackUrl} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='email'>{t('email')}</FieldLabel>
              <Input
                id='email'
                required
                type='email'
                autoComplete='email'
                dir='ltr'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='password'>{t('password')}</FieldLabel>
              <Input
                id='password'
                required
                type='password'
                autoComplete='current-password'
                dir='ltr'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </FieldGroup>

          <div className='mt-6 space-y-4'>
            <SubmitButton label={t('signIn')} />
            {error && (
              <Alert variant='destructive'>
                <AlertTitle>{error}</AlertTitle>
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
      ) : (
        <form onSubmit={phoneSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='phone'>{t('mobile')}</FieldLabel>
              <Input
                id='phone'
                required
                type='tel'
                inputMode='tel'
                autoComplete='tel'
                dir='ltr'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='09121234567'
              />
            </Field>
            <SendCodeForm phone={phone} />
            <Field>
              <FieldLabel htmlFor='code'>{t('otpCodeLabel')}</FieldLabel>
              <Input
                id='code'
                required
                inputMode='numeric'
                dir='ltr'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='123456'
              />
            </Field>
          </FieldGroup>

          <div className='mt-6 space-y-4'>
            <SubmitButton label={t('phoneSignIn')} />
            {error && (
              <Alert variant='destructive'>
                <AlertTitle>{error}</AlertTitle>
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
      )}
    </div>
  );
};

export default CredentialsSignInForm;
