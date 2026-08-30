'use client';

import { useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { normalizeIranMobile } from '@/lib/phone';
import { signInDefaultValues } from '@/lib/constants';
import PhoneField from '@/components/shared/auth/phone-field';

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

// Sends the OTP by calling the server action directly (no nested <form>)
const SendCodeButton = ({ phone }: { phone: string }) => {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = () => {
    const normalized = normalizeIranMobile(`+98${phone}`);
    if (!normalized) {
      setError(t('invalidPhone'));
      return;
    }
    setError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.set('phone', normalized);
      const res = await requestPhoneOtp(null, fd);
      if (res.success) {
        setSent(true);
      } else {
        setError(res.message || tCommon('error'));
      }
    });
  };

  if (sent) {
    return (
      <p dir='rtl' className='text-center text-xs text-muted-foreground'>
        {t('otpSentHint')}
      </p>
    );
  }

  return (
    <div>
      <Button
        type='button'
        variant='outline'
        className='w-full'
        disabled={!phone || isPending}
        onClick={send}
      >
        {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
        {t('sendCode')}
      </Button>
      {error && (
        <p className='mt-1 text-xs text-destructive' dir='rtl'>
          {error}
        </p>
      )}
    </div>
  );
};

const CredentialsSignInForm = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

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
        // No redirectTo: without it Auth.js THROWS on failure so we can show
        // the message; on success we navigate manually.
        await signIn('credentials', { email, password, redirect: false });
        router.push(callbackUrl);
        router.refresh();
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
    const normalized = normalizeIranMobile(`+98${phone}`);
    if (!normalized) {
      setError(t('invalidPhone'));
      return;
    }
    startTransition(async () => {
      try {
        await signIn('sms', {
          phone: normalized,
          code,
          redirect: false,
        });
        router.push(callbackUrl);
        router.refresh();
      } catch (err) {
        if (err instanceof AuthError) {
          const code = (err as AuthError & { code?: string }).code;
          if (code === 'user_not_found') {
            setError(t('phoneNotRegistered'));
          } else if (code === 'rate_limited') {
            setError(t('tooManyAttempts'));
          } else {
            setError(t('invalidOtp'));
          }
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
            mode === 'phone' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          )}
        >
          <Smartphone className='h-3.5 w-3.5' />
          {t('phoneSignIn')}
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={passwordSubmit}>
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
              <PhoneField id='phone' value={phone} onChange={setPhone} />
            </Field>
            <SendCodeButton phone={phone} />
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
