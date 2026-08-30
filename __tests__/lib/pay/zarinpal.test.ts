// ZarinPal client unit tests — fetch is mocked; contract per ZarinPal REST v4.
import {
  ZARINPAL_REQUEST_URL,
  ZARINPAL_VERIFY_URL,
  zarinpalRequestPayment,
  zarinpalSuccessMessage,
  zarinpalVerifyPayment,
} from '@/lib/pay/zarinpal';
import { ZARINPAL_MERCHANT_ID } from '@/lib/pay/config';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
});

describe('zarinpalRequestPayment', () => {
  it('returns authority + StartPay URL on code 100', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: { code: 100, message: 'Success', authority: 'A0000XYZ' },
        errors: [],
      }),
    });

    const result = await zarinpalRequestPayment({
      amount: 500000,
      description: 'Order 1234',
      callback_url: 'https://shop.example.com/api/zarinpal/callback',
    });

    expect(result).toEqual({
      success: true,
      authority: 'A0000XYZ',
      startUrl: expect.stringContaining('/pg/StartPay/A0000XYZ'),
    });
  });

  it('sends the merchant id, rounded Toman amount and IRT currency', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ data: { code: 100, authority: 'A1' } }),
    });

    await zarinpalRequestPayment({
      amount: 123456.7,
      description: 'd',
      callback_url: 'cb',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.merchant_id).toBe(ZARINPAL_MERCHANT_ID); // whatever env provides
    expect(typeof body.merchant_id).toBe('string');
    expect(body.merchant_id.length).toBeGreaterThan(0);
    expect(body.amount).toBe(123457); // rounded
    expect(body.currency).toBe('IRT');
    expect(body.callback_url).toBe('cb');
    expect(fetchMock.mock.calls[0][0]).toBe(ZARINPAL_REQUEST_URL);
  });

  it('includes mobile/email metadata only when provided', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ data: { code: 100, authority: 'A2' } }),
    });

    await zarinpalRequestPayment({
      amount: 1000,
      description: 'd',
      callback_url: 'cb',
      mobile: '+989120000001',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.mobile).toBe('+989120000001');
    expect(body.email).toBeUndefined();
  });

  it('returns failure with code/message on gateway error (-50 amount mismatch)', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {},
        errors: { code: -50, message: 'amount mismatch' },
      }),
    });

    const result = await zarinpalRequestPayment({
      amount: 1000,
      description: 'd',
      callback_url: 'cb',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(-50);
      expect(result.message).toBe('amount mismatch');
    }
  });

  it('tolerates a non-JSON gateway response', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => {
        throw new Error('bad json');
      },
    });

    const result = await zarinpalRequestPayment({
      amount: 1000,
      description: 'd',
      callback_url: 'cb',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe(-1);
  });
});

describe('zarinpalVerifyPayment', () => {
  it('accepts code 100 (verified) and returns ref_id', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: { code: 100, ref_id: 123456, card_pan: '5022**1234' },
      }),
    });

    const result = await zarinpalVerifyPayment({
      amount: 500000,
      authority: 'A0000XYZ',
    });

    expect(result).toEqual({ success: true, refId: 123456, code: 100 });
    expect(fetchMock.mock.calls[0][0]).toBe(ZARINPAL_VERIFY_URL);
  });

  it('treats code 101 (already verified) as success — idempotent verify', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ data: { code: 101, ref_id: 123456 } }),
    });

    const result = await zarinpalVerifyPayment({
      amount: 500000,
      authority: 'A0000XYZ',
    });

    expect(result.success).toBe(true);
  });

  it('rejects mismatched amount (code -50) as failure', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {},
        errors: { code: -50, message: 'مبلغ پرداخت با مبلغ درخواستی یکی نیست' },
      }),
    });

    const result = await zarinpalVerifyPayment({
      amount: 1000,
      authority: 'A0000XYZ',
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe(-50);
  });
});

describe('zarinpalSuccessMessage', () => {
  it('maps known codes to Persian messages', () => {
    expect(zarinpalSuccessMessage(100)).toBe('عملیات با موفقیت انجام شد');
    expect(zarinpalSuccessMessage(101)).toBe('تراکنش قبلاً تایید شده است');
    expect(zarinpalSuccessMessage(-50)).toContain('مبلغ پرداخت');
  });

  it('falls back to unknown-error message', () => {
    expect(zarinpalSuccessMessage(-999)).toBe('خطای ناشناخته درگاه پرداخت');
  });
});
