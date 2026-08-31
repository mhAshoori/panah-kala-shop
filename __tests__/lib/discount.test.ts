import { getDiscount } from '@/lib/discount';

describe('getDiscount', () => {
  it('computes percent and savings from compareAtPrice', () => {
    expect(getDiscount('75000000', '100000000')).toEqual({
      percent: 25,
      saveAmount: 25000000,
    });
  });

  it('rounds percent down', () => {
    // 7.5/100 → 7.5% → floor 7
    expect(getDiscount('92500000', '100000000')?.percent).toBe(7);
  });

  it('returns null when compareAtPrice is missing', () => {
    expect(getDiscount('1000', null)).toBeNull();
    expect(getDiscount('1000', undefined)).toBeNull();
  });

  it('returns null when compareAtPrice ≤ price (no fake discounts)', () => {
    expect(getDiscount('1000', '1000')).toBeNull();
    expect(getDiscount('1000', '900')).toBeNull();
  });

  it('tolerates garbage input', () => {
    expect(getDiscount('abc', '100')).toBeNull();
    expect(getDiscount('100', 'abc')).toBeNull();
  });

  it('handles numeric inputs (DB Decimal converted)', () => {
    expect(getDiscount(68000, 80000)).toEqual({
      percent: 15,
      saveAmount: 12000,
    });
  });
});
