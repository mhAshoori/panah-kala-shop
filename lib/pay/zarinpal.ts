// ZarinPal (زرین‌پال) Iranian payment gateway — REST API v4.
// Docs/endpoint contract verified against ZarinPal's official Node SDK source:
//   https://github.com/ZarinPal/ZarinPal-node-SDK
//
// Amount unit: we pass `currency: 'IRT'` so `amount` is in Toman (what the shop
// stores/computes). Without it ZarinPal expects Rials (IRR).

import { ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX } from './config';

const BASE_URL = ZARINPAL_SANDBOX
  ? 'https://sandbox.zarinpal.com'
  : 'https://payment.zarinpal.com';

export const ZARINPAL_REQUEST_URL = `${BASE_URL}/pg/v4/payment/request.json`;
export const ZARINPAL_VERIFY_URL = `${BASE_URL}/pg/v4/payment/verify.json`;
export const ZARINPAL_START_URL = `${BASE_URL}/pg/StartPay/`;

export type ZarinpalRequestResult =
  | { success: true; authority: string; startUrl: string }
  | { success: false; code: number; message: string };

// Step 1 — request a new payment authority from ZarinPal
export async function zarinpalRequestPayment(params: {
  amount: number; // Toman (IRT)
  description: string;
  callback_url: string;
  mobile?: string;
  email?: string;
}): Promise<ZarinpalRequestResult> {
  const body = {
    merchant_id: ZARINPAL_MERCHANT_ID,
    amount: Math.round(params.amount),
    currency: 'IRT',
    description: params.description,
    callback_url: params.callback_url,
    ...(params.mobile ? { mobile: params.mobile } : {}),
    ...(params.email ? { email: params.email } : {}),
  };

  const res = await fetch(ZARINPAL_REQUEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: { authority?: string; code?: number; message?: string };
    errors?: { code?: number; message?: string };
  };

  const code = json.data?.code ?? json.errors?.code ?? -1;
  const message =
    json.data?.message ?? json.errors?.message ?? 'Unknown ZarinPal error';

  if (code === 100 && json.data?.authority) {
    return {
      success: true,
      authority: json.data.authority,
      startUrl: `${ZARINPAL_START_URL}${json.data.authority}`,
    };
  }

  return { success: false, code, message };
}

export type ZarinpalVerifyResult =
  | { success: true; refId: string | number; code: number }
  | { success: false; code: number; message: string };

// Step 3 — verify a completed payment after ZarinPal redirects the user back
export async function zarinpalVerifyPayment(params: {
  amount: number; // Toman (IRT)
  authority: string;
}): Promise<ZarinpalVerifyResult> {
  const body = {
    merchant_id: ZARINPAL_MERCHANT_ID,
    amount: Math.round(params.amount),
    authority: params.authority,
  };

  const res = await fetch(ZARINPAL_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: { code?: number; message?: string; ref_id?: string | number };
    errors?: { code?: number; message?: string };
  };

  const code = json.data?.code ?? json.errors?.code ?? -1;
  const message =
    json.data?.message ?? json.errors?.message ?? 'Unknown ZarinPal error';

  if (code === 100) {
    return { success: true, refId: json.data?.ref_id ?? '', code };
  }
  // 101 = already verified previously (treated as success)
  if (code === 101) {
    return { success: true, refId: json.data?.ref_id ?? '', code };
  }
  return { success: false, code, message };
}

export function zarinpalSuccessMessage(code: number): string {
  const map: Record<number, string> = {
    100: 'عملیات با موفقیت انجام شد',
    101: 'تراکنش قبلاً تایید شده است',
    '-9': 'خطای اعتبارسنجی داده‌ها',
    '-10': 'ای پی و يا مرچنت كد پذيرنده صحيح نيست',
    '-11': 'مرچنت کد فعال نیست',
    '-12': 'تلاش بیش از سقف مجاز تعداد تراکنش',
    '-15': 'ترمینال شما به حالت تعلیق درآمده است',
    '-16': 'سطح تایید پذیرنده پایین‌تر از سطح نقره‌ای',
    '-30': 'اجازه دسترسی به تسویه اشتراکی ندارید',
    '-31': 'حساب بانکی جدید در انتظار دستور پرداخت',
    '-32': 'مبلغ بیشتر از سقف مجاز',
    '-33': 'درصد تسویه اشتراکی بیشتر از 100',
    '-34': 'مبلغ از تاریخ تراکنش‌های قبلی بیشتر است',
    '-40': 'اطلاعات اضافی وارد نشده است',
    '-50': 'مبلغ پرداخت با مبلغ مبلغ درخواستی یکی نیست',
    '-54': 'درخواست مورد نظر آرشیو شده است',
    '-101': 'فرمت ارسال پذیرنده نادرست',
  };
  return map[code] ?? 'خطای ناشناخته درگاه پرداخت';
}