import { calcPrice } from '@/lib/cart/pricing';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
} from '@/lib/constants';

// calcPrice now reads admin-managed rates via lib/store-config (Setting table
// with constants as fallbacks). In Jest (no DB) readSetting throws → fallback,
// so these tests assert the constants path end-to-end.

describe('calcPrice', () => {
  it('charges flat shipping below the free-shipping threshold', async () => {
    const result = await calcPrice([{ price: '100000', qty: 2 }]); // 200,000 Toman
    expect(result.itemsPrice).toBe('200000.00');
    expect(result.shippingPrice).toBe(SHIPPING_FLAT_RATE.toFixed(2));
    expect(result.taxPrice).toBe((200000 * TAX_RATE).toFixed(2));
    expect(result.totalPrice).toBe(
      (200000 + SHIPPING_FLAT_RATE + 200000 * TAX_RATE).toFixed(2)
    );
  });

  it('gives free shipping at or above the threshold', async () => {
    const result = await calcPrice([
      { price: String(FREE_SHIPPING_THRESHOLD), qty: 1 },
    ]);
    expect(result.shippingPrice).toBe('0.00');
  });

  it('handles multiple items and string prices', async () => {
    const result = await calcPrice([
      { price: '500000', qty: 1 },
      { price: 250000, qty: 2 },
    ]);
    expect(result.itemsPrice).toBe('1000000.00');
    expect(result.shippingPrice).toBe('0.00');
    expect(result.taxPrice).toBe((1000000 * TAX_RATE).toFixed(2));
  });

  it('returns zeroed totals for an empty cart', async () => {
    const result = await calcPrice([]);
    expect(result.itemsPrice).toBe('0.00');
    expect(result.shippingPrice).toBe(SHIPPING_FLAT_RATE.toFixed(2));
    expect(result.taxPrice).toBe('0.00');
    expect(result.totalPrice).toBe(SHIPPING_FLAT_RATE.toFixed(2));
  });

  it('rounds to 2 decimals to avoid floating point errors', async () => {
    const result = await calcPrice([{ price: '0.1', qty: 3 }]);
    expect(result.itemsPrice).toBe('0.30');
  });
});
