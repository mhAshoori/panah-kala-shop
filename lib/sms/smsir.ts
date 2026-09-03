/**
 * SMS.ir provider — real OTP delivery for phone sign-in/sign-up and the
 * contact-change flow. Docs: https://app.sms.ir/developer/help/introduction
 *
 * Two send paths, tried in order:
 *   1. Templated OTP (preferred): POST /v1/send/verify — requires an
 *      approved template whose text contains {CODE}.
 *   2. Raw bulk SMS (fallback): POST /v1/send/bulk — plain text, no template
 *      needed. Used when SMSIR_OTP_TEMPLATE_ID is unset (SMS.ir requires
 *      template approval + a reachable production site, which may not exist
 *      yet — see docs/DEPLOYMENT.md).
 *
 * Env (all optional — when unset the module falls back to console logging so
 * local dev and CI keep working without an SMS.ir account):
 *   SMSIR_API_KEY         — web-service key from the SMS.ir panel
 *   SMSIR_OTP_TEMPLATE_ID — template id whose text contains {CODE}
 *   SMSIR_LINE_NUMBER     — sender line (e.g. +983000505) for the bulk path
 */

export type SmsSendResult = { ok: true } | { ok: false; reason: string };

// Base URL only — /send/verify and /send/bulk are appended per call.
const SMSIR_BASE = process.env.SMSIR_BASE_URL || "https://api.sms.ir/v1";

// Persian error messages for the common SMS.ir status codes we may surface
const SMSIR_STATUS_MESSAGES: Record<number, string> = {
  1: "موفق",
  2: "شماره موبایل نامعتبر است",
  4: "کد یا پارامترها با قالب ورودی هم‌خوانی ندارد",
  5: "متن قالب با پارامترهای ارسالی هم‌خوانی ندارد",
  6: "اعتبار کافی نیست",
  7: "ارسال از این IP مجاز نیست",
  10: "کلید وب سرویس نامعتبر است",
  11: "کلید وب سرویس منقضی شده است",
  113: "قالب یافت نشد",
};

function describeStatus(status: number, fallback?: string): string {
  return SMSIR_STATUS_MESSAGES[status] ?? fallback ?? `خطای SMS.ir ${status}`;
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMSIR_API_KEY);
}

async function smsirPost(
  path: string,
  body: unknown,
): Promise<{ status: number; message?: string } | null> {
  try {
    const res = await fetch(`${SMSIR_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": process.env.SMSIR_API_KEY as string,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      // OTP messages are time-critical — fail fast so the user can retry
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json().catch(() => null)) as {
      status?: number;
      message?: string;
    } | null;
    if (!res.ok) {
      console.error(`[SMS] HTTP ${res.status}: ${json?.message ?? ""}`);
      return null;
    }
    return { status: json?.status ?? -1, message: json?.message };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network error";
    console.error("[SMS] send error:", reason);
    return null;
  }
}

/** Templated OTP send (/v1/send/verify) — requires an approved template. */
async function sendVerifyTemplate(
  mobileE164: string,
  code: string,
): Promise<boolean> {
  const result = await smsirPost("/send/verify", {
    mobile: mobileE164, // SMS.ir accepts +98… / 09… / 9…
    templateId: Number(process.env.SMSIR_OTP_TEMPLATE_ID),
    parameters: [{ name: "CODE", value: code }],
  });
  if (!result) return false;
  if (result.status !== 1) {
    console.error(
      `[SMS] verify-template failed status=${result.status}: ${describeStatus(result.status, result.message)}`,
    );
  }
  return result.status === 1;
}

/** Raw-text send (/v1/send/bulk) — no template approval needed. */
async function sendBulkText(
  mobileE164: string,
  code: string,
): Promise<boolean> {
  const lineNumber = process.env.SMSIR_LINE_NUMBER as string;
  const result = await smsirPost("/send/bulk", {
    lineNumber,
    messageText: `کد تایید پناه کالا: ${code}`,
    mobiles: [mobileE164],
  });
  if (!result) return false;
  if (result.status !== 1) {
    console.error(
      `[SMS] bulk send failed status=${result.status}: ${describeStatus(result.status, result.message)}`,
    );
  }
  return result.status === 1;
}

/**
 * Send an OTP SMS: template path when SMSIR_OTP_TEMPLATE_ID is set, raw bulk
 * path when SMSIR_LINE_NUMBER is set, console log otherwise (dev/CI).
 */
export async function sendVerificationSms(
  mobileE164: string,
  code: string,
): Promise<SmsSendResult> {
  const apiKey = process.env.SMSIR_API_KEY;

  if (!apiKey) {
    // Dev/CI fallback: log instead of failing the sign-in flow
    console.info(
      `[SMS:dev-fallback] SMS.ir not configured — OTP for ${mobileE164}: ${code}`,
    );
    return { ok: true };
  }

  if (process.env.SMSIR_OTP_TEMPLATE_ID) {
    const ok = await sendVerifyTemplate(mobileE164, code);
    if (ok) return { ok: true };
    // Template send failed (unapproved/missing template, etc.) — fall through
    // to the raw path so OTP delivery keeps working while the template is
    // pending approval.
    console.warn("[SMS] template path failed — trying raw bulk fallback");
  }

  if (process.env.SMSIR_LINE_NUMBER) {
    const ok = await sendBulkText(mobileE164, code);
    return ok ? { ok: true } : { ok: false, reason: "ارسال پیامک ناموفق بود" };
  }

  if (process.env.SMSIR_OTP_TEMPLATE_ID) {
    // A template was configured but the send failed and no fallback line —
    // surface the failure honestly rather than silently logging codes.
    return { ok: false, reason: "ارسال پیامک ناموفق بود" };
  }

  console.warn("[SMS] key set but neither template nor line number — logging");
  console.info(`[SMS:no-path] OTP for ${mobileE164}: ${code}`);
  return { ok: true };
}
