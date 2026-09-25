import {
  bestVariantPercent,
  classifyProduct,
  derivePercent,
  deriveSellPrice,
  MIN_DISCOUNTABLE_PRICE,
  resolveMode,
  variantsAgree,
  warnsSmallDiscount,
} from '@/lib/discount-math';
import { getDiscount } from '@/lib/discount';

// This feature INVERTS feature 004's derivation. 004 derived the *original*
// price from a typed percentage and could floor, because flooring the original
// price makes the storefront badge read LOW. Here the admin types the base
// price and the system derives the *selling* price, so flooring pushes the
// pair the other way and the badge reads HIGH — 25% off a 49 Toman base sells
// at 36, and the badge on 36-vs-49 reads 26%.
//
// The rule is floor-then-bump: floor, then add a Toman while the badge still
// overstates. That is why deriveSellPrice exists rather than a bare Math.floor,
// and why the safety invariant below is asserted in the opposite direction to
// 004's. See specs/006-admin-discount-modes/research.md R-001.

const MAX_TOMAN = 2_147_483_647;

describe('deriveSellPrice', () => {
  it('keeps exact figures exact (quickstart Scenario 1)', () => {
    expect(deriveSellPrice(4500, 10)).toBe(4050);
    expect(deriveSellPrice(1000, 25)).toBe(750);
    expect(deriveSellPrice(100, 10)).toBe(90);
    expect(deriveSellPrice(2000, 10)).toBe(1800);
  });

  it('bumps a Toman only where a plain floor would overstate (Scenario 2)', () => {
    // 99 * 0.9 = 89.1 -> floor 89, badge 10%. Exact enough, no bump needed.
    expect(deriveSellPrice(99, 10)).toBe(89);
    // 49 * 0.75 = 36.75 -> floor 36, whose badge reads 26% against a typed
    // 25%. Bumped to 37, whose badge reads 24% — one LOW rather than one HIGH.
    expect(deriveSellPrice(49, 25)).toBe(37);
    expect(getDiscount(deriveSellPrice(49, 25)!, 49)?.percent).toBe(24);
  });

  it('treats an empty or zero percentage as no discount', () => {
    expect(deriveSellPrice(1000, 0)).toBeNull();
    expect(deriveSellPrice(1000, null)).toBeNull();
    expect(deriveSellPrice(1000, undefined)).toBeNull();
    expect(deriveSellPrice(1000, '')).toBeNull();
  });

  it('never returns zero, a negative, or a price that is not a real discount', () => {
    for (const base of [1, 2, 5, 10, 49, 99, 100, 999, 4500, 999999]) {
      for (const percent of [1, 2, 3, 5, 10, 25, 50, 75, 90, 99]) {
        const sell = deriveSellPrice(base, percent);
        if (sell == null) continue;
        expect(sell).toBeGreaterThanOrEqual(1);
        // Either a genuine discount, or null (which is what "vanished" means).
        if (sell >= base) continue;
        expect(sell).toBeLessThan(base);
      }
    }
  });

  it('refuses a percentage that cannot produce a discount at all', () => {
    // 99% of 100 is 1, which is a real price. 99% of 1 is 0.01, which whole
    // Toman cannot hold — the result is null rather than a zero-price product.
    expect(deriveSellPrice(100, 99)).toBe(1);
    expect(deriveSellPrice(1, 99)).toBeNull();
    expect(deriveSellPrice(1, 50)).toBeNull();
  });
});

describe('the inverted safety invariant (FR-008, FR-022)', () => {
  it('the badge never overstates the typed percentage', () => {
    // 004 asserted the same property in the other derivation direction and
    // found 0 violations. Here plain floor finds 668; floor-then-bump must
    // find 0. This test is the guard on the whole feature.
    let checked = 0;
    for (const base of [1, 49, 50, 99, 100, 555, 999, 1000, 4500, 32990, 999999]) {
      for (const percent of [1, 2, 3, 5, 10, 15, 25, 33, 50, 75, 90, 99]) {
        const sell = deriveSellPrice(base, percent);
        if (sell == null) continue;
        const info = getDiscount(sell, base);
        if (!info) continue;
        checked++;
        expect(info.percent).toBeLessThanOrEqual(percent);
        expect(info.saveAmount).toBe(base - sell);
      }
    }
    // Guard against a vacuous pass: the matrix must actually exercise the
    // helper, or a broken implementation would sail through.
    expect(checked).toBeGreaterThan(100);
  });
});

describe('derivePercent — the price-mode derivation', () => {
  it('reads the percentage back out of a stored pair (quickstart Scenario 4)', () => {
    // Arguments are (base, sell) — the original first, matching how the admin
    // reads them in the form.
    expect(derivePercent(4500, 3900)).toBe(13);
    expect(derivePercent(1111, 1000)).toBe(9);
    expect(derivePercent(1492535, 999999)).toBe(32);
  });

  it('returns null when there is no discount', () => {
    expect(derivePercent(1000, 1000)).toBeNull();
    expect(derivePercent(1000, 1100)).toBeNull();
  });

  it('agrees with getDiscount on the same pair', () => {
    for (const [base, sell] of [
      [4500, 4050],
      [1000, 750],
      [100, 90],
      [4500, 3900],
    ]) {
      expect(derivePercent(base, sell)).toBe(
        getDiscount(sell, base)?.percent ?? null
      );
    }
  });
});

describe('resolveMode', () => {
  // Arguments follow the stored-column order: sell is Product.price, base is
  // Product.compareAtPrice. A pair of (4500, 3900) would be a price INCREASE,
  // not a discount, and is not a valid stored pair at all.
  it('picks percent mode only when the pair round-trips exactly', () => {
    // sell 3900 / base 4500 is 13%, which re-derives 3915 — so this pair loads
    // in PRICE mode, the mode that reproduces the admin's typed numbers.
    expect(resolveMode(3900, 4500)).toBe('price');
    // sell 4050 / base 4500 is exactly 10% and re-derives to itself.
    expect(resolveMode(4050, 4500)).toBe('percent');
  });

  it('reports no discount when there is no original price', () => {
    expect(resolveMode(4500, null)).toBe('none');
    expect(resolveMode(4500, undefined)).toBe('none');
  });

  it('does not claim a discount for a stored pair that is a price increase', () => {
    // cmp <= price is not a discount, so nothing to re-derive.
    expect(resolveMode(4500, 3900)).toBe('none');
  });
});

describe('variantsAgree', () => {
  it('is true when every ratio is identical', () => {
    expect(
      variantsAgree([
        { price: 1000, compareAtPrice: 1111 },
        { price: 1000, compareAtPrice: 1111 },
      ])
    ).toBe(true);
  });

  it('is false when some variants carry no discount', () => {
    expect(
      variantsAgree([
        { price: 1000, compareAtPrice: 1111 },
        { price: 1000, compareAtPrice: null },
      ])
    ).toBe(false);
  });

  it('is false when the ratios differ', () => {
    expect(
      variantsAgree([
        { price: 1000, compareAtPrice: 1111 },
        { price: 2000, compareAtPrice: 2500 },
      ])
    ).toBe(false);
  });

  it('compares ratios exactly, where a float equality would fail', () => {
    // sell 3,900 / base 4,500 and sell 7,800 / base 9,000 are the same ratio
    // written in different wholes. As floats 3900/4500 and 7800/9000 do happen
    // to match, but that is luck of representation; cross-multiplication is
    // the only form guaranteed to hold. research.md R-003.
    expect(
      variantsAgree([
        { price: 3900, compareAtPrice: 4500 },
        { price: 7800, compareAtPrice: 9000 },
      ])
    ).toBe(true);
  });

  it('returns false rather than a precision-lost answer near the ceiling', () => {
    // 2.1e9 * 2.1e9 = 4.6e18, past Number.MAX_SAFE_INTEGER (9.0e15), where
    // Number silently loses integer precision. Disagreement is the safe
    // direction. research.md R-004.
    expect(
      variantsAgree([
        { price: MAX_TOMAN - 1, compareAtPrice: MAX_TOMAN },
        { price: MAX_TOMAN - 2, compareAtPrice: MAX_TOMAN - 1 },
      ])
    ).toBe(false);
  });
});

describe('classifyProduct (quickstart Scenario 6)', () => {
  it('reports no discount when no variant is discounted', () => {
    expect(classifyProduct([{ price: 1000, compareAtPrice: null }])).toBe(
      'noDiscount'
    );
    expect(
      classifyProduct([
        { price: 1000, compareAtPrice: null },
        { price: 2000, compareAtPrice: null },
      ])
    ).toBe('noDiscount');
  });

  it('reports a uniform discount when every ratio agrees', () => {
    expect(
      classifyProduct([
        { price: 1000, compareAtPrice: 1111 },
        { price: 1000, compareAtPrice: 1111 },
      ])
    ).toBe('uniformDiscount');
    expect(
      classifyProduct([
        { price: 3900, compareAtPrice: 4500 },
        { price: 7800, compareAtPrice: 9000 },
      ])
    ).toBe('uniformDiscount');
  });

  it('reports a partial discount when the ratios disagree or are missing', () => {
    expect(
      classifyProduct([
        { price: 1000, compareAtPrice: 1111 },
        { price: 1000, compareAtPrice: null },
      ])
    ).toBe('partialDiscount');
    expect(
      classifyProduct([
        { price: 1000, compareAtPrice: 1111 },
        { price: 2000, compareAtPrice: 2500 },
      ])
    ).toBe('partialDiscount');
  });
});

describe('bestVariantPercent', () => {
  it('reports the strongest discount across the purchasable variants', () => {
    // Reporting the strongest is a true statement about the product as a
    // whole: some combination really is available at that discount. Reporting
    // the product-level pair instead would advertise a number no single
    // variant necessarily carries.
    expect(
      bestVariantPercent([
        { price: 1979100, compareAtPrice: 2199000 },
        { price: 1649250, compareAtPrice: 2199000 },
        { price: 2199000, compareAtPrice: null },
      ])
    ).toBe(25);
  });

  it('returns null when nothing is discounted', () => {
    expect(bestVariantPercent([{ price: 1000, compareAtPrice: null }])).toBeNull();
    expect(bestVariantPercent([])).toBeNull();
  });
});

describe('warnsSmallDiscount — advisory, never a gate (R-008, FR-019)', () => {
  it('warns below 1 percent and below the 100 Toman base', () => {
    expect(warnsSmallDiscount(4500, 10)).toBe(false);
    expect(warnsSmallDiscount(100, 10)).toBe(false);
    expect(warnsSmallDiscount(50, 1)).toBe(true);
    expect(warnsSmallDiscount(99, 10)).toBe(true);
    expect(warnsSmallDiscount(4500, 0.5)).toBe(true);
  });

  it('is derived from the same threshold the derivation no longer enforces', () => {
    expect(MIN_DISCOUNTABLE_PRICE).toBe(100);
  });
});
