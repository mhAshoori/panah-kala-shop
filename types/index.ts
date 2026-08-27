import { z } from 'zod';
import {
  insertProductSchema,
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

// Standard shape returned by "use server" actions used with useActionState
export type ActionState = {
  success: boolean;
  message: string;
};
