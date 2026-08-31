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
import { requestPhoneOtp, checkPhoneRegistered } from '@/lib/actions/user.actions';
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

// Sends the OTP by calling the server action directly (no nested <form>).
// First verifies the phone belongs to a registered user — unregistered
// numbers are pointed to sign-up instead of silently failing later.
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
      const reg = await checkPhoneRegistered(normalized);
      if (!reg.registered) {
        setError(t('phoneNotRegistered'));
        return;
      }
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

const CredentialsSignInForm = ({
  googleEnabled = false,
}: {
  /** Rendered only when the server has GOOGLE_CLIENT_ID/SECRET configured */
  googleEnabled?: boolean;
}) => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  // Runtime fallback: a missing i18n key must never blank out an error
  const authError = (key: string) => (t.has(key) ? t(key) : tCommon('error'));

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState(signInDefaultValues.email);
  const [password, setPassword] = useState(signInDefaultValues.password);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  /**
   * The beta client signIn() resolves even when credentials fail (401 is
   * returned, no cookie is set) — the ONLY reliable success check is the
   * session endpoint. Navigation happens only when a session truly exists.
   */
  const verifySession = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = await res.json();
      return !!session?.user;
    } catch {
      return false;
    }
  };

  const passwordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await signIn('credentials', { email, password, redirect: false });
      } catch (err) {
        if (err instanceof AuthError) {
          setError(authError('invalidCredentials'));
          return;
        }
        setError(tCommon('error'));
        return;
      }

      if (!(await verifySession())) {
        setError(authError('invalidCredentials'));
        return;
      }
      router.push(callbackUrl);
      router.refresh();
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
      } catch (err) {
        if (err instanceof AuthError) {
          const code = (err as AuthError & { code?: string }).code;
          if (code === 'user_not_found') {
            setError(authError('phoneNotRegistered'));
          } else if (code === 'rate_limited') {
            setError(authError('tooManyAttempts'));
          } else {
            setError(authError('invalidOtp'));
          }
        } else {
          setError(tCommon('error'));
        }
        return;
      }

      if (!(await verifySession())) {
        setError(authError('invalidOtp'));
        return;
      }
      router.push(callbackUrl);
      router.refresh();
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

      {/* Google OAuth — rendered only when the server exposes the provider */}
      {googleEnabled && (
        <>
          <div className='flex items-center gap-3' aria-hidden='true'>
            <span className='h-px flex-1 bg-border' />
            <span className='text-xs text-muted-foreground'>{t('or')}</span>
            <span className='h-px flex-1 bg-border' />
          </div>
          <Button
            type='button'
            variant='outline'
            className='w-full'
            disabled={googlePending}
            onClick={() => {
              setGooglePending(true);
              signIn('google', { callbackUrl });
            }}
          >
            {googlePending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <svg aria-hidden='true' viewBox='0 0 24 24' className='h-4 w-4'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z'
                />
              </svg>
            )}
            {t('googleSignIn')}
          </Button>
        </>
      )}

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
