'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
import { signUpUser } from '@/lib/actions/user.actions';
import { cn } from '@/lib/utils';
import PhoneOtpSection from '@/components/shared/auth/phone-otp-section';
import GoogleButton from '@/components/shared/auth/google-button';

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

const SignUpForm = ({
  googleEnabled = false,
}: {
  /** Rendered only when the server has GOOGLE_CLIENT_ID/SECRET configured */
  googleEnabled?: boolean;
}) => {
  const [data, action] = useActionState(signUpUser, {
    success: false,
    message: '',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const retriedRef = useRef(false);
  const toastShownRef = useRef(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/user/profile';
  const t = useTranslations('auth');

  // A pre-filled number is a phone shopper mid-flow — start them in phone mode.
const [mode, setMode] = useState<Mode>(
    searchParams.get('mobile') ? 'phone' : 'email'
  );
  const [mobile, setMobile] = useState(
    () => searchParams.get('mobile') ?? ''
  );
  // Controlled, not defaultValue: a failed submit re-renders this form, and an
  // uncontrolled input resets to defaultValue on that re-render — wiping what
  // the shopper typed. Same reason the phone field is state-driven.
  const [name, setName] = useState(signUpDefaultValues.name);

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

  // Rare path: the account WAS created but the session could not be
  // established. The account survives, so this is a toast with a way
  // forward — not an error styling, which would imply it was rolled back.
  useEffect(() => {
    if (data.toast === 'accountCreatedNotSignedIn' && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.error(t('accountCreatedNotSignedIn'), {
        description: t('signInToContinue'),
        action: {
          label: t('signIn'),
          onClick: () => router.push('/sign-in'),
        },
      });
    }
    if (data.toast === undefined) {
      toastShownRef.current = false;
    }
  }, [data, router, t]);

  return (
    <form action={action} ref={formRef}>
      <input type='hidden' name='callbackUrl' value={callbackUrl} />
      <input type='hidden' name='mode' value={mode} />

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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='text-right' dir='rtl'
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
                defaultValue={signUpDefaultValues.email ?? ''}
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
                defaultValue={signUpDefaultValues.password ?? ''}
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
                defaultValue={signUpDefaultValues.confirmPassword ?? ''}
              />
            </Field>
          </>
        ) : (
          <>
            <PhoneOtpSection
              mobile={mobile}
              onMobileChange={setMobile}
              otpFieldName='otpCode'
              // A registered number is a PROBLEM here — it must not get a code.
              intent='register'
            />
          </>
        )}

        {!data.success && data.message !== '' && (
          <FieldError>{data.message}</FieldError>
        )}
      </FieldGroup>

      <div className='mt-6 space-y-4'>
        <SignUpButton />
        {googleEnabled && (
          <>
            <div className='flex items-center gap-3' aria-hidden='true'>
              <span className='h-px flex-1 bg-border' />
              <span className='text-xs text-muted-foreground'>{t('or')}</span>
              <span className='h-px flex-1 bg-border' />
            </div>
            <GoogleButton callbackUrl='/user/profile' />
          </>
        )}
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
