import {
  checkCouponUsable,
  couponDiscount,
  normalizeCouponCode,
} from '@/lib/coupon';

const NOW = new Date('2026-08-31T12:00:00Z');

describe('checkCouponUsable', () => {
  const base = { type: 'percent', value: 10 };

  it('accepts a simple active coupon', () => {
    expect(checkCouponUsable(base, 1000000, NOW)).toEqual({ ok: true });
  });

  it('rejects inactive coupons', () => {
    expect(
      checkCouponUsable({ ...base, isActive: false }, 1000000, NOW)
    ).toEqual({ ok: false, error: 'couponInactive' });
  });

  it('rejects expired coupons', () => {
    expect(
      checkCouponUsable(
        { ...base, expiresAt: '2026-08-31T00:00:00Z' },
        1000000,
        NOW
      )
    ).toEqual({ ok: false, error: 'couponExpired' });
  });

  it('accepts coupons expiring in the future', () => {
    expect(
      checkCouponUsable(
        { ...base, expiresAt: '2026-09-30T00:00:00Z' },
        1000000,
        NOW
      ).ok
    ).toBe(true);
  });

  it('rejects when usage limit reached', () => {
    expect(
      checkCouponUsable(
        { ...base, usageLimit: 100, usedCount: 100 },
        1000000,
        NOW
      )
    ).toEqual({ ok: false, error: 'couponUsageLimit' });
  });

  it('accepts below usage limit', () => {
    expect(
      checkCouponUsable(
        { ...base, usageLimit: 100, usedCount: 99 },
        1000000,
        NOW
      ).ok
    ).toBe(true);
  });

  it('rejects when cart below minimum total', () => {
    expect(
      checkCouponUsable({ ...base, minCartTotal: 2000000 }, 1000000, NOW)
    ).toEqual({ ok: false, error: 'couponMinCart' });
  });

  it('accepts when cart meets minimum total', () => {
    expect(
      checkCouponUsable({ ...base, minCartTotal: 1000000 }, 1000000, NOW).ok
    ).toBe(true);
  });
});

describe('couponDiscount', () => {
  it('computes percent discount on the subtotal', () => {
    expect(couponDiscount('percent', 10, 1000000)).toBe(100000);
    expect(couponDiscount('percent', '25', 800000)).toBe(200000);
  });

  it('clamps percent to 0–99', () => {
    expect(couponDiscount('percent', 150, 1000000)).toBe(990000);
    expect(couponDiscount('percent', -5, 1000000)).toBe(0);
  });

  it('computes fixed discount in Toman', () => {
    expect(couponDiscount('fixed', 200000, 1000000)).toBe(200000);
  });

  it('caps fixed discount at the subtotal', () => {
    expect(couponDiscount('fixed', 5000000, 1000000)).toBe(1000000);
  });

  it('returns 0 for garbage values', () => {
    expect(couponDiscount('percent', 'abc', 1000000)).toBe(0);
    expect(couponDiscount('fixed', 0, 1000000)).toBe(0);
  });

  it('handles fractional results without FP drift', () => {
    // 15% of 999,999 = 149,999.85 exactly (2dp is correct for money)
    expect(couponDiscount('percent', 15, 999999)).toBe(149999.85);
  });
});

describe('normalizeCouponCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCouponCode('  nowruz1405  ')).toBe('NOWRUZ1405');
  });

  it('caps at 40 chars', () => {
    expect(normalizeCouponCode('x'.repeat(100)).length).toBe(40);
  });
});
