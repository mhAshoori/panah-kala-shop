import { deriveCompareAtPrice, percentToDiscount } from '@/lib/discount-math';
import { getDiscount } from '@/lib/discount';

// The whole reason this helper exists. `compareAtPrice` is derived from a
// typed percentage, and the derivation floors so the pair can only ever
// understate the typed percentage — the storefront badge is then
// `floor((cmp - price) / cmp * 100)` and can never promise a saving larger
// than the one the shopper actually gets.
//
// The 100 Toman floor solves a *different* problem: below it a typed
// percentage can round away to nothing, and the badge silently disappears.
// See specs/004-product-required-discount/research.md R-001.

const MAX_TOMAN = 2_147_483_647;

describe('deriveCompareAtPrice', () => {
  it('floors the derived price-before-discount', () => {
    expect(deriveCompareAtPrice(1000, 10)).toEqual({ ok: true, compareAtPrice: 1111 });
    expect(deriveCompareAtPrice(1000, 25)).toEqual({ ok: true, compareAtPrice: 1333 });
    expect(deriveCompareAtPrice(2000, 10)).toEqual({ ok: true, compareAtPrice: 2222 });
  });

  it('treats an empty or zero percentage as no discount', () => {
    expect(deriveCompareAtPrice(1000, 0)).toEqual({ ok: true, compareAtPrice: null });
    expect(deriveCompareAtPrice(1000, null)).toEqual({ ok: true, compareAtPrice: null });
    expect(deriveCompareAtPrice(1000, undefined)).toEqual({ ok: true, compareAtPrice: null });
  });

  it('refuses a percentage of 100 or more', () => {
    expect(deriveCompareAtPrice(1000, 100)).toEqual({ ok: false, error: 'percentOutOfRange' });
    expect(deriveCompareAtPrice(1000, 120)).toEqual({ ok: false, error: 'percentOutOfRange' });
  });

  it('refuses a discount on a product below the 100 Toman floor', () => {
    // A 10% discount on 50 Toman needs 55.55, which whole Toman cannot hold.
    expect(deriveCompareAtPrice(50, 10)).toEqual({ ok: false, error: 'priceTooLow' });
    expect(deriveCompareAtPrice(99, 10)).toEqual({ ok: false, error: 'priceTooLow' });
    // At exactly 100 it is allowed, even though the badge will floor to 0.
    expect(deriveCompareAtPrice(100, 1)).toEqual({ ok: true, compareAtPrice: 101 });
  });

  it('refuses a derived value that would exceed the whole-Toman ceiling', () => {
    // At 99% the largest safe price is 21,474,836 (floor(MAX * 1 / 100));
    // one Toman more derives 2,147,483,700, past the int4 maximum.
    expect(deriveCompareAtPrice(21_474_837, 99)).toEqual({ ok: false, error: 'priceTooLarge' });
    expect(deriveCompareAtPrice(21_474_836, 99)).toEqual({
      ok: true,
      compareAtPrice: 2_147_483_600,
    });
    // The ceiling is a price limit at every percentage: a 1% discount on a
    // maximum-price product derives 2,169,175,401, which also overflows.
    expect(deriveCompareAtPrice(MAX_TOMAN, 1)).toEqual({ ok: false, error: 'priceTooLarge' });
  });

  it('never produces a compareAtPrice at or below the price', () => {
    // The floor guarantee: whenever a value is produced it must be strictly
    // greater than the price, or getDiscount would return null and the badge
    // would vanish without explanation.
    for (const price of [100, 555, 999, 32990, 999999]) {
      for (const percent of [1, 5, 10, 15, 33, 50, 75, 99]) {
        const result = deriveCompareAtPrice(price, percent);
        if (!result.ok || result.compareAtPrice == null) continue;
        expect(result.compareAtPrice).toBeGreaterThan(price);
      }
    }
  });
});

describe('the safety invariant FR-013 guarantees', () => {
  it('the badge never overstates the typed percentage', () => {
    for (const price of [100, 555, 999, 32990, 999999]) {
      for (const percent of [1, 5, 10, 15, 33, 50, 75, 99]) {
        const result = deriveCompareAtPrice(price, percent);
        if (!result.ok || result.compareAtPrice == null) continue;
        const info = getDiscount(price, result.compareAtPrice);
        if (!info) continue;
        expect(info.percent).toBeLessThanOrEqual(percent);
        expect(info.saveAmount).toBe(result.compareAtPrice - price);
      }
    }
  });
});

describe('percentToDiscount', () => {
  it('reads the percentage back out of a stored pair', () => {
    // Same expression getDiscount uses, so the form and storefront agree.
    expect(percentToDiscount(1000, 1111)).toBe(9);
    expect(percentToDiscount(999999, 1492535)).toBe(32);
  });

  it('returns null when there is no discount', () => {
    expect(percentToDiscount(1000, null)).toBeNull();
    expect(percentToDiscount(1000, 1000)).toBeNull();
    expect(percentToDiscount(1000, 900)).toBeNull();
  });
});
