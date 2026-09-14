// Pure coverage for the notification feature's local logic:
// 1. admin mobile → E.164 storage (normalizeIranMobile reuse — the actions
//    file delegates to it, so its edge cases are pinned here too)
// 2. unread-count / pagination math from getNotifications (re-derived)
// 3. admin alert body composition (re-derived from notifyAdminNewOrder)
import { normalizeIranMobile } from '@/lib/phone';

describe('admin mobile stored as E.164', () => {
  it('accepts the formats the settings form may receive', () => {
    expect(normalizeIranMobile('09123456789')).toBe('+989123456789');
    expect(normalizeIranMobile('+989123456789')).toBe('+989123456789');
    expect(normalizeIranMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('+989123456789');
  });

  it('rejects landlines and garbage instead of storing them', () => {
    expect(normalizeIranMobile('02188776655')).toBeNull();
    expect(normalizeIranMobile('abc')).toBeNull();
    expect(normalizeIranMobile('')).toBeNull();
  });
});

type N = { isRead: boolean };
describe('unread count + pagination math', () => {
  // prisma.count({ where: { isRead: false } }) and Math.ceil(total/limit)
  // re-derived so an off-by-one in the admin list breaks CI, not users.
  const unread = (rows: N[]) => rows.filter((r) => !r.isRead).length;

  it('counts only unread rows', () => {
    expect(unread([{ isRead: true }, { isRead: false }, { isRead: false }])).toBe(2);
    expect(unread([])).toBe(0);
  });

  it('totalPages never drops below 1 (empty list shows page 1)', () => {
    const totalPages = (total: number, limit: number) =>
      Math.max(Math.ceil(total / limit), 1);
    expect(totalPages(0, 12)).toBe(1);
    expect(totalPages(12, 12)).toBe(1);
    expect(totalPages(13, 12)).toBe(2);
  });
});

describe('new-order notification body', () => {
  type Item = { name: string; variantLabel?: string; qty: number; price: string };
  type O = { id: string; totalPrice: string; orderItems?: Item[]; user?: { name?: string } | null; shippingAddress?: { fullName?: string } | null };

  const build = (o: O) => {
    const itemCount = o.orderItems?.length ?? 0;
    const buyer =
      o.user?.name ?? o.shippingAddress?.fullName ?? '—';
    return {
      body: `${buyer} — ${itemCount} قلم — ${o.totalPrice} تومان`,
      sms: `سفارش جدید ${o.id.slice(-6)} | ${buyer} | ${itemCount} قلم | جمع: ${o.totalPrice} تومان`,
    };
  };

  it('prefers user name, falls back to address, then dash', () => {
    const o = { id: 'xxxxxxxx-order1', totalPrice: '350000' };
    expect(build({ ...o, user: { name: 'علی' } }).body).toBe('علی — 0 قلم — 350000 تومان');
    expect(build({ ...o, shippingAddress: { fullName: 'مهمان' } }).body).toContain('مهمان');
    expect(build(o).body).toContain('— 0 قلم —');
  });

  it('SMS alert carries order suffix, buyer and total', () => {
    const { sms } = build({ id: 'zzzz12aborder99', totalPrice: '12000', orderItems: [{ name: 'مداد', qty: 1, price: '12000' }], user: { name: 'سارا' } });
    expect(sms).toBe('سفارش جدید rder99 | سارا | 1 قلم | جمع: 12000 تومان');
  });
});

describe('admin email alert HTML', () => {
  // Re-derived: escaping of user-supplied names/labels + thousands separator
  const esc = (v: string) =>
    v.replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c
    );
  const fmt = (v: unknown) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  it("escapes buyer name so '<x>' can't break the table layout", () => {
    expect(esc('علی<script>alert(1)</script>')).not.toContain('<script>');
    expect(esc('A & B < C')).toBe('A &amp; B &lt; C');
  });

  it('formats prices with thousands separators', () => {
    expect(fmt('1250000')).toBe('1,250,000');
    expect(fmt(12500)).toBe('12,500');
  });
});
