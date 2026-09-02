'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Six separated digit boxes for one-time codes (SMS/email OTP). Each box
 * holds one digit; typing auto-advances, backspace retreats, paste of a
 * full code distributes across boxes. Persian/Arabic digits are normalized
 * to ASCII. The value is exposed as a plain string via onChange so the
 * component drops into any existing form.
 */
const OtpInput = ({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  onComplete,
}: {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toAsciiDigit = (ch: string): string => {
    if (/\d/.test(ch)) return ch;
    const persian = '۰۱۲۳۴۵۶۷۸۹'.indexOf(ch);
    if (persian >= 0) return String(persian);
    const arabic = '٠١٢٣٤٥٦٧٨٩'.indexOf(ch);
    if (arabic >= 0) return String(arabic);
    return '';
  };

  const commit = (next: string[]) => {
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  };

  const setDigit = (index: number, raw: string) => {
    const digit = toAsciiDigit(raw);
    const next = [...digits];
    if (digit === '') {
      next[index] = '';
    } else {
      // Typing a digit into an already-filled box advances past it
      next[index] = digit;
    }
    commit(next);
    if (digit !== '') {
      const target = Math.min(index + 1, length - 1);
      refs.current[target]?.focus();
      // If the user typed into the last box and digits remain in the paste
      // buffer, handlePaste takes over instead.
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        commit(next);
      } else if (index > 0) {
        next[index - 1] = '';
        commit(next);
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      refs.current[Math.max(0, index - 1)]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      refs.current[Math.min(length - 1, index + 1)]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = Array.from(e.clipboardData.getData('text'))
      .map(toAsciiDigit)
      .filter((d) => d !== '')
      .slice(0, length);
    if (pasted.length === 0) return;
    const next = Array.from({ length }, (_, i) => pasted[i] ?? '');
    commit(next);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div
      className='flex items-center justify-center gap-2'
      dir='ltr'
      role='group'
      aria-label='Verification code'
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type='text'
          inputMode='numeric'
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          dir='ltr'
          value={digit}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-11 w-10 rounded-lg border bg-background text-center text-lg font-semibold',
            'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            digit && 'border-primary/60'
          )}
        />
      ))}
    </div>
  );
};

export default OtpInput;
