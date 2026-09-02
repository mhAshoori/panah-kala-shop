import nodemailer from 'nodemailer';
import { APP_NAME } from '../constants';

/**
 * SMTP email provider (nodemailer). Iranian-friendly: Resend is avoided
 * (may be blocked from Iran), any SMTP relay works — e.g. an Iranian
 * provider's SMTP or a transactional relay.
 *
 * Env (all optional — when unset emails are logged to the console so local
 * dev and CI keep working without an SMTP account):
 *   SMTP_HOST          — relay hostname
 *   SMTP_PORT          — usually 465 (implicit TLS) or 587 (STARTTLS)
 *   SMTP_SECURE        — "true" for 465, omitted/false for 587
 *   SMTP_USER          — SMTP username (usually the from address)
 *   SMTP_PASS          — SMTP password
 *   EMAIL_FROM         — "Panah Kala <no-reply@panahkala.ir>" (optional,
 *                        defaults to SMTP_USER or a dev label)
 *   CONTACT_EMAIL      — customer-service inbox shown on /contact-us and
 *                        used as the recipient for support copies
 */

export type EmailSendResult =
  | { ok: true }
  | { ok: false; reason: string };

export type VerificationEmailKind = 'contact-change' | 'order-receipt-copy';

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? `${APP_NAME} <no-reply@localhost>`;
}

export function contactEmail(): string {
  return process.env.CONTACT_EMAIL ?? 'support@panahkala.ir';
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });
  }
  return transporter;
}

/** Send an arbitrary email. Never throws — failures are logged and returned. */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const tx = getTransporter();
  if (!tx) {
    console.info(
      `[email:dev-fallback] SMTP not configured — to=${input.to} subject="${input.subject}" htmlLength=${input.html.length}`
    );
    return { ok: true };
  }
  try {
    await tx.sendMail({
      from: emailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'smtp error';
    console.error('[email] send failed:', reason);
    return { ok: false, reason };
  }
}

const otpDictionary = {
  fa: {
    title: 'کد تایید',
    body: 'کد تایید شما برای تغییر اطلاعات تماس:',
    ttl: 'این کد ۵ دقیقه اعتبار دارد. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.',
    footer: `پیام خودکار — ${APP_NAME}`,
  },
  en: {
    title: 'Verification code',
    body: 'Your verification code for the contact change:',
    ttl: 'This code is valid for 5 minutes. If you did not request it, ignore this email.',
    footer: `Automated message — ${APP_NAME}`,
  },
} as const;

/** Verification-code email (contact change). */
export async function sendVerificationEmail(input: {
  to: string;
  code: string;
  kind: VerificationEmailKind;
}): Promise<EmailSendResult> {
  const d = otpDictionary.fa;
  const html = `<!doctype html>
<html lang="fa" dir="rtl">
  <body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;text-align:center;">
      <h1 style="font-size:18px;margin:0 0 12px;">${d.title}</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${d.body}</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px;">${input.code}</div>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">${d.ttl}</p>
      <p style="color:#9ca3af;font-size:12px;margin:0;">${d.footer}</p>
    </div>
  </body>
</html>`;
  return sendEmail({
    to: input.to,
    subject: `${d.title} — ${APP_NAME}`,
    html,
  });
}
