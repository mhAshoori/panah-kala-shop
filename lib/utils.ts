import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert Prisma result to a plain JS object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Format number with exactly two decimal places
export function formatNumberWithDecimal(num: number): string {
  const [int, decimal] = num.toString().split('.');
  return decimal ? `${int}.${decimal.padEnd(2, '0')}` : `${int}.00`;
}

// Format error messages for server actions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(error: any): string {
  if (error.name === 'ZodError') {
    // Handle Zod error
    const fieldErrors = Object.keys(error.errors).map((field) => {
      const message = error.errors[field].message;
      return typeof message === 'string' ? message : JSON.stringify(message);
    });

    return fieldErrors.join('. ');
  } else if (
    error.name === 'PrismaClientKnownRequestError' &&
    error.code === 'P2002'
  ) {
    // Handle Prisma unique-constraint error
    const field = error.meta?.target ? error.meta.target[0] : 'Field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  } else {
    // Handle other errors
    return typeof error.message === 'string'
      ? error.message
      : JSON.stringify(error.message);
  }
}

// Round number/string to 2 decimal places (avoids FP rounding errors)
export const round2 = (value: number | string) => {
  if (typeof value === 'number') {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  } else if (typeof value === 'string') {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  } else {
    throw new Error('value is not a number nor a string');
  }
};

// Currency formatter for Toman amounts (grouped, no decimals)
const TOMAN_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

// Format currency (Toman). The unit label ("تومان") is rendered by callers.
export function formatCurrency(amount: number | string | null | undefined) {
  if (typeof amount === 'number') return TOMAN_FORMATTER.format(amount);
  if (typeof amount === 'string') return TOMAN_FORMATTER.format(Number(amount));
  return 'NaN';
}

// Prefix an internal path with the active locale unless it is already prefixed or absolute
export function withLocalePath(path: string, locale: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (clean.startsWith(`/${locale}/`) || clean === `/${locale}`) return clean;
  const suffix = clean === '/' ? '' : clean;
  return `/${locale}${suffix}`;
}
