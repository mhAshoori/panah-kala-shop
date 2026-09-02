import { isSmsConfigured, sendVerificationSms } from '@/lib/sms/smsir';

describe('SMS.ir provider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SMSIR_API_KEY;
    delete process.env.SMSIR_OTP_TEMPLATE_ID;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isSmsConfigured', () => {
    it('is false without both env vars', () => {
      expect(isSmsConfigured()).toBe(false);
      process.env.SMSIR_API_KEY = 'k';
      expect(isSmsConfigured()).toBe(false);
      process.env.SMSIR_OTP_TEMPLATE_ID = '100000';
      expect(isSmsConfigured()).toBe(true);
    });
  });

  describe('sendVerificationSms', () => {
    it('falls back to console delivery when unconfigured', async () => {
      const logSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: true });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('123456')
      );
      logSpy.mockRestore();
    });

    it('posts to the verified endpoint with the documented contract', async () => {
      process.env.SMSIR_API_KEY = 'key-1';
      process.env.SMSIR_OTP_TEMPLATE_ID = '100000';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 1, message: 'موفق' }),
      });

      const result = await sendVerificationSms('+989120000000', '042317');
      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.sms.ir/v1/send/verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'key-1',
            'Content-Type': 'application/json',
          }),
        })
      );
      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body
      );
      expect(body.mobile).toBe('+989120000000');
      expect(body.templateId).toBe(100000);
      expect(body.parameters).toEqual([{ name: 'CODE', value: '042317' }]);
    });

    it('maps non-1 status to a failure with a known message', async () => {
      process.env.SMSIR_API_KEY = 'bad';
      process.env.SMSIR_OTP_TEMPLATE_ID = '1';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 10, message: 'x' }),
      });
      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: false, reason: 'کلید وب سرویس نامعتبر است' });
    });

    it('maps HTTP errors to a failure', async () => {
      process.env.SMSIR_API_KEY = 'bad';
      process.env.SMSIR_OTP_TEMPLATE_ID = '1';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => null,
      });
      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: false, reason: 'HTTP 500' });
    });

    it('maps network exceptions to a failure', async () => {
      process.env.SMSIR_API_KEY = 'k';
      process.env.SMSIR_OTP_TEMPLATE_ID = '1';
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('network down')
      );
      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: false, reason: 'network down' });
    });
  });
});
