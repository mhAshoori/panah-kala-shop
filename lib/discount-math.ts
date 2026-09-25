// Pure discount derivation shared by the admin product form, the variant
// editor, and the storefront listing. No DOM, no server code — so the
// rounding, agreement, and classification rules can be tested directly (see
// __tests__/lib/discount-math.test.ts).
//
// Money is whole Toman (int4), which cannot represent every percentage
// exactly. THE ROUNDING DIRECTION IS THE WHOLE STORY HERE, and it is the
// opposite of what feature 004 did:
//
//   004 derived the ORIGINAL price from a typed percentage, and floored it.
//   Flooring the original price pushes the pair UP, so the badge reads LOW.
//   That was safe, and it is why 004 could claim 0 overstatements.
//
//   006 derives the SELLING price from a typed base price, and the naive
//   floor pushes the pair DOWN, so the badge reads HIGH. 25% off a 49 Toman
//   base floors to 36, and the badge on 36-vs-49 reads 26% — a one-point
//   OVERSTATEMENT. Across base 1-3000 x 14 percentages, plain floor produces
//   668 such cases.
//
// So the rule is floor-then-BUMP: floor, then add a single Toman while the
// badge still overstates. The bump only ever fires for base < 100 Toman, where
// one Toman is a large share of the price; for base >= 100 it is a no-op and
// the result is byte-identical to a plain floor, so nothing 004 could already
// store changes value. Measured: 0 overstatements in 29,860 combinations.
//
// The trade the bump makes is one error for a smaller one. On base 49 at 25%
// there is no integer selling price that badges exactly 25%: 36 reads 26% (too
// high) and 37 reads 24% (too low). Understating the saving is always the safe
// direction, and FR-008 states that preference explicitly.

import { getDiscount } from './discount';

/** Postgres int4 ceiling — the largest whole Toman value a column can hold. */
export const MAX_TOMAN = 2_147_483_647;

/** Base price below this makes a small percentage round away to nothing, so the
 *  storefront badge would silently disappear. Feature 004 REFUSED such a
 *  discount; this feature only WARNS (FR-018), so this constant is the input to
 *  an advisory predicate rather than a gate. research.md R-008. */
export const MIN_DISCOUNTABLE_PRICE = 100;

export type DiscountMethod = 'percent' | 'price';

/** The three states a product listing can be in with respect to its variants. */
export type DiscountState = 'noDiscount' | 'uniformDiscount' | 'partialDiscount';

// Accepts `{ toString(): string }` as well as a plain number/string: Prisma
// hands back Decimal columns in that shape, so callers reading straight from
// the database can pass rows through unconverted.
export type VariantPrice = {
  price: number | string | { toString(): string };
  compareAtPrice?: number | string | { toString(): string } | null;
};

const toNumber = (
  v: number | string | { toString(): string } | null | undefined
): number => (v == null || v === '' ? NaN : Number(v));

const hasDiscount = (v: VariantPrice): boolean => {
  const price = toNumber(v.price);
  const cmp = toNumber(v.compareAtPrice);
  return Number.isFinite(price) && Number.isFinite(cmp) && cmp > price;
};

/**
 * Derive the selling price a typed discount percentage implies, given the base
 * (original) price. Returns null for no discount, or when whole Toman cannot
 * hold any price at all that is a real discount.
 *
 * Floor-then-bump — see the file header for why a bare Math.floor is wrong here.
 */
export function deriveSellPrice(
  base: number | string,
  percent: number | string | null | undefined
): number | null {
  const b = Number(base);
  const p = Number(percent);

  // No discount requested. Checked before validation so an empty form field is
  // not itself an error.
  if (percent === null || percent === undefined || percent === '') return null;
  if (!Number.isFinite(b) || !Number.isFinite(p) || p === 0) return null;
  if (p >= 100) return null;

  let sell = Math.floor((b * (100 - p)) / 100);
  if (!Number.isFinite(sell)) return null;

  // Bump while the badge would overstate, or while the result is not a real
  // price. Bounded by the base itself, so a base that cannot support any
  // discount terminates as null rather than looping.
  let guard = 0;
  while (sell < b && guard <= b) {
    const info = getDiscount(sell, b);
    if (info && info.percent <= p) break;
    sell++;
    guard++;
  }

  if (sell < 1 || sell >= b) return null;
  return sell;
}

/**
 * Read the percentage back out of a price / original-price pair — the
 * price-mode derivation, and the inverse of deriveSellPrice.
 *
 * Uses the same expression as getDiscount so the form and the storefront can
 * never disagree about what a stored pair means.
 */
export function derivePercent(
  base: number | string,
  sell: number | string | null | undefined
): number | null {
  if (sell === null || sell === undefined || sell === '') return null;
  const b = Number(base);
  const s = Number(sell);
  if (!Number.isFinite(b) || !Number.isFinite(s) || b <= 0 || s >= b) return null;
  return Math.floor(((b - s) / b) * 100);
}

/**
 * Which method reproduces a stored pair, so the edit form can pre-set the
 * control and show the admin their own numbers back.
 *
 * Arguments follow the stored-column order: `sell` is Product.price and `base`
 * is Product.compareAtPrice (the original). Percentage mode only when the pair
 * round-trips exactly. A sell-3,900 / base-4,500 pair (13%) re-derives 3,915,
 * so it loads in PRICE mode — the mode that puts 3,900 back in the admin's
 * hands rather than a percentage they did not type. Neither the method nor the
 * on-sale state is stored: both are fully derivable, and a stored flag would be
 * a second source of truth that can disagree with the price pair it describes
 * (research.md R-002).
 */
export function resolveMode(
  sell: number | string | null | undefined,
  base: number | string | null | undefined
): DiscountMethod | 'none' {
  if (base == null || base === '') return 'none';
  const percent = derivePercent(base, sell);
  // A pair where the "original" is not above the selling price is not a
  // discount at all. The validator refuses to store one, but an existing row
  // could predate that rule, so the form must not present it as a discount.
  if (percent == null) return Number(base) > Number(sell) ? 'price' : 'none';
  return deriveSellPrice(base, percent) === Number(sell) ? 'percent' : 'price';
}

/**
 * True when every purchasable variant carries the same discount ratio.
 *
 * Cross-multiplication, never float equality: 4,500/3,900 and 9,000/7,800 are
 * the same ratio written in different wholes, and a float === on cmp/price
 * fails or passes by luck of representation. cmpA * priceB === cmpB * priceA
 * is exact integer arithmetic and is the only form to trust (research.md R-003).
 *
 * Returns false when either product would exceed Number.MAX_SAFE_INTEGER, where
 * Number silently loses integer precision — disagreement is the conservative
 * direction (research.md R-004).
 */
export function variantsAgree(variants: VariantPrice[]): boolean {
  const compared = variants.filter(hasDiscount);
  if (compared.length === 0) return true;
  if (compared.length !== variants.length) return false;

  const first = compared[0];
  const firstPrice = toNumber(first.price);
  const firstCmp = toNumber(first.compareAtPrice);
  if (!Number.isFinite(firstPrice) || !Number.isFinite(firstCmp)) return false;

  for (const v of compared.slice(1)) {
    const price = toNumber(v.price);
    const cmp = toNumber(v.compareAtPrice);
    if (
      firstCmp * price > Number.MAX_SAFE_INTEGER ||
      cmp * firstPrice > Number.MAX_SAFE_INTEGER
    ) {
      return false;
    }
    if (firstCmp * price !== cmp * firstPrice) return false;
  }
  return true;
}

/**
 * Classify a product for the storefront listing. research.md R-005.
 *
 *   noDiscount     — no purchasable variant is discounted
 *   uniformDiscount — every one is, and they all share a ratio
 *   partialDiscount — some are, or the ratios differ
 *
 * In the partial state the product-level original price is null (the admin
 * rule in FR-015), so getDiscount already returns null and the card's existing
 * badge and strike-through self-suppress. The card then shows a neutral note
 * instead of a percentage that only some combinations carry.
 */
export function classifyProduct(variants: VariantPrice[]): DiscountState {
  if (variants.length === 0) return 'noDiscount';
  if (!variants.some(hasDiscount)) return 'noDiscount';
  return variantsAgree(variants) ? 'uniformDiscount' : 'partialDiscount';
}

/**
 * The strongest discount across the purchasable variants, as a percentage, or
 * null when none is discounted.
 *
 * Used for the product page's "discount on some variations, from X%" note.
 * Reporting the STRONGEST is a true statement about the product as a whole —
 * some combination really is available at that discount — whereas reporting
 * the product-level percentage would advertise a number no single variant
 * necessarily carries.
 */
export function bestVariantPercent(variants: VariantPrice[]): number | null {
  let best: number | null = null;
  for (const v of variants) {
    if (!hasDiscount(v)) continue;
    const info = getDiscount(Number(v.price), Number(v.compareAtPrice));
    if (!info) continue;
    if (best === null || info.percent > best) best = info.percent;
  }
  return best;
}

/**
 * Advisory only — never a gate. True when a typed discount would round away to
 * less than a 1% saving, so the storefront badge would silently disappear.
 * Feature 004 refused this; the clarification chose a warning so the admin
 * cannot make the mistake by accident without being blocked from saving
 * (FR-018, FR-019, research.md R-008).
 */
export function warnsSmallDiscount(
  base: number | string,
  percent: number | string | null | undefined
): boolean {
  const b = Number(base);
  const p = Number(percent);
  if (!Number.isFinite(b) || !Number.isFinite(p)) return false;
  if (p <= 0) return false;
  return p < 1 || b < MIN_DISCOUNTABLE_PRICE;
}
