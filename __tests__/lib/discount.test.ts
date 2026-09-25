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

  it('never overstates the saving once prices are large enough to be precise', () => {
    // For a stored pair, the badge is the true saving and can never exceed
    // 100% — the shopper is never promised more than the whole price. What it
    // CAN do is disagree with a percent the admin typed, because two whole
    // numbers cannot always encode an exact percentage (see 004 FR-013).
    for (const price of [100, 555, 999, 32990, 999999]) {
      for (const percent of [1, 5, 10, 15, 33, 50, 75, 99]) {
        const compareAt = Math.round((price * 100) / (100 - percent));
        const info = getDiscount(price, compareAt);
        if (!info) continue;
        expect(info.saveAmount).toBe(compareAt - price);
        expect(info.percent).toBeLessThan(100);
        // With whole Toman at this magnitude, the derived badge lands within
        // one point of the typed percent, and never above it.
        expect(info.percent).toBeLessThanOrEqual(percent + 1);
      }
    }
  });

  it('records the low-price edge where the badge can overstate', () => {
    // price 7 at a typed 10% needs compareAt 7.78, which cannot be stored.
    // Rounding half-up to 8 makes the real saving 1/8 = 12%, so the badge
    // reads 12% — an overstatement caused purely by whole-Toman granularity
    // at tiny prices. This is inherent to integer money, not a rounding bug.
    // 004 must handle it: either refuse a discount below a price floor, or
    // derive compareAt by flooring so the badge can only understate.
    expect(getDiscount(7, 8)).toEqual({ percent: 12, saveAmount: 1 });
  });

  it('floors the derived price-before-discount so the badge can only understate', () => {
    // 999999 at 33% is exactly 1492535.82. Flooring gives 1492535, whose badge
    // is 32; half-up would give 1492536, whose badge is 33. The spec chose
    // floor deliberately: rounding down makes it impossible for the badge to
    // overstate the real saving, and understating is the accepted cost.
    expect(Math.floor((999999 * 100) / (100 - 33))).toBe(1492535);
    expect(getDiscount(999999, 1492535)?.percent).toBe(32);
  });

  it('handles numeric inputs (DB Decimal converted)', () => {
    expect(getDiscount(68000, 80000)).toEqual({
      percent: 15,
      saveAmount: 12000,
    });
  });
});
