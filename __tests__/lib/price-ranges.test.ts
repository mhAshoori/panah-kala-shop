// Regression tests for the search price-filter pipeline.
// parsePriceFilter guards Prisma against NaN crashes; the label formatter
// must handle the open-ended range "60000000-" whose Number('') is 0, not NaN.

// Mirrors the (private) sanitizer in lib/actions/product.actions.ts
function parsePriceFilter(
  price: string | undefined
): { gte: number; lte?: number } | undefined {
  if (!price || price === 'all') return undefined;
  const [minRaw, maxRaw] = price.split('-');
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!Number.isFinite(min) || min < 0) return undefined;
  return {
    gte: min,
    ...(Number.isFinite(max) && max >= min ? { lte: max } : {}),
  };
}

// Mirrors the label logic in app/(root)/search/page.tsx
function priceLabel(
  range: string,
  t: { priceAny: string; priceOver: string; priceUnder: string }
): string {
  if (range === 'all') return t.priceAny;
  const [minRaw, maxRaw] = range.split('-');
  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
  if (maxRaw === '') return `${t.priceOver} ${fmt(Number(minRaw))}`;
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (min === 0) return `${t.priceUnder} ${fmt(max)}`;
  return `${fmt(min)} - ${fmt(max)}`;
}

describe('parsePriceFilter', () => {
  it('returns undefined for "all" or missing', () => {
    expect(parsePriceFilter('all')).toBeUndefined();
    expect(parsePriceFilter(undefined)).toBeUndefined();
    expect(parsePriceFilter('')).toBeUndefined();
  });

  it('parses a closed range', () => {
    expect(parsePriceFilter('1000000-3000000')).toEqual({
      gte: 1000000,
      lte: 3000000,
    });
  });

  it('parses an open-ended range without lte', () => {
    expect(parsePriceFilter('60000000-')).toEqual({ gte: 60000000 });
  });

  it('parses "0-x" as lte-only (gte 0 is harmless)', () => {
    const result = parsePriceFilter('0-10000000');
    expect(result?.gte).toBe(0);
    expect(result?.lte).toBe(10000000);
  });

  it('never returns NaN for garbage input (Prisma 500 guard)', () => {
    expect(parsePriceFilter('abc-def')).toBeUndefined();
    expect(parsePriceFilter('10-')).toEqual({ gte: 10 });
    // min > max → lte dropped, gte stays (still valid, matches nothing bad)
    expect(parsePriceFilter('500-100')).toEqual({ gte: 500 });
  });
});

describe('priceLabel', () => {
  const t = { priceAny: 'Any', priceOver: 'Over', priceUnder: 'Under' };

  it('returns the "any" label', () => {
    expect(priceLabel('all', t)).toBe('Any');
  });

  it('labels the open-ended range as "Over X" — not "X - 0"', () => {
    expect(priceLabel('60000000-', t)).toBe('Over 60,000,000');
  });

  it('labels the from-zero range as "Under X"', () => {
    expect(priceLabel('0-10000000', t)).toBe('Under 10,000,000');
  });

  it('labels a closed range as "min - max"', () => {
    expect(priceLabel('10000000-30000000', t)).toBe('10,000,000 - 30,000,000');
  });
});
