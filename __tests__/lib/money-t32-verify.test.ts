import { insertProductSchema } from '@/lib/validator';
import { couponDiscount } from '@/lib/coupon';
import { getDiscount } from '@/lib/discount';

// T032 verification (quickstart Scenarios 7, 9, 10, 11) run against the real
// modules. Named separately from the unit suites so it reads as a checklist.
const base = {
  name: 'Test Product',
  nameFa: 'محصول تست',
  slug: 'test-product',
  category: 'Test',
  categoryFa: 'تست',
  brand: 'TestBrand',
  description: 'A test product',
  descriptionFa: 'یک محصول تست',
  stock: '5',
  images: ['/a.jpg'],
  isFeatured: false,
  banner: null,
  codAvailable: false,
  compareAtPrice: '',
};

const accepts = (price: string) => {
  try {
    insertProductSchema.parse({ ...base, price });
    return true;
  } catch {
    return false;
  }
};

describe('quickstart Scenario 7 — discount badge from a stored pair', () => {
  it('derives the badge and an integer saving from whole Toman', () => {
    // 199,000 Toman with a 221,111 price-before-discount (a 10% markdown
    // rounded half-up) renders as ٪۹ تخفیف with ۲۲۱٬۱۱۱ struck through.
    expect(getDiscount(199000, 221111)).toEqual({
      percent: 9,
      saveAmount: 22111,
    });
  });
});

describe('quickstart Scenario 9 — coupons produce whole Toman', () => {
  it('rounds percent coupons half-up and clamps fixed coupons', () => {
    expect(couponDiscount('percent', 15, 999999)).toBe(150000);
    expect(couponDiscount('percent', 15, 1000000)).toBe(150000);
    expect(couponDiscount('percent', 1, 10)).toBe(0);
    expect(couponDiscount('fixed', 20000, 999999)).toBe(20000);
    expect(couponDiscount('fixed', 999999, 100000)).toBe(100000);
  });
});

describe('quickstart Scenarios 10 & 11 — validator refuses bad money', () => {
  it('rejects fractional Toman but accepts whole Toman', () => {
    expect(accepts('100.5')).toBe(false);
    expect(accepts('100')).toBe(true);
  });

  it('rejects prices above the int4 ceiling with a form error', () => {
    expect(accepts('2147483648')).toBe(false);
    expect(accepts('2147483647')).toBe(true);
  });
});
