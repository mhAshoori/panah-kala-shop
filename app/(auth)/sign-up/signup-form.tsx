'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, Smartphone, KeyRound } from 'lucide-react';

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
import { signUpUser, requestPhoneOtp } from '@/lib/actions/user.actions';
import { cn } from '@/lib/utils';

type Mode = 'email' | 'phone';

const SignUpButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');

  return (
    <Button disabled={pending} className='w-full' variant='default'>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {t('signUp')}
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
    if (!phone) return;
    setError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.set('phone', phone);
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

const SignUpForm = () => {
  const [data, action] = useActionState(signUpUser, {
    success: false,
    message: '',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const retriedRef = useRef(false);

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/user/profile';
  const t = useTranslations('auth');

  const [mode, setMode] = useState<Mode>('email');
  const [mobile, setMobile] = useState(signUpDefaultValues.mobile ?? '');

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

      {/* Account-type toggle */}
      <div className='mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1'>
        <button
          type='button'
          onClick={() => setMode('email')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
            mode === 'email' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          )}
        >
          <KeyRound className='h-3.5 w-3.5' />
          {t('email')}
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
          {t('mobile')}
        </button>
      </div>

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

        {mode === 'email' ? (
          <>
            <Field>
              <FieldLabel htmlFor='email'>{t('email')}</FieldLabel>
              <Input
                id='email'
                name='email'
                required
                type='email'
                autoComplete='email'
                dir='ltr'
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
                dir='ltr'
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
                dir='ltr'
                defaultValue={signUpDefaultValues.confirmPassword}
              />
            </Field>
          </>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor='mobile'>{t('mobile')}</FieldLabel>
              <Input
                id='mobile'
                name='mobile'
                required
                type='tel'
                inputMode='tel'
                autoComplete='tel'
                dir='ltr'
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder='09121234567'
              />
            </Field>
            <SendCodeButton phone={mobile} />
            <Field>
              <FieldLabel htmlFor='otpCode'>{t('otpCodeLabel')}</FieldLabel>
              <Input
                id='otpCode'
                name='otpCode'
                required
                inputMode='numeric'
                dir='ltr'
                placeholder='123456'
              />
            </Field>
          </>
        )}

        {!data.success && data.message !== '' && (
          <FieldError>{data.message}</FieldError>
        )}
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
