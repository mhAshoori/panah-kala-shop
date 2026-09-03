import { isSmsConfigured, sendVerificationSms } from '@/lib/sms/smsir';

describe('SMS.ir provider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SMSIR_API_KEY;
    delete process.env.SMSIR_OTP_TEMPLATE_ID;
    delete process.env.SMSIR_LINE_NUMBER;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isSmsConfigured', () => {
    it('is true with just the API key (template/line optional)', () => {
      expect(isSmsConfigured()).toBe(false);
      process.env.SMSIR_API_KEY = 'k';
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

    it('posts to the templated verify endpoint when template is set', async () => {
      process.env.SMSIR_API_KEY = 'key-1';
      process.env.SMSIR_OTP_TEMPLATE_ID = '100000';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 1, message: 'موفق' }),
      });

      const result = await sendVerificationSms('+989120000000', '042317');
      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.sms.ir/v1/send/verify');
      expect(init.headers['x-api-key']).toBe('key-1');
      const body = JSON.parse(init.body);
      expect(body.mobile).toBe('+989120000000');
      expect(body.templateId).toBe(100000);
      expect(body.parameters).toEqual([{ name: 'CODE', value: '042317' }]);
    });

    it('falls back to raw bulk when the template path fails', async () => {
      process.env.SMSIR_API_KEY = 'key-1';
      process.env.SMSIR_OTP_TEMPLATE_ID = '100000';
      process.env.SMSIR_LINE_NUMBER = '+983000505';
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 113, message: 'x' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 1, message: 'موفق' }),
        });

      const result = await sendVerificationSms('+989120000000', '042317');
      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect((global.fetch as jest.Mock).mock.calls[1][0]).toBe(
        'https://api.sms.ir/v1/send/bulk'
      );
      const body = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[1][1].body
      );
      expect(body.lineNumber).toBe('+983000505');
      expect(body.messageText).toContain('042317');
      expect(body.mobiles).toEqual(['+989120000000']);
    });

    it('uses the bulk path directly when only a line number is set', async () => {
      process.env.SMSIR_API_KEY = 'key-1';
      process.env.SMSIR_LINE_NUMBER = '+983000505';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 1, message: 'موفق' }),
      });

      const result = await sendVerificationSms('+989120000000', '042317');
      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
        'https://api.sms.ir/v1/send/bulk'
      );
    });

    it('reports failure when every configured path fails', async () => {
      process.env.SMSIR_API_KEY = 'key-1';
      process.env.SMSIR_OTP_TEMPLATE_ID = '100000';
      process.env.SMSIR_LINE_NUMBER = '+983000505';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 6, message: 'x' }),
      });

      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: false, reason: 'ارسال پیامک ناموفق بود' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('reports failure when only a broken template is configured', async () => {
      process.env.SMSIR_API_KEY = 'bad';
      process.env.SMSIR_OTP_TEMPLATE_ID = '1';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 10, message: 'x' }),
      });
      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: false, reason: 'ارسال پیامک ناموفق بود' });
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
      expect(result).toEqual({ ok: false, reason: 'ارسال پیامک ناموفق بود' });
    });

    it('maps network exceptions to a failure', async () => {
      process.env.SMSIR_API_KEY = 'k';
      process.env.SMSIR_OTP_TEMPLATE_ID = '1';
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('network down')
      );
      const result = await sendVerificationSms('+989120000000', '123456');
      expect(result).toEqual({ ok: false, reason: 'ارسال پیامک ناموفق بود' });
    });
  });
});
