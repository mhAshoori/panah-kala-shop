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

// Schema for signing up a user — mobile is required; password optional
// when the user signs up via SMS one-time code
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    mobile: z
      .string()
      .regex(/^(\+?\d{7,15})$/, 'Enter a valid phone number'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .optional()
      .or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
    otpCode: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) =>
      (data.password && data.password.length >= 6) || (data.otpCode ?? '').length >= 4,
    { message: 'Enter a password or request an SMS code', path: ['password'] }
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Cart
export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
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

// Update profile schema — extras are optional and editable later
export const updateProfileSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  nationalId: z
    .string()
    .regex(/^\d{10}$/, 'Enter a valid 10-digit national ID')
    .optional()
    .or(z.literal('')),
  mobile: z
    .string()
    .regex(/^(\+?\d{7,15})$/, 'Enter a valid phone number'),
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
