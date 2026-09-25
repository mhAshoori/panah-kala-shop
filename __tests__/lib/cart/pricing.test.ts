import { calcPrice } from '@/lib/cart/pricing';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
} from '@/lib/constants';

// calcPrice now reads admin-managed rates via lib/store-config (Setting table
// with constants as fallbacks). In Jest (no DB) readSetting throws → fallback,
// so these tests assert the constants path end-to-end.
//
// Money is whole Toman (integer) since 005-money-int-migration: no .toFixed(2),
// no fractional Toman anywhere. The tax RATE stays fractional (0.09), so taxPrice
// is the one derived value that genuinely needs rounding.

const assertWholeToman = (result: {
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
}) => {
  for (const value of Object.values(result)) {
    expect(Number.isInteger(value)).toBe(true);
  }
  // SC-004: totals must balance exactly, with no rounding residual.
  expect(result.itemsPrice + result.shippingPrice + result.taxPrice).toBe(
    result.totalPrice
  );
};

describe('calcPrice', () => {
  it('charges flat shipping below the free-shipping threshold', async () => {
    const result = await calcPrice([{ price: 100000, qty: 2 }]); // 200,000 Toman
    expect(result.itemsPrice).toBe(200000);
    expect(result.shippingPrice).toBe(SHIPPING_FLAT_RATE);
    expect(result.taxPrice).toBe(Math.round(200000 * TAX_RATE));
    expect(result.totalPrice).toBe(
      200000 + SHIPPING_FLAT_RATE + Math.round(200000 * TAX_RATE)
    );
    assertWholeToman(result);
  });

  it('gives free shipping at or above the threshold', async () => {
    const result = await calcPrice([
      { price: FREE_SHIPPING_THRESHOLD, qty: 1 },
    ]);
    expect(result.shippingPrice).toBe(0);
    assertWholeToman(result);
  });

  it('handles multiple items', async () => {
    const result = await calcPrice([
      { price: 500000, qty: 1 },
      { price: 250000, qty: 2 },
    ]);
    expect(result.itemsPrice).toBe(1000000);
    expect(result.shippingPrice).toBe(0);
    expect(result.taxPrice).toBe(Math.round(1000000 * TAX_RATE));
    assertWholeToman(result);
  });

  it('returns zeroed totals for an empty cart', async () => {
    const result = await calcPrice([]);
    expect(result.itemsPrice).toBe(0);
    expect(result.shippingPrice).toBe(SHIPPING_FLAT_RATE);
    expect(result.taxPrice).toBe(0);
    expect(result.totalPrice).toBe(SHIPPING_FLAT_RATE);
    assertWholeToman(result);
  });

  it('rounds the fractional tax rate to whole Toman', async () => {
    // 0.09 tax on 1 Toman rounds half-up to 0; on 6 Toman it rounds to 1.
    expect((await calcPrice([{ price: 1, qty: 1 }])).taxPrice).toBe(0);
    expect((await calcPrice([{ price: 6, qty: 1 }])).taxPrice).toBe(1);
  });

  it('subtracts a coupon discount from the taxable subtotal', async () => {
    const result = await calcPrice([{ price: 1000000, qty: 1 }], 150000);
    expect(result.itemsPrice).toBe(850000);
    expect(result.taxPrice).toBe(Math.round(850000 * TAX_RATE));
    assertWholeToman(result);
  });

  it('clamps a coupon discount to the subtotal without going negative', async () => {
    // 999999 discount on a 100000 subtotal clamps to the subtotal (0), and a
    // clamped-to-zero cart still attracts the flat shipping fee because 0 is
    // below the free-shipping threshold. That is the pre-existing shipping
    // rule, not a discount bug — the important guarantee is no negative total.
    const result = await calcPrice([{ price: 100000, qty: 1 }], 999999);
    expect(result.itemsPrice).toBe(0);
    expect(result.shippingPrice).toBe(SHIPPING_FLAT_RATE);
    expect(result.taxPrice).toBe(0);
    expect(result.totalPrice).toBe(SHIPPING_FLAT_RATE);
    assertWholeToman(result);
  });
});
