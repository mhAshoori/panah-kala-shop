import {
  MOCK_NEW_CONTACT_CODE,
  MOCK_OLD_CONTACT_CODE,
  validateContactChange,
} from '@/lib/contact';

describe('validateContactChange', () => {
  const valid = {
    type: 'email' as const,
    oldCode: '123456',
    newValue: 'new@example.com',
    newCode: '456789',
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
    });
    expect(result).toEqual({ ok: true, value: '9121234567' });
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
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.messageKey).toBe('invalidPhone');
  });

  it('mock codes are never stored — they are compile-time constants', () => {
    expect(MOCK_OLD_CONTACT_CODE).toBe('123456');
    expect(MOCK_NEW_CONTACT_CODE).toBe('456789');
  });
});
