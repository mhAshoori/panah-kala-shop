import {
  insertProductSchema,
  signUpFormSchema,
  shippingAddressSchema,
  insertReviewSchema,
  paymentMethodSchema,
  updateUserSchema,
} from '@/lib/validator';

const validProduct = {
  name: 'iPhone 15 Pro',
  nameFa: 'آیفون ۱۵ پرو',
  slug: 'iphone-15-pro',
  category: 'Mobile Phones',
  categoryFa: 'گوشی موبایل',
  brand: 'Apple',
  description: 'Latest Apple flagship',
  descriptionFa: 'جدیدترین پرچمدار اپل',
  stock: 10,
  images: ['/images/test.jpg'],
  isFeatured: false,
  banner: null,
  codAvailable: false,
  price: '50000000.00',
};

describe('insertProductSchema', () => {
  it('accepts a valid product', () => {
    expect(() => insertProductSchema.parse(validProduct)).not.toThrow();
  });

  it('rejects a short name', () => {
    expect(() =>
      insertProductSchema.parse({ ...validProduct, name: 'ab' })
    ).toThrow();
  });

  it('rejects products without images', () => {
    expect(() =>
      insertProductSchema.parse({ ...validProduct, images: [] })
    ).toThrow();
  });

  it('normalizes integer prices to two decimals', () => {
    expect(() =>
      insertProductSchema.parse({ ...validProduct, price: '50000000' })
    ).not.toThrow();
  });

  it('rejects prices with more than two decimal places', () => {
    expect(() =>
      insertProductSchema.parse({ ...validProduct, price: '50000000.123' })
    ).toThrow();
  });
});

describe('signUpFormSchema', () => {
  const emailBase = {
    name: 'Ali Rezaei',
    mode: 'email' as const,
    email: 'ali@example.com',
    mobile: '',
    password: 'secret123',
    confirmPassword: 'secret123',
    otpCode: '',
  };

  const phoneBase = {
    name: 'Ali Rezaei',
    mode: 'phone' as const,
    email: '',
    mobile: '9123456789',
    password: '',
    confirmPassword: '',
    otpCode: '123456',
  };

  it('accepts password sign-up with an email', () => {
    expect(() => signUpFormSchema.parse(emailBase)).not.toThrow();
  });

  it('accepts OTP sign-up with a phone (no password)', () => {
    expect(() => signUpFormSchema.parse(phoneBase)).not.toThrow();
  });

  it('rejects email mode without a password', () => {
    expect(() =>
      signUpFormSchema.parse({ ...emailBase, password: '', confirmPassword: '' })
    ).toThrow();
  });

  it('rejects email mode with mismatched passwords', () => {
    expect(() =>
      signUpFormSchema.parse({ ...emailBase, confirmPassword: 'different' })
    ).toThrow();
  });

  it('rejects email mode with an invalid email', () => {
    expect(() =>
      signUpFormSchema.parse({ ...emailBase, email: 'not-an-email' })
    ).toThrow();
  });

  it('rejects phone mode without the OTP code', () => {
    expect(() =>
      signUpFormSchema.parse({ ...phoneBase, otpCode: '' })
    ).toThrow();
  });

  it('rejects phone mode with a short mobile', () => {
    expect(() =>
      signUpFormSchema.parse({ ...phoneBase, mobile: '91234' })
    ).toThrow();
  });
});

describe('shippingAddressSchema', () => {
  const valid = {
    fullName: 'Sara Ahmadi',
    streetAddress: 'Valiasr St. No 5',
    city: 'Tehran',
    province: 'Tehran',
    postalCode: '1234567890',
    phone: '09121234567',
    country: 'Iran',
  };

  it('accepts a valid address', () => {
    expect(() => shippingAddressSchema.parse(valid)).not.toThrow();
  });

  it('rejects postal codes with letters', () => {
    expect(() =>
      shippingAddressSchema.parse({ ...valid, postalCode: 'ABC123' })
    ).toThrow();
  });

  it('rejects too-short phone numbers', () => {
    expect(() =>
      shippingAddressSchema.parse({ ...valid, phone: '123' })
    ).toThrow();
  });
});

describe('insertReviewSchema', () => {
  const valid = {
    title: 'Great phone',
    description: 'Battery life is excellent',
    productId: 'p1',
    userId: 'u1',
    rating: 5,
  };

  it('accepts ratings between 1 and 5', () => {
    expect(() => insertReviewSchema.parse({ ...valid, rating: 1 })).not.toThrow();
    expect(() => insertReviewSchema.parse(valid)).not.toThrow();
  });

  it('rejects ratings out of range', () => {
    expect(() => insertReviewSchema.parse({ ...valid, rating: 0 })).toThrow();
    expect(() => insertReviewSchema.parse({ ...valid, rating: 6 })).toThrow();
  });
});

describe('paymentMethodSchema', () => {
  it('accepts the supported Iranian gateways', () => {
    expect(() => paymentMethodSchema.parse({ type: 'zarinpal' })).not.toThrow();
    expect(() => paymentMethodSchema.parse({ type: 'cod' })).not.toThrow();
  });

  it('rejects PayPal/Stripe and unknown types', () => {
    expect(() => paymentMethodSchema.parse({ type: 'paypal' })).toThrow();
    expect(() => paymentMethodSchema.parse({ type: 'stripe' })).toThrow();
  });
});

describe('updateUserSchema', () => {
  it('accepts admin/user roles only', () => {
    expect(() =>
      updateUserSchema.parse({ id: 'u1', name: 'Admin User', role: 'admin' })
    ).not.toThrow();
    expect(() =>
      updateUserSchema.parse({ id: 'u1', name: 'Normal User', role: 'user' })
    ).not.toThrow();
    expect(() =>
      updateUserSchema.parse({ id: 'u1', name: 'Bad Role', role: 'root' })
    ).toThrow();
  });
});
