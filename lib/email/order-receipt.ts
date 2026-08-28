import { APP_NAME } from '../constants';
import { formatCurrency } from '../utils';
import type { Order } from '@/types';

/**
 * Order receipt emails are rendered as plain structured HTML (RTL-friendly)
 * without an external template dependency. The provider layer decides how
 * the rendered email is delivered.
 */

type OrderReceiptInput = {
  to: string;
  order: Order;
  locale: 'fa' | 'en';
};

const dictionary = {
  fa: {
    title: 'سفارش شما ثبت شد',
    greeting: 'سلام',
    thanks: 'از خرید شما سپاسگزاریم. خلاصه سفارش شما در پایین آمده است.',
    orderNo: 'شماره سفارش',
    items: 'اقلام سفارش',
    itemsPrice: 'جمع کالاها',
    taxPrice: 'مالیات',
    shippingPrice: 'هزینه ارسال',
    total: 'مبلغ کل',
    paymentMethod: 'روش پرداخت',
    currency: 'تومان',
    footer: `این ایمیل به صورت خودکار برای شما ارسال شده است — ${APP_NAME}`,
  },
  en: {
    title: 'Your order is confirmed',
    greeting: 'Hello',
    thanks: 'Thank you for your purchase. Here is a summary of your order.',
    orderNo: 'Order ID',
    items: 'Order Items',
    itemsPrice: 'Items',
    taxPrice: 'Tax',
    shippingPrice: 'Shipping',
    total: 'Total',
    paymentMethod: 'Payment Method',
    currency: 'Toman',
    footer: `This email was sent automatically — ${APP_NAME}`,
  },
} as const;

function renderReceiptHtml({ order, locale }: Omit<OrderReceiptInput, 'to'>): string {
  const d = dictionary[locale];
  const rows = order.orderItems
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;">${item.name} × ${item.qty}</td>
          <td style="padding:8px 0;text-align:left;">${formatCurrency(Number(item.price) * item.qty)} ${d.currency}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="${locale}" dir="${locale === 'fa' ? 'rtl' : 'ltr'}">
  <body style="font-family:system-ui,sans-serif;background:#f6f7f9;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;">
      <h1 style="font-size:18px;margin:0 0 8px;">${d.title}</h1>
      <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">${d.greeting} ${order.shippingAddress.fullName}</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${d.thanks}</p>
      <p style="font-size:14px;margin:0 0 16px;">${d.orderNo}: <strong>${order.id}</strong></p>
      <h2 style="font-size:15px;margin:0 0 8px;">${d.items}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:8px;">
        <tr><td style="padding:4px 0;color:#6b7280;">${d.itemsPrice}</td><td style="padding:4px 0;text-align:left;">${formatCurrency(order.itemsPrice)} ${d.currency}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">${d.taxPrice}</td><td style="padding:4px 0;text-align:left;">${formatCurrency(order.taxPrice)} ${d.currency}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">${d.shippingPrice}</td><td style="padding:4px 0;text-align:left;">${formatCurrency(order.shippingPrice)} ${d.currency}</td></tr>
        <tr><td style="padding:8px 0;font-weight:700;">${d.total}</td><td style="padding:8px 0;text-align:left;font-weight:700;">${formatCurrency(order.totalPrice)} ${d.currency}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:14px;margin:16px 0 0;">${d.paymentMethod}: ${order.paymentMethod === 'cod' ? 'پرداخت در محل / COD' : 'زرین‌پال / ZarinPal'}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#9ca3af;font-size:12px;margin:0;">${d.footer}</p>
    </div>
  </body>
</html>`;
}

/**
 * Email provider interface. Swap the implementation in production with an
 * SMTP/nodemailer provider — Resend is avoided because it may be blocked
 * from Iran (see docs/PRODUCTION_UPGRADE_PLAN.md §4.J).
 */
export type EmailProvider = {
  send(input: OrderReceiptInput & { subject: string; html: string }): Promise<void>;
};

// Development provider: logs the rendered email to the server console
const consoleProvider: EmailProvider = {
  async send({ to, subject, html }) {
    console.info('='.repeat(60));
    console.info(`[email:console] to=${to} subject="${subject}"`);
    console.info(`[email:console] html length=${html.length}`);
    console.info('='.repeat(60));
  },
};

/**
 * Send the order receipt for a newly created order. Called from
 * order creation; failures must never break the checkout flow.
 */
export async function sendOrderReceipt(order: Order) {
  try {
    const locale: 'fa' | 'en' = 'fa';
    const d = dictionary[locale];

    await consoleProvider.send({
      to: order.user.email,
      order,
      locale,
      subject: `${d.title} — ${APP_NAME}`,
      html: renderReceiptHtml({ order, locale }),
    });
  } catch (error) {
    console.error('[email] failed to send order receipt:', error);
  }
}
