'use client';

import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { OTP_RESEND_COOLDOWN_SECONDS, OTP_TTL_SECONDS } from '@/lib/constants';
import PhoneField from '@/components/shared/auth/phone-field';
import OtpInput from '@/components/shared/otp-input';

/**
 * Phone + one-time-code entry shared by sign-up and sign-in.
 *
 * Both forms needed the same three behaviours, and having them in two places
 * is how they drifted apart before. One component keeps them identical:
 *
 *  - a countdown from the instant a code is sent, using the same constant the
 *    server enforces so the displayed lifetime cannot drift from the real one
 *  - the phone number locked while a code is outstanding, with an explicit
 *    release, so a code cannot be submitted against a number it wasn't sent to
 *  - a resend that only unlocks once the code has expired, then waits out a
 *    short cool-down
 *
 * `registerCheck` decides whether the number is already taken — sign-up sends
 * existing numbers to sign-in, sign-in sends unknown numbers to sign-up.
 */
export default function PhoneOtpSection({
  mobile,
  onMobileChange,
  name = 'mobile',
  otpFieldName,
  registerCheck,
}: {
  mobile: string;
  onMobileChange: (v: string) => void;
  name?: string;
  otpFieldName: string;
  registerCheck?: (e164: string) => Promise<{ registered: boolean }>;
}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    if (mobile.length !== 10) return;
    setError('');
    const e164 = `+98${mobile}`;
    startTransition(async () => {
      if (registerCheck) {
        const reg = await registerCheck(e164);
        if (reg.registered) {
          setError(t('phoneAlreadyRegistered'));
          return;
        }
      }
      const { requestPhoneOtp } = await import('@/lib/actions/user.actions');
      const fd = new FormData();
      fd.set('phone', e164);
      const res = await requestPhoneOtp(null, fd);
      if (res.success) {
        setSent(true);
        setSecondsLeft(OTP_TTL_SECONDS);
        setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
        setCode('');
      } else {
        setError(res.message);
      }
    });
  };

  const releaseNumber = () => {
    setSent(false);
    setSecondsLeft(OTP_TTL_SECONDS);
    setCooldown(0);
    setCode('');
  };

  // m:ss must NOT go through formatNumberLocale — a numeric formatter would
  // treat it as a decimal and render 200 or 2. Localized digits only.
  const digits = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US');
  const mmss = `${digits.format(Math.floor(secondsLeft / 60))}:${digits.format(
    secondsLeft % 60
  )}`.padStart(4, '0');
  const numberLocked = sent;

  return (
    <>
      <Field>
        <FieldLabel htmlFor={name}>{t('mobile')}</FieldLabel>
        <PhoneField
          id={name}
          value={mobile}
          onChange={onMobileChange}
          disabled={numberLocked}
        />
      </Field>

      {numberLocked && (
        <div className='flex items-center justify-between gap-2 text-xs'>
          <span className='text-muted-foreground' aria-live='polite'>
            {t('otpCountdown', {
              time: mmss,
            })}
          </span>
          <button
            type='button'
            onClick={releaseNumber}
            className='link text-muted-foreground underline-offset-4 hover:text-primary'
          >
            {t('changeNumber')}
          </button>
        </div>
      )}

      {!numberLocked || secondsLeft <= 0 ? (
        <Button
          type='button'
          variant='outline'
          className='w-full'
          disabled={mobile.length !== 10 || isPending || cooldown > 0}
          onClick={send}
        >
          {isPending && <Loader2 className='h-4 w-4 animate-spin' />}
          {cooldown > 0 && numberLocked
            ? t('resendIn', {
                seconds: digits.format(cooldown),
              })
            : numberLocked
              ? t('resendCode')
              : t('sendCode')}
        </Button>
      ) : null}

      {error && (
        <p className={cn('mt-1 text-xs text-destructive')} dir='rtl'>
          {error}
        </p>
      )}

      <Field>
        <FieldLabel htmlFor={otpFieldName}>{t('otpCodeLabel')}</FieldLabel>
        <input type='hidden' name={otpFieldName} value={code} />
        <OtpInput
          value={code}
          onChange={setCode}
          disabled={mobile.length !== 10}
        />
      </Field>
    </>
  );
}
