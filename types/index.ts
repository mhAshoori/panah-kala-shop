import { z } from 'zod';
import {
  cartItemSchema,
  insertCartSchema,
  insertOrderItemSchema,
  insertOrderSchema,
  insertProductSchema,
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
} from '@/lib/validator';

export type Product = z.infer<typeof insertProductSchema> & {
  id: string;
  createdAt: Date;
  rating: string;
  numReviews: number;
};

export type SignInForm = z.infer<typeof signInFormSchema>;
export type SignUpForm = z.infer<typeof signUpFormSchema>;
export type Cart = z.infer<typeof insertCartSchema> & {
  id: string;
  createdAt: Date;
};
export type CartItem = z.infer<typeof cartItemSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type OrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = z.infer<typeof insertOrderSchema> & {
  id: string;
  createdAt: Date;
  isPaid: boolean;
  paidAt: Date | null;
  isDelivered: boolean;
  deliveredAt: Date | null;
  paymentAuthority?: string | null;
  paymentResult?: {
    authority?: string;
    refId?: string | number;
    code?: number;
    message?: string;
  } | null;
  orderItems: OrderItem[];
  user: { name: string; email: string };
};

// Standard shape returned by "use server" actions used with useActionState
export type ActionState = {
  success: boolean;
  message: string;
};
