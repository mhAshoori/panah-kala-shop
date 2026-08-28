import {
  PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHOD,
  PAGE_SIZE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  productDefaultValues,
} from '@/lib/constants';

describe('constants', () => {
  it('supports only ZarinPal and cash on delivery (PayPal/Stripe removed)', () => {
    expect(PAYMENT_METHODS).toContain('zarinpal');
    expect(PAYMENT_METHODS).toContain('cod');
    expect(PAYMENT_METHODS).not.toContain('paypal');
    expect(PAYMENT_METHODS).not.toContain('stripe');
  });

  it('defaults to ZarinPal', () => {
    expect(DEFAULT_PAYMENT_METHOD).toBe('zarinpal');
  });

  it('has sane commerce defaults', () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
    expect(FREE_SHIPPING_THRESHOLD).toBeGreaterThan(SHIPPING_FLAT_RATE);
    expect(TAX_RATE).toBeGreaterThan(0);
    expect(TAX_RATE).toBeLessThan(1);
  });

  it('product defaults carry both fa/en name fields', () => {
    expect(productDefaultValues).toHaveProperty('name');
    expect(productDefaultValues).toHaveProperty('nameFa');
    expect(productDefaultValues).toHaveProperty('category');
    expect(productDefaultValues).toHaveProperty('categoryFa');
  });
});
