import { randomInt } from 'node:crypto';
import { isSmsConfigured } from './sms/smsir';

/**
 * One-time code generation + in-memory delivery channel for contact-change
 * verification (profile email/mobile swap). Phone OTP sign-in uses
 * VerificationToken rows; contact-change codes never touch the DB (they must
 * not outlive the request in a way a DB leak could expose them), so a
 * process-local map with short TTL is used. Dev/CI without SMS configured
 * still works via the fixed 123456/456789 master codes.
 */

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_LENGTH = 6;

// Legacy master codes — kept ONLY when no SMS provider is configured, so
// local dev and CI remain testable. Never valid in production.
export const DEV_MASTER_CODES = ['123456', '456789'];

export function smsConfiguredForOtp(): boolean {
  return isSmsConfigured();
}

/** Cryptographically random 6-digit code as a string (leading zeros kept). */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

type PendingEntry = { code: string; expiresAt: number };

const pending = new Map<string, PendingEntry>();

const sweep = (now: number) => {
  for (const [k, v] of pending) {
    if (v.expiresAt <= now) pending.delete(k);
  }
};

/**
 * Store a pending contact-change code. Keyed by `purpose:contact` where
 * purpose is old/new + the normalized contact value.
 */
export function setPendingOtp(key: string, code: string): void {
  sweep(Date.now());
  pending.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS });
}

/** Check + consume a pending contact-change code (one attempt per code). */
export function checkPendingOtp(key: string, code: string): boolean {
  const entry = pending.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    pending.delete(key);
    return false;
  }
  return entry.code === code;
}

export function clearPendingOtp(key: string): void {
  pending.delete(key);
}

/** True when the given code should be accepted as a master code in dev. */
export function isDevMasterCode(code: string): boolean {
  return !smsConfiguredForOtp() && DEV_MASTER_CODES.includes(code);
}
