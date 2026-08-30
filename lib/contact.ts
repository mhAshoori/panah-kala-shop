import { normalizeIranMobile } from './phone';

/**
 * Contact-change verification (mock stage).
 *
 * Real services will generate and deliver these codes; they are NEVER
 * stored in the database. For now:
 *   - previous contact code: 123456
 *   - new contact code:      456789
 */
export const MOCK_OLD_CONTACT_CODE = '123456';
export const MOCK_NEW_CONTACT_CODE = '456789';

export type ContactType = 'email' | 'mobile';

export type ContactChangeInput = {
  type: ContactType;
  oldCode: string;
  newValue: string;
  newCode: string;
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

/**
 * Pure validation for a contact (email/mobile) change:
 *  - previous-contact code must match (proves ownership of the old contact)
 *  - new-contact code must match (proves ownership of the new contact)
 *  - the new value must be well-formed
 */
export function validateContactChange(
  input: ContactChangeInput
): ContactChangeResult {
  const oldCode = (input.oldCode || '').trim();
  const newCode = (input.newCode || '').trim();

  if (oldCode !== MOCK_OLD_CONTACT_CODE) {
    return { ok: false, messageKey: 'contactOldCodeInvalid' };
  }
  if (newCode !== MOCK_NEW_CONTACT_CODE) {
    return { ok: false, messageKey: 'contactNewCodeInvalid' };
  }

  const value = (input.newValue || '').trim();

  if (input.type === 'email') {
    if (!isValidEmail(value)) {
      return { ok: false, messageKey: 'invalidEmail' };
    }
    return { ok: true, value };
  }

  const normalized = normalizeIranMobile(value);
  if (!normalized) {
    return { ok: false, messageKey: 'invalidPhone' };
  }
  // Strip +98 for storage consistency with the auth flow
  return { ok: true, value: normalized.replace('+98', '') };
}
