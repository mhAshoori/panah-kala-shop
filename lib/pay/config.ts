// ZarinPal configuration loaded from environment
export const ZARINPAL_MERCHANT_ID =
  process.env.ZARINPAL_MERCHANT_ID || '';
export const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX !== 'false';

// Public base URL used to build the ZarinPal callback_url
export const APP_BASE_URL =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';