/**
 * SMS.ir provider — real OTP delivery for phone sign-in/sign-up and the
 * contact-change flow. Docs: https://app.sms.ir/developer/help/introduction
 *
 * Contract (verified against the live API):
 *   POST https://api.sms.ir/v1/send/verify
 *   headers: { 'x-api-key': <key>, 'Content-Type': 'application/json' }
 *   body:    { mobile, templateId, parameters: [{ name, value }] }
 *   2xx body: { status: 1, message: 'موفق', data: ... }
 *   status !== 1 → error (10 = invalid key, 1xx per docs).
 *
 * Env (all optional — when unset the module falls back to console logging so
 * local dev and CI keep working without an SMS.ir account):
 *   SMSIR_API_KEY     — web-service key from the SMS.ir panel
 *   SMSIR_OTP_TEMPLATE_ID — template id whose text contains {CODE}
 */

export type SmsSendResult =
  | { ok: true }
  | { ok: false; reason: string };

const SMSIR_URL = 'https://api.sms.ir/v1/send/verify';

// Persian error messages for the common SMS.ir status codes we may surface
const SMSIR_STATUS_MESSAGES: Record<number, string> = {
  1: 'موفق',
  2: 'شماره موبایل نامعتبر است',
  4: 'کد یا پارامترها با قالب ورودی هم‌خوانی ندارد',
  5: 'متن قالب با پارامترهای ارسالی هم‌خوانی ندارد',
  6: 'اعتبار کافی نیست',
  7: 'ارسال از این IP مجاز نیست',
  10: 'کلید وب سرویس نامعتبر است',
  11: 'کلید وب سرویس منقضی شده است',
};

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.SMSIR_API_KEY && process.env.SMSIR_OTP_TEMPLATE_ID
  );
}

/** Send a verification SMS through SMS.ir's templated endpoint. */
export async function sendVerificationSms(
  mobileE164: string,
  code: string
): Promise<SmsSendResult> {
  const apiKey = process.env.SMSIR_API_KEY;
  const templateId = Number(process.env.SMSIR_OTP_TEMPLATE_ID);

  if (!apiKey || !templateId) {
    // Dev/CI fallback: log instead of failing the sign-in flow
    console.info(
      `[SMS:dev-fallback] SMS.ir not configured — OTP for ${mobileE164}: ${code}`
    );
    return { ok: true };
  }

  try {
    const res = await fetch(SMSIR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        mobile: mobileE164, // SMS.ir accepts +98… / 09… / 9…
        templateId,
        parameters: [{ name: 'CODE', value: code }],
      }),
      cache: 'no-store',
      // OTP messages are time-critical — fail fast so the user can retry
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json().catch(() => null)) as
      | { status?: number; message?: string }
      | null;

    if (!res.ok || json?.status !== 1) {
      const status = json?.status ?? res.status;
      const reason =
        SMSIR_STATUS_MESSAGES[status] ?? json?.message ?? `HTTP ${res.status}`;
      console.error(`[SMS] send failed status=${status}: ${reason}`);
      return { ok: false, reason };
    }

    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'network error';
    console.error('[SMS] send error:', reason);
    return { ok: false, reason };
  }
}
