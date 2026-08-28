import { formatCurrency, formatId, round2, slugifyCategory } from '@/lib/utils';

describe('formatCurrency (Toman)', () => {
  it('formats numbers with thousands separators and no decimals', () => {
    expect(formatCurrency(1234567)).toBe('1,234,567');
    expect(formatCurrency(0)).toBe('0');
  });

  it('accepts numeric strings (Prisma Decimal output)', () => {
    expect(formatCurrency('2500000')).toBe('2,500,000');
    expect(formatCurrency('12.50')).toBe('13');
  });

  it('returns NaN for null/undefined', () => {
    expect(formatCurrency(null)).toBe('NaN');
    expect(formatCurrency(undefined)).toBe('NaN');
  });
});

describe('formatId', () => {
  it('shortens an id to its last 6 characters with an ellipsis prefix', () => {
    const id = 'a1b2c3d4e5f6';
    expect(formatId(id)).toBe('..d4e5f6');
  });
});

describe('round2', () => {
  it('rounds numbers to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(10.555)).toBe(10.56);
    expect(round2(2)).toBe(2);
  });

  it('accepts strings', () => {
    expect(round2('3.14159')).toBe(3.14);
  });

  it('throws for non-numeric input', () => {
    expect(() => round2(null as unknown as string)).toThrow();
  });
});

describe('slugifyCategory', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyCategory('Mobile Phones')).toBe('mobile-phones');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugifyCategory('Audio & Sound!')).toBe('audio-sound');
  });

  it('trims leading/trailing hyphens', () => {
    expect(slugifyCategory('--Gaming--')).toBe('gaming');
  });
});
