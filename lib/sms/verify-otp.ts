import { createHash } from 'crypto';
import { prisma } from '@/db/prisma';
import { isSmsConfigured } from './smsir';

/**
 * Single-use SMS OTP verification.
 *
 * Split into a non-consuming check and a consuming consume because sign-up
 * needs BOTH in one request: `checkSmsOtp` authorizes creating the account, and
 * `consumeSmsOtp` then spends the code when the session is established. When one
 * function did both, the second call always failed against an already-deleted
 * row — which is why phone sign-up silently produced no session in production.
 *
 * Codes are stored SHA-256 hashed (same scheme as password-reset tokens) and the
 * `expires` column is now actually read, so a code past its lifetime is refused.
 * Dev/CI keeps the fixed master code 123456 when no SMS provider is configured.
 */

export type OtpVerdict =
  /** A matching, unexpired code exists. */
  | 'valid'
  /** No matching code: wrong value, wrong number, or already consumed. */
  | 'invalid'
  /** The code existed but its lifetime has elapsed. */
  | 'expired';

/** Namespaced so OTP codes can never satisfy a password-reset lookup. */
export function otpIdentifier(phone: string): string {
  return `otp:${phone}`;
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function isExpired(expires: Date): boolean {
  return expires.getTime() <= Date.now();
}

/**
 * Verify without consuming. Answers "may this action proceed?" without spending
 * the credential, so the same code can still establish a session afterwards.
 */
export async function checkSmsOtp(phone: string, code: string): Promise<OtpVerdict> {
  if (!isSmsConfigured() && code === '123456') return 'valid';

  try {
    const row = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: otpIdentifier(phone), token: hashOtp(code) } },
      select: { expires: true },
    });
    if (!row) return 'invalid';
    return isExpired(row.expires) ? 'expired' : 'valid';
  } catch {
    return 'invalid';
  }
}

/**
 * Verify and delete in one operation. Single-use is structural: the row is gone
 * after this returns 'valid', so a second call can only return 'invalid'.
 *
 * Call at most once per attempt — at the point the session is actually created.
 */
export async function consumeSmsOtp(phone: string, code: string): Promise<OtpVerdict> {
  if (!isSmsConfigured() && code === '123456') return 'valid';

  try {
    const deleted = await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: otpIdentifier(phone), token: hashOtp(code) } },
      select: { expires: true },
    });
    // Refusing AFTER the delete is deliberate: an expired code must be
    // unreusable too, and the delete is what makes the check atomic.
    return isExpired(deleted.expires) ? 'expired' : 'valid';
  } catch {
    return 'invalid';
  }
}
