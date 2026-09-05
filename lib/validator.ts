import { z } from 'zod';
import { PAYMENT_METHODS } from './constants';
import { formatNumberWithDecimal } from './utils';

// Make sure price is formatted with two decimal places
const currency = z
  .string()
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),
    'Price must have exactly two decimal places (e.g., 49.99)'
  );

// Schema for inserting a product
export const insertProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  nameFa: z.string().min(3, 'نام باید حداقل ۳ کاراکتر باشد'),
  slug: z.string().min(3, 'Slug must be at least 3 characters'),
  category: z.string().min(3, 'Category must be at least 3 characters'),
  categoryFa: z.string().min(2, 'دسته‌بندی باید حداقل ۲ کاراکتر باشد'),
  brand: z.string().min(3, 'Brand must be at least 3 characters'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  descriptionFa: z.string().min(3, 'توضیحات باید حداقل ۳ کاراکتر باشد'),
  stock: z.coerce.number(),
  images: z.array(z.string()).min(1, 'Product must have at least one image'),
  isFeatured: z.boolean(),
  banner: z.string().nullable(),
  codAvailable: z.boolean(),
  price: currency,
  // Original price for showing a discount; must be empty or > price
  compareAtPrice: z
    .union([currency, z.literal('')])
    .optional()
    .transform((v) => v || null),
  // Physical properties (cm / grams) — DB Decimals arrive as strings via the
  // $extends transform (same as price); forms submit them as strings too.
  lengthCm: z.union([z.string(), z.number(), z.null()]).optional(),
  widthCm: z.union([z.string(), z.number(), z.null()]).optional(),
  heightCm: z.union([z.string(), z.number(), z.null()]).optional(),
  weightG: z.union([z.string(), z.number(), z.null()]).optional(),
})
  .refine(
    (data) =>
      !data.compareAtPrice || Number(data.compareAtPrice) > Number(data.price),
    { message: 'compareAtPrice must be greater than price', path: ['compareAtPrice'] }
  );

// ---------------------------------------------------------------------------
// Product diversity: options (color/...) and purchasable variant combos
// ---------------------------------------------------------------------------

export const optionValueSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  valueFa: z.string().min(1, 'مقدار فارسی لازم است'),
  hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color')
    .nullish(),
});

export const productOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  nameFa: z.string().min(1, 'نام ویژگی فارسی لازم است'),
  values: z.array(optionValueSchema).min(1, 'At least one value is required'),
});

export const variantInputSchema = z.object({
  // Combo signature — recomputed server-side from created value ids
  key: z.string().min(1),
  price: currency,
  compareAtPrice: z
    .union([currency, z.literal('')])
    .optional()
    .transform((v) => v || null),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  image: z.string().nullish(),
});

export const productOptionsPayloadSchema = z.object({
  options: z.array(productOptionSchema).min(1, 'At least one option is required'),
  variants: z.array(variantInputSchema).min(1, 'At least one variant is required'),
});

// Schema for updating a product (adds the id field)
export const updateProductSchema = insertProductSchema.extend({
  id: z.string().min(1, 'Id is required'),
});

// Schema for signing in
export const signInFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Schema for signing up a user. Two account types:
//  - email account (password required, mobile optional)
//  - phone account  (SMS OTP required, email optional)
// The 10-digit mobile (after +98) and mode come from the form; nulls from
// empty FormData fields are normalized to '' by the caller.
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    mode: z.enum(['email', 'phone']),
    email: z
      .union([z.string().email('Invalid email address'), z.literal('')])
      .transform((v) => v ?? ''),
    mobile: z
      .union([
        z.string().regex(/^9\d{9}$/, 'Enter the 10 digits after +98'),
        z.literal(''),
      ])
      .transform((v) => v ?? ''),
    password: z
      .union([z.string().min(6, 'Password must be at least 6 characters'), z.literal('')])
      .transform((v) => v ?? ''),
    confirmPassword: z
      .union([z.string(), z.literal('')])
      .transform((v) => v ?? ''),
    otpCode: z
      .union([z.string().regex(/^\d{4,6}$/, 'Enter the SMS code'), z.literal('')])
      .transform((v) => v ?? ''),
  })
  .refine((data) => data.mode !== 'email' || data.email.length > 3, {
    message: 'Email is required', path: ['email'],
  })
  .refine((data) => data.mode !== 'phone' || /^9\d{9}$/.test(data.mobile), {
    message: 'Enter the 10 digits after +98', path: ['mobile'],
  })
  .refine((data) => data.mode !== 'email' || data.password.length >= 6, {
    message: 'Password must be at least 6 characters', path: ['password'],
  })
  .refine(
    (data) => data.mode !== 'email' || data.password === data.confirmPassword,
    { message: "Passwords don't match", path: ['confirmPassword'] }
  )
  .refine((data) => data.mode !== 'phone' || /^\d{4,6}$/.test(data.otpCode), {
    message: 'Enter the SMS code', path: ['otpCode'],
  });

// Cart
export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  // Present when the item is a specific variant of the product
  variantId: z.string().optional(),
  variantLabel: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  nameFa: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  qty: z.number().int().positive('Quantity must be a positive number'),
  image: z.string().min(1, 'Image is required'),
  price: currency,
});

// Cart insertion schema
export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: currency,
  totalPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  sessionCartId: z.string().min(1, 'Session cart id is required'),
  userId: z.string().optional().nullable(),
});

// Update profile schema — extras are optional and editable later.
// Email/mobile changes flow exclusively through updateContact (verified).
export const updateProfileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  nationalId: z
    .string()
    .regex(/^\d{10}$/, 'Enter a valid 10-digit national ID')
    .optional()
    .or(z.literal('')),
  cardNumber: z
    .string()
    .regex(/^\d{16}$/, 'Enter a valid 16-digit card number')
    .optional()
    .or(z.literal('')),
  sheba: z
    .string()
    .regex(/^(IR)?\d{24}$/, 'Enter a valid sheba number (IR + 24 digits)')
    .optional()
    .or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
});

// Update user schema (admin)
export const updateUserSchema = z.object({
  id: z.string().min(1, 'Id is required'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  role: z.enum(['user', 'admin']),
});

// Shipping address (country removed — Iran-only storefront)
export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, 'Name must be at least 3 characters'),
  streetAddress: z.string().min(3, 'Address must be at least 3 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  province: z.string().min(2, 'Province must be at least 2 characters'),
  postalCode: z
    .string()
    .regex(/^\d{4,10}$/, 'Enter a valid postal code (digits only)'),
  phone: z
    .string()
    .regex(/^(\+?\d{7,15})$/, 'Enter a valid phone number'),
});

// Payment method
export const paymentMethodSchema = z
  .object({
    type: z.string().min(1, 'Payment method is required'),
  })
  .refine(
    (data) => (PAYMENT_METHODS as readonly string[]).includes(data.type),
    { path: ['type'], message: 'Invalid payment method' }
  );

// Insert order schema
export const insertOrderSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  itemsPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  totalPrice: currency,
  paymentMethod: z.string().refine(
    (data) => (PAYMENT_METHODS as readonly string[]).includes(data),
    { message: 'Invalid payment method' }
  ),
  shippingAddress: shippingAddressSchema,
});

// Insert order item schema
export const insertOrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  variantLabel: z.string().optional(),
  slug: z.string(),
  image: z.string(),
  name: z.string(),
  price: currency,
  qty: z.number(),
});

// Insert review schema
export const insertReviewSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  productId: z.string().min(1, 'Product is required'),
  userId: z.string().min(1, 'User is required'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
});
