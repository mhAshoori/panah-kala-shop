// Pure helpers for the admin notification log (prisma-free — Jest-safe).

export const NOTIFICATION_LOG_CAP = 5000;
export const NOTIFICATION_LOG_KEEP = 4999;

/** Canonical notification kinds recorded in the Notification table. */
export type NotificationKind =
  | 'order'
  | 'payment'
  | 'signup'
  | 'question'
  | 'stock';

export const NOTIFICATION_HREF: Record<string, string | undefined> = {
  order: '/admin/orders',
  payment: '/admin/orders',
  signup: '/admin/users',
  question: '/admin/support',
  stock: '/admin/products',
};

/** i18n key suffix for the kind tag chip (admin namespace: tagOrder, …). */
export const NOTIFICATION_TAG_KEY: Record<string, string> = {
  order: 'tagOrder',
  payment: 'tagPayment',
  signup: 'tagSignup',
  question: 'tagQuestion',
  stock: 'tagStock',
  // legacy rows: the old support path wrote type 'support'
  support: 'tagQuestion',
};

/** fa wording for a stock drop event. */
export function stockEventWording(stock: number): string {
  return stock === 0 ? 'ناموجود شد' : 'کمبود موجودی';
}

/** How many of the oldest rows to prune: count is at call time (post-insert). */
export function pruneCount(count: number, cap = NOTIFICATION_LOG_CAP): number {
  return Math.max(0, count - (cap - 1));
}
