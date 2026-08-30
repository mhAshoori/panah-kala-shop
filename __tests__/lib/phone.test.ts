import { normalizeIranMobile } from '@/lib/phone';

describe('normalizeIranMobile', () => {
  it('normalizes the national 09… format', () => {
    expect(normalizeIranMobile('09123456789')).toBe('+989123456789');
  });

  it('normalizes the bare 9… format', () => {
    expect(normalizeIranMobile('9123456789')).toBe('+989123456789');
  });

  it('normalizes +98… and 00989… formats', () => {
    expect(normalizeIranMobile('+989123456789')).toBe('+989123456789');
    expect(normalizeIranMobile('00989123456789')).toBe('+989123456789');
    expect(normalizeIranMobile('989123456789')).toBe('+989123456789');
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizeIranMobile('+98 912 345 6789')).toBe('+989123456789');
    expect(normalizeIranMobile('0912-345-6789')).toBe('+989123456789');
    expect(normalizeIranMobile('+98 (912) 345-6789')).toBe('+989123456789');
  });

  it('converts Persian digits', () => {
    expect(normalizeIranMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('+989123456789');
  });

  it('rejects invalid numbers', () => {
    expect(normalizeIranMobile('')).toBeNull();
    expect(normalizeIranMobile('123')).toBeNull();
    expect(normalizeIranMobile('8123456789')).toBeNull(); // must start with 9
    expect(normalizeIranMobile('0912345678')).toBeNull(); // 9 digits after 0
    expect(normalizeIranMobile('091234567890')).toBeNull(); // too long
    expect(normalizeIranMobile('abc')).toBeNull();
  });
});
