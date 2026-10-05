export const APP_NAME = 'پناه کالا';
export const APP_NAME_EN = 'Panah Kala';

/** Free-shipping threshold in Toman */
export const FREE_SHIPPING_THRESHOLD = 500_000;

/** Flat shipping rate in Toman (applied below the free-shipping threshold) */
export const SHIPPING_FLAT_RATE = 50_000;

/** VAT rate applied to the items subtotal (Iranian value-added tax) */
export const TAX_RATE = 0.09;

export const CURRENCY = 'IRT';

/**
 * SMS one-time-code lifetime, in seconds. Deliberately short: the code is a
 * bearer credential for an account, and Iranian SMS delivery is well under a
 * minute. This is the single source for BOTH the server-enforced expiry
 * (lib/otp.ts) and the countdown the auth forms display — they must not drift.
 *
 * Lives here rather than lib/otp.ts because the auth forms import it, and
 * lib/otp.ts pulls in node:crypto, which would break the client bundle.
 */
export const OTP_TTL_SECONDS = 120;

/** Digits in a one-time code. Mirrors lib/otp.ts's OTP_LENGTH, re-declared
 *  here so client components can use it without pulling in node:crypto. */
export const OTP_LENGTH = 6;

/** Seconds a shopper must wait before asking for another code. */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/**
 * Supported payment methods. PayPal/Stripe intentionally omitted;
 * ZarinPal is the Iranian gateway, plus cash on delivery.
 */
export const PAYMENT_METHODS = ['zarinpal', 'cod'] as const;

export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export const DEFAULT_PAYMENT_METHOD: PaymentMethodType = 'zarinpal';

export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 6;

/** Allowed page-size values for the ?size= selector (server-side clamp). */
export const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const;

/** Parse the ?size= URL param into a safe limit (falls back to fallback). */
export function parsePageSize(
  raw: string | undefined | null,
  fallback: number = PAGE_SIZE
): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2) return fallback;
  // A tampered param could stream huge lists; cap like the selector does
  return Math.min(n, 48);
}

/** Selector options derived from the admin-set base size: n, 2n, 4n, 8n — cap 48 */
export function pageSizeOptions(base: number): number[] {
  return [...new Set([1, 2, 4, 8].map((m) => Math.min(m * base, 48)))];
}

/** Stock at/below which the "فقط N عدد باقی مانده" urgency badge shows. */
export const LOW_STOCK_THRESHOLD = 5;

export const LATEST_PRODUCTS_LIMIT =
  Number(process.env.LATEST_PRODUCTS_LIMIT) || 4;

export const signInDefaultValues = {
  email: '',
  password: '',
};

export const signUpDefaultValues = {
  name: '',
  email: '',
  mobile: '',
  password: '',
  confirmPassword: '',
};

export const productDefaultValues = {
  name: '',
  nameFa: '',
  slug: '',
  category: '',
  categoryFa: '',
  brand: '',
  description: '',
  descriptionFa: '',
  stock: 0,
  price: '0',
  images: [] as string[],
  isFeatured: false,
  banner: null as string | null,
  codAvailable: false,
};
