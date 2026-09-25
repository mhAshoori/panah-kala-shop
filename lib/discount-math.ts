// Pure discount derivation shared by the admin product form and the variant
// editor. No imports, no DOM, no server code — so the rounding and floor rules
// can be tested directly (see __tests__/lib/discount-math.test.ts).
//
// Money is whole Toman (int4). That grid cannot represent every percentage
// exactly, so the derivation FLOORS: rounding down makes it impossible for the
// stored pair to imply a discount larger than the one that was typed, and the
// badge (floor((cmp - price) / cmp * 100)) can only ever understate.

/** Postgres int4 ceiling — the largest whole Toman value a column can hold. */
export const MAX_TOMAN = 2_147_483_647;

/** A typed discount is refused below this, because a small percentage on a
 *  small price rounds away to nothing and the badge silently disappears. */
export const MIN_DISCOUNTABLE_PRICE = 100;

export type DiscountError =
  | 'percentOutOfRange'
  | 'priceTooLow'
  | 'priceTooLarge';

// Discriminated on `ok` so callers can narrow without casting: the admin form
// reads `result.ok ? result.compareAtPrice : result.error`.
export type DeriveResult =
  | { ok: true; compareAtPrice: number | null }
  | { ok: false; error: DiscountError };

/**
 * Derive the price-before-discount that a typed discount percentage implies.
 *
 * Returns `{ compareAtPrice: null }` for no discount (empty or zero percent),
 * or `{ error }` for a discount that whole Toman cannot store honestly.
 */
export function deriveCompareAtPrice(
  price: number | string,
  percent: number | string | null | undefined
): DeriveResult {
  const p = Number(price);

  // No discount requested. Checked before validation so an empty form field
  // on a product priced below the floor is not itself an error.
  if (percent === null || percent === undefined || percent === '') {
    return { ok: true, compareAtPrice: null };
  }
  const pct = Number(percent);
  if (!Number.isFinite(p) || !Number.isFinite(pct) || pct === 0) {
    return { ok: true, compareAtPrice: null };
  }
  if (pct >= 100) return { ok: false, error: 'percentOutOfRange' };
  if (p < MIN_DISCOUNTABLE_PRICE) return { ok: false, error: 'priceTooLow' };

  const compareAtPrice = Math.floor((p * 100) / (100 - pct));
  if (!Number.isFinite(compareAtPrice) || compareAtPrice > MAX_TOMAN) {
    return { ok: false, error: 'priceTooLarge' };
  }
  return { ok: true, compareAtPrice };
}

/**
 * Read the percentage back out of a stored price/compareAtPrice pair, so the
 * edit form can pre-fill the field with what the storefront actually shows.
 * Uses the same expression as getDiscount, so the two cannot disagree.
 */
export function percentToDiscount(
  price: number | string,
  compareAtPrice: number | string | null | undefined
): number | null {
  if (compareAtPrice === null || compareAtPrice === undefined) return null;
  const p = Number(price);
  const cmp = Number(compareAtPrice);
  if (!Number.isFinite(p) || !Number.isFinite(cmp) || cmp <= p) return null;
  return Math.floor(((cmp - p) / cmp) * 100);
}
