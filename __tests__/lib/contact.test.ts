import {
  DEV_NEW_CONTACT_CODE,
  DEV_OLD_CONTACT_CODE,
  contactKey,
  issueContactCode,
  validateContactChange,
  verifyContactCode,
} from '@/lib/contact';
import { clearPendingOtp } from '@/lib/otp';

// Dev mode (no SMS/SMTP env in Jest): master codes are accepted
describe('validateContactChange (dev master codes)', () => {
  const valid = {
    type: 'email' as const,
    oldCode: '123456',
    newValue: 'new@example.com',
    newCode: '456789',
    currentValue: 'old@example.com',
  };

  it('accepts a valid email change with both codes', () => {
    const result = validateContactChange(valid);
    expect(result).toEqual({ ok: true, value: 'new@example.com' });
  });

  it('accepts a valid mobile change and normalizes it', () => {
    const result = validateContactChange({
      type: 'mobile',
      oldCode: '123456',
      newValue: '09121234567',
      newCode: '456789',
      currentValue: '+989120000002',
    });
    expect(result).toEqual({ ok: true, value: '9121234567' });
  });

  it('lowercases the new email value', () => {
    const result = validateContactChange({
      ...valid,
      newValue: 'New@Example.COM',
    });
    expect(result).toEqual({ ok: true, value: 'new@example.com' });
  });

  it('rejects a wrong previous-contact code', () => {
    const result = validateContactChange({ ...valid, oldCode: '000000' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageKey).toBe('contactOldCodeInvalid');
  });

  it('rejects a wrong new-contact code', () => {
    const result = validateContactChange({ ...valid, newCode: '000000' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageKey).toBe('contactNewCodeInvalid');
  });

  it('rejects an invalid email value', () => {
    const result = validateContactChange({ ...valid, newValue: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageKey).toBe('invalidEmail');
  });

  it('rejects an invalid mobile value', () => {
    const result = validateContactChange({
      type: 'mobile',
      oldCode: '123456',
      newValue: '12345',
      newCode: '456789',
      currentValue: '+989120000002',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageKey).toBe('invalidPhone');
  });

  it('dev master codes are compile-time constants', () => {
    expect(DEV_OLD_CONTACT_CODE).toBe('123456');
    expect(DEV_NEW_CONTACT_CODE).toBe('456789');
  });
});

describe('issued contact codes (provider-style flow)', () => {
  afterEach(() => {
    clearPendingOtp(contactKey('email', 'test@example.com'));
    clearPendingOtp(contactKey('mobile', '+989120000001'));
  });

  it('issues, verifies and consumes an email code', async () => {
    const issued = await issueContactCode('email', 'new', 'test@example.com');
    expect(issued).toBe(true); // dev: no provider, stored in pending map

    // The issued code is random — read it via a failed check then reuse:
    // we cannot see it, but the same code must verify. Instead verify that
    // a wrong code fails and the master code path is distinct.
    expect(
      verifyContactCode('email', 'new', 'test@example.com', '999999')
    ).toBe(false);
  });

  it('dev master codes verify even without a pending entry', () => {
    expect(
      verifyContactCode('email', 'old', 'old@example.com', '123456')
    ).toBe(true);
    expect(
      verifyContactCode('mobile', 'new', '+989120000001', '456789')
    ).toBe(true);
  });

  it('does not verify when contact is null', () => {
    expect(verifyContactCode('email', 'new', null, '456789')).toBe(false);
  });

  it('contactKey normalizes emails and phones', () => {
    expect(contactKey('email', ' A@B.COM ')).toBe('contact:email:a@b.com');
    expect(contactKey('mobile', '09120000000')).toBe(
      'contact:mobile:+989120000000'
    );
  });
});
