import {
  DEV_MASTER_CODES,
  OTP_LENGTH,
  OTP_TTL_MS,
  checkPendingOtp,
  clearPendingOtp,
  generateOtpCode,
  isDevMasterCode,
  setPendingOtp,
} from '@/lib/otp';

describe('OTP primitives', () => {
  describe('generateOtpCode', () => {
    it('produces 6-digit zero-padded codes', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateOtpCode();
        expect(code).toMatch(/^\d{6}$/);
      }
    });

    it('produces varied codes (not constant)', () => {
      const codes = new Set(Array.from({ length: 20 }, generateOtpCode));
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('pending map lifecycle', () => {
    const key = 'contact:email:test@example.com';

    beforeEach(() => clearPendingOtp(key));

    it('stores and verifies a code', () => {
      setPendingOtp(key, '042317');
      expect(checkPendingOtp(key, '042317')).toBe(true);
    });

    it('rejects a wrong code without consuming the right one', () => {
      setPendingOtp(key, '042317');
      expect(checkPendingOtp(key, '999999')).toBe(false);
      expect(checkPendingOtp(key, '042317')).toBe(true);
    });

    it('rejects after clear', () => {
      setPendingOtp(key, '042317');
      clearPendingOtp(key);
      expect(checkPendingOtp(key, '042317')).toBe(false);
    });

    it('rejects codes past the TTL (Date.now semantics)', () => {
      setPendingOtp(key, '042317');
      const realNow = Date.now;
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockImplementation(() => realNow() + OTP_TTL_MS + 1);
      expect(checkPendingOtp(key, '042317')).toBe(false);
      nowSpy.mockRestore();
    });

    it('accepts codes within the TTL window', () => {
      setPendingOtp(key, '042317');
      const realNow = Date.now;
      const nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockImplementation(() => realNow() + OTP_TTL_MS - 1_000);
      expect(checkPendingOtp(key, '042317')).toBe(true);
      nowSpy.mockRestore();
    });
  });

  describe('dev master codes', () => {
    it('are only valid when SMS is unconfigured', () => {
      // Jest env has no SMSIR_* vars → unconfigured
      expect(isDevMasterCode('123456')).toBe(true);
      expect(isDevMasterCode('456789')).toBe(true);
      expect(isDevMasterCode('000000')).toBe(false);
    });

    it('exposes exactly the two dev codes', () => {
      expect(DEV_MASTER_CODES).toEqual(['123456', '456789']);
    });

    it('uses 6-digit codes', () => {
      expect(OTP_LENGTH).toBe(6);
    });
  });
});
