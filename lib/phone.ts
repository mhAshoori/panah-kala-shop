// Iranian mobile number normalization.
// Canonical form for storage/comparison: +989XXXXXXXXX (E.164-ish)
// Accepts: 09123456789, 9123456789, +989123456789, 00989123456789,
// 989123456789 — with optional spaces/dashes and Persian digits.

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toAsciiDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const pi = PERSIAN_DIGITS.indexOf(d);
    if (pi >= 0) return String(pi);
    return String(ARABIC_DIGITS.indexOf(d));
  });
}

/** Normalize an Iranian mobile number, or return null when invalid. */
export function normalizeIranMobile(input: string): string | null {
  if (!input) return null;
  let digits = toAsciiDigits(input).replace(/[\s\-().]/g, '');

  if (digits.startsWith('+98')) digits = digits.slice(3);
  else if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);

  return /^9\d{9}$/.test(digits) ? `+98${digits}` : null;
}
