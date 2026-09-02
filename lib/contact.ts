import { normalizeIranMobile } from './phone';
import {
  checkPendingOtp,
  setPendingOtp,
  generateOtpCode,
} from './otp';
import { sendVerificationSms } from './sms/smsir';
import { sendVerificationEmail } from './email/mailer';

/**
 * Contact-change verification (profile email/mobile swap).
 *
 * Two codes are always required:
 *   1. previous contact code — proves ownership of the old contact
 *   2. new contact code      — proves ownership of the new contact
 *
 * Codes are generated per request, delivered via SMS.ir / SMTP, stored only
 * in a process-local TTL map (lib/otp.ts) and consumed on first successful
 * check. Without an SMS/SMTP provider configured (local dev, CI) the fixed
 * master codes 123456 (previous) / 456789 (new) are accepted instead.
 */

export const DEV_OLD_CONTACT_CODE = '123456';
export const DEV_NEW_CONTACT_CODE = '456789';

export type ContactType = 'email' | 'mobile';

export type ContactChangeInput = {
  type: ContactType;
  oldCode: string;
  newValue: string;
  newCode: string;
  /** Cached current contact of the signed-in user (E.164 phone or email). */
  currentValue: string | null;
};

export type ContactChangeResult =
  | { ok: true; value: string }
  | {
      ok: false;
      messageKey:
        | 'contactOldCodeInvalid'
        | 'contactNewCodeInvalid'
        | 'invalidEmail'
        | 'invalidPhone';
    };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Contact-value key for the pending-code map (stable, normalized). */
export function contactKey(type: ContactType, value: string): string {
  return type === 'email'
    ? `contact:email:${value.trim().toLowerCase()}`
    : `contact:mobile:${normalizeIranMobile(value) ?? value.trim()}`;
}

/**
 * Issue + deliver a verification code for one side of a contact change.
 * Returns the plain success flag; the code itself never leaves the server.
 */
export async function issueContactCode(
  type: ContactType,
  side: 'old' | 'new',
  contact: string
): Promise<boolean> {
  if (!contact) return false;

  // Dev/CI: no provider — the fixed master code is accepted at verify time.
  if (!isProviderConfiguredFor(type)) {
    setPendingOtp(contactKey(type, contact), side === 'old' ? DEV_OLD_CONTACT_CODE : DEV_NEW_CONTACT_CODE);
    return true;
  }

  const code = generateOtpCode();
  const key = contactKey(type, contact);
  setPendingOtp(key, code);

  if (type === 'mobile') {
    const phone = normalizeIranMobile(contact);
    if (!phone) return false;
    const sent = await sendVerificationSms(phone, code);
    return sent.ok;
  }

  const sent = await sendVerificationEmail({
    to: contact.trim().toLowerCase(),
    code,
    kind: 'contact-change',
  });
  return sent.ok;
}

function isProviderConfiguredFor(type: ContactType): boolean {
  if (type === 'mobile') {
    return Boolean(process.env.SMSIR_API_KEY && process.env.SMSIR_OTP_TEMPLATE_ID);
  }
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

/** Verify one side of a contact change against the pending map. */
export function verifyContactCode(
  type: ContactType,
  side: 'old' | 'new',
  contact: string | null,
  code: string
): boolean {
  const trimmed = (code || '').trim();
  // A code must always be bound to a contact — nothing to verify against otherwise
  if (!trimmed || !contact) return false;

  // Dev master codes keep local dev/CI workable without providers.
  // The side-specific master must match its own slot (old≠new).
  const expectedMaster = side === 'old' ? DEV_OLD_CONTACT_CODE : DEV_NEW_CONTACT_CODE;
  if (!isProviderConfiguredFor(type) && trimmed === expectedMaster) {
    return true;
  }

  return checkPendingOtp(contactKey(type, contact), trimmed);
}

/**
 * Pure validation for a contact (email/mobile) change:
 *  - previous-contact code must match (proves ownership of the old contact)
 *  - new-contact code must match (proves ownership of the new contact)
 *  - the new value must be well-formed
 */
export function validateContactChange(
  input: ContactChangeInput
): ContactChangeResult {
  const oldValid = verifyContactCode(
    input.type,
    'old',
    input.currentValue ?? null,
    input.oldCode
  );
  if (!oldValid) {
    return { ok: false, messageKey: 'contactOldCodeInvalid' };
  }

  const newValid = verifyContactCode(
    input.type,
    'new',
    input.newValue ?? null,
    input.newCode
  );
  if (!newValid) {
    return { ok: false, messageKey: 'contactNewCodeInvalid' };
  }

  const value = (input.newValue || '').trim();

  if (input.type === 'email') {
    if (!isValidEmail(value)) {
      return { ok: false, messageKey: 'invalidEmail' };
    }
    return { ok: true, value: value.toLowerCase() };
  }

  const normalized = normalizeIranMobile(value);
  if (!normalized) {
    return { ok: false, messageKey: 'invalidPhone' };
  }
  // Strip +98 for storage consistency with the auth flow
  return { ok: true, value: normalized.replace('+98', '') };
}
