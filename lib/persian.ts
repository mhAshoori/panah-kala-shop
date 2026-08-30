// Locale-aware number formatting. Persian (fa) renders native Persian digits
// (۰-۹) in the site font; English renders Latin digits.

const FORMATTERS: Record<string, Intl.NumberFormat> = {
  fa: new Intl.NumberFormat('fa-IR'),
  en: new Intl.NumberFormat('en-US'),
};

/** Format a number with locale-native digits (fa → ۱۲۳, en → 123). */
export function formatNumberLocale(
  value: number | string | null | undefined,
  locale: string
): string {
  // null/undefined/empty must show the placeholder, never "0"
  // (Number(null) === 0 would otherwise display a fake zero price)
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return '—';
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return (FORMATTERS[locale] ?? FORMATTERS.en).format(n);
}

/** Format a Toman amount with locale-native digits (no currency label). */
export function formatCurrencyLocale(
  value: number | string | null | undefined,
  locale: string
): string {
  return formatNumberLocale(value, locale);
}
