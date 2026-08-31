import { round2 } from './utils';

// Pure coupon logic — shared by cart actions, checkout, and admin CRUD.
// unit-tested in __tests__/lib/coupon.test.ts

export type CouponType = 'percent' | 'fixed';

export type CouponInput = {
  type: string;
  value: string | number;
  minCartTotal?: string | number | null;
  expiresAt?: Date | string | null;
  usageLimit?: number | null;
  usedCount?: number;
  isActive?: boolean;
};

export type CouponError =
  | 'couponNotFound'
  | 'couponInactive'
  | 'couponExpired'
  | 'couponMinCart'
  | 'couponUsageLimit';

export type ApplyCouponResult =
  | {
      ok: true;
      /** Toman discount on the items subtotal */
      discount: number;
      /** items subtotal after coupon discount */
      discountedItemsPrice: number;
    }
  | { ok: false; error: CouponError };

/** Validate the raw DB row against time/usage/min-total constraints. */
export function checkCouponUsable(
  coupon: CouponInput,
  itemsPrice: number,
  now: Date = new Date()
): { ok: true } | { ok: false; error: CouponError } {
  if (coupon.isActive === false) return { ok: false, error: 'couponInactive' };
  if (
    coupon.expiresAt &&
    new Date(coupon.expiresAt).getTime() < now.getTime()
  ) {
    return { ok: false, error: 'couponExpired' };
  }
  const limit = coupon.usageLimit ?? null;
  if (limit !== null && (coupon.usedCount ?? 0) >= limit) {
    return { ok: false, error: 'couponUsageLimit' };
  }
  if (Number(coupon.minCartTotal ?? 0) > itemsPrice) {
    return { ok: false, error: 'couponMinCart' };
  }
  return { ok: true };
}

/**
 * Compute the discount a coupon gives on an items subtotal.
 * Percent: value 1–99 (clamped); fixed: value in Toman, capped at subtotal.
 */
export function couponDiscount(
  type: string,
  value: string | number,
  itemsPrice: number
): number {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (type === 'percent') {
    const pct = Math.min(Math.max(Math.floor(v), 0), 99);
    return round2((itemsPrice * pct) / 100);
  }
  // fixed Toman — never more than the subtotal itself
  return round2(Math.min(v, itemsPrice));
}

/** Normalize a code for lookup: trim, uppercase, cap length. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().slice(0, 40);
}
