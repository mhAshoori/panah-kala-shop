import { formatCurrencyLocale, formatNumberLocale } from '@/lib/persian';

describe('lib/persian — locale-aware number formatting', () => {
  describe('formatNumberLocale', () => {
    it('renders Persian digits for fa', () => {
      expect(formatNumberLocale(1234, 'fa')).toBe('۱٬۲۳۴');
      expect(formatNumberLocale(12, 'fa')).toBe('۱۲');
    });

    it('renders Latin digits for en', () => {
      expect(formatNumberLocale(1234, 'en')).toBe('1,234');
    });

    it('handles string input (DB decimal strings)', () => {
      expect(formatNumberLocale('68500000', 'fa')).toBe('۶۸٬۵۰۰٬۰۰۰');
      expect(formatNumberLocale('68500000', 'en')).toBe('68,500,000');
    });

    it('falls back to en for unknown locales', () => {
      expect(formatNumberLocale(42, 'de')).toBe('42');
    });

    it('returns an em-dash placeholder for non-numeric input', () => {
      expect(formatNumberLocale('abc', 'fa')).toBe('—');
      expect(formatNumberLocale(null, 'en')).toBe('—');
      expect(formatNumberLocale(undefined, 'en')).toBe('—');
      expect(formatNumberLocale(NaN, 'en')).toBe('—');
    });
  });

  describe('formatCurrencyLocale', () => {
    it('formats Toman amounts without decimals in Persian digits', () => {
      expect(formatCurrencyLocale('68500000.00', 'fa')).toBe('۶۸٬۵۰۰٬۰۰۰');
    });

    it('groups thousands in en', () => {
      expect(formatCurrencyLocale(500000, 'en')).toBe('500,000');
    });
  });
});
