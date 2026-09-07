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
 * Supported payment methods. PayPal/Stripe intentionally omitted;
 * ZarinPal is the Iranian gateway, plus cash on delivery.
 */
export const PAYMENT_METHODS = ['zarinpal', 'cod'] as const;

export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export const DEFAULT_PAYMENT_METHOD: PaymentMethodType = 'zarinpal';

export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 6;

/** Allowed page-size values for the ?size= selector (server-side clamp). */
export const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const;

/** Parse the ?size= URL param into a safe limit (falls back to PAGE_SIZE). */
export function parsePageSize(raw: string | undefined | null): number {
  const n = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : PAGE_SIZE;
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
