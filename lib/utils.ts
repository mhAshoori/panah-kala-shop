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
  if (error?.name === 'ZodError') {
    // zod v4 exposes `issues`; older shapes may expose `errors`
    const issues: Array<{ message?: string; path?: (string | number)[] }> =
      error.issues ?? error.errors ?? [];
    return issues
      .map((issue) => {
        const message =
          typeof issue.message === 'string'
            ? issue.message
            : JSON.stringify(issue.message);
        return issue.path?.length
          ? `${issue.path.join('.')}: ${message}`
          : message;
      })
      .join('. ');
  } else if (
    error?.name === 'PrismaClientKnownRequestError' &&
    error?.code === 'P2002'
  ) {
    // Handle Prisma unique-constraint error
    const field = error.meta?.target ? error.meta.target[0] : 'Field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  } else {
    // Handle other errors
    return typeof error?.message === 'string'
      ? error.message
      : JSON.stringify(error?.message);
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

// Shorten an ID to its last 6 characters
export function formatId(id: string) {
  return `..${id.substring(id.length - 6)}`;
}

// Slugify an English category name
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Format a date in 3 useful ways (date-time, date-only, time-only)
export function formatDateTime(dateString: Date | string) {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    year: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    day: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  };
  const d = new Date(dateString);
  return {
    dateTime: d.toLocaleString('en-US', dateTimeOptions),
    dateOnly: d.toLocaleString('en-US', dateOptions),
    timeOnly: d.toLocaleString('en-US', timeOptions),
  };
}
