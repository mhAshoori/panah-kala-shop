import {
  NOTIFICATION_HREF,
  NOTIFICATION_TAG_KEY,
  stockEventWording,
  pruneCount,
  NOTIFICATION_LOG_CAP,
} from '@/lib/notification-events';

describe('notification-events helpers', () => {
  it('maps every kind to its admin href', () => {
    expect(NOTIFICATION_HREF.order).toBe('/admin/orders');
    expect(NOTIFICATION_HREF.payment).toBe('/admin/orders');
    expect(NOTIFICATION_HREF.signup).toBe('/admin/users');
    expect(NOTIFICATION_HREF.question).toBe('/admin/support');
    expect(NOTIFICATION_HREF.stock).toBe('/admin/products');
  });

  it('maps kinds (and legacy support) to tag keys', () => {
    expect(NOTIFICATION_TAG_KEY.order).toBe('tagOrder');
    expect(NOTIFICATION_TAG_KEY.stock).toBe('tagStock');
    expect(NOTIFICATION_TAG_KEY.support).toBe('tagQuestion');
  });

  it('stock wording distinguishes out vs low', () => {
    expect(stockEventWording(0)).toBe('ناموجود شد');
    expect(stockEventWording(3)).toBe('کمبود موجودی');
  });

  it('prune math: nothing to prune at cap, oldest overflow above it', () => {
    expect(NOTIFICATION_LOG_CAP).toBe(5000);
    expect(pruneCount(5000)).toBe(1);
    expect(pruneCount(4999)).toBe(0);
    expect(pruneCount(5230)).toBe(231);
    expect(pruneCount(0)).toBe(0);
  });
});
