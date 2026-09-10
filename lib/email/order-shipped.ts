import { sendEmail, isEmailConfigured } from './mailer';
import { APP_NAME } from '../constants';

/**
 * Shipping-confirmation email for a paid→shipped order. Failures must never
 * break the admin action. Dev fallback (no SMTP) logs to console.
 * Takes a minimal shape so Decimal-vs-string serialization differences
 * between Prisma rows and the Order type don't matter.
 */
export async function sendOrderShippedEmail(order: {
  id: string;
  user?: { email?: string | null } | null;
}) {
  const to = order.user?.email;
  if (!to || !isEmailConfigured()) {
    console.log(`[email] shipping notice for ${order.id} (to: ${to ?? 'no email'})`);
    return;
  }
  const orderId = order.id.slice(-6);
  // orderId is a server-generated cuid — escape is defense-in-depth only
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/order/${encodeURIComponent(order.id)}`;
  await sendEmail({
    to,
    subject: `سفارش شما ارسال شد — ${APP_NAME}`,
    html: `<!doctype html><html dir="rtl" lang="fa"><body style="font-family:Tahoma,Arial,sans-serif;background:#f6f6f6;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center">
<h2 style="color:#111">${APP_NAME}</h2>
<p style="color:#333;line-height:1.8">سفارش شما با کد <strong>${esc(orderId)}</strong> تحویل پست شد و در راه است.</p>
<p style="margin:24px 0"><a href="${esc(url)}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block">پیگیری سفارش</a></p>
</div></body></html>`,
  });
}
