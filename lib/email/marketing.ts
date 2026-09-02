import { APP_NAME } from '../constants';
import { sendEmail, isEmailConfigured, contactEmail } from './mailer';
import { formatCurrency } from '../utils';

/**
 * Marketing email — special offers (e.g. weekend campaigns) broadcast to
 * customers. Delivered via the shared SMTP provider; chunked to stay inside
 * typical relay rate limits. Admin-facing actions live in
 * lib/actions/marketing.actions.ts.
 */

export type OfferEmailInput = {
  subject: string;
  title: string;
  body: string;
  /** Coupon code to highlight (optional) */
  couponCode?: string;
  /** Discount summary line, e.g. "٪۱۵ تخفیف" */
  discountLine?: string;
  /** CTA link path like /search?sort=cheapest */
  ctaPath?: string;
};

export const OFFER_FOOTER = `اگر مایل به دریافت این ایمیل‌ها نیستید، از تنظیمات حساب خود انصراف دهید. — ${APP_NAME}`;

export function renderOfferHtml(input: OfferEmailInput): string {
  const couponBlock = input.couponCode
    ? `<div style="margin:16px 0;padding:12px;border:2px dashed #d97706;border-radius:8px;font-size:20px;font-weight:700;letter-spacing:2px;">${input.couponCode}</div>`
    : '';
  const ctaPath = input.ctaPath ?? '/';
  return `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 8px;">${input.title}</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${input.body}</p>
      ${input.discountLine ? `<p style="font-size:16px;font-weight:700;color:#d97706;margin:0 0 8px;">${input.discountLine}</p>` : ''}
      ${couponBlock}
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}${ctaPath}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;margin-top:8px;">مشاهده پیشنهادها</a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#9ca3af;font-size:12px;margin:0;">${OFFER_FOOTER}</p>
    </div>
  </body>
</html>`;
}

/**
 * Broadcast an offer to a list of recipients. Chunked + sequential to stay
 * inside relay rate limits. Returns per-chunk outcome summary.
 */
export async function sendOfferBroadcast(
  recipients: string[],
  offer: OfferEmailInput,
  opts?: { chunkSize?: number; chunkDelayMs?: number }
): Promise<{ sent: number; failed: number }> {
  const chunkSize = opts?.chunkSize ?? 50;
  const chunkDelayMs = opts?.chunkDelayMs ?? 1_000;
  const html = renderOfferHtml(offer);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map((to) =>
        sendEmail({ to, subject: offer.subject, html }).then((r) =>
          r.ok ? 'ok' : 'fail'
        )
      )
    );
    sent += results.filter((r) => r === 'ok').length;
    failed += results.filter((r) => r === 'fail').length;
    if (i + chunkSize < recipients.length) {
      await new Promise((r) => setTimeout(r, chunkDelayMs));
    }
  }
  return { sent, failed };
}

export { isEmailConfigured, contactEmail, formatCurrency };
