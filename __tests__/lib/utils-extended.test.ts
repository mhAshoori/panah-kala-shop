import {
  convertToPlainObject,
  formatCurrency,
  formatDateTime,
  formatError,
  formatId,
  formatNumberWithDecimal,
  round2,
  slugifyCategory,
} from '@/lib/utils';

describe('formatNumberWithDecimal', () => {
  it('pads integers to two decimals', () => {
    expect(formatNumberWithDecimal(49)).toBe('49.00');
    expect(formatNumberWithDecimal(0)).toBe('0.00');
  });

  it('pads single decimals', () => {
    expect(formatNumberWithDecimal(49.9)).toBe('49.90');
  });

  it('keeps two decimals as-is', () => {
    expect(formatNumberWithDecimal(49.99)).toBe('49.99');
  });
});

describe('round2', () => {
  it('avoids floating-point drift (0.1 + 0.2 case)', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('accepts numeric strings', () => {
    expect(round2('12.345')).toBe(12.35);
  });

  it('handles large Toman totals exactly', () => {
    expect(round2(68500000 * 3 + 0.005)).toBe(205500000.01);
  });

  it('throws on invalid input', () => {
    expect(() => round2(null as unknown as number)).toThrow();
  });
});

describe('formatError', () => {
  it('formats ZodError v4 issues with paths', () => {
    const zodError = {
      name: 'ZodError',
      issues: [
        { path: ['price'], message: 'Price must have exactly two decimal places' },
        { path: ['name'], message: 'Name must be at least 3 characters' },
      ],
    };
    const message = formatError(zodError);
    expect(message).toContain('price: Price must have exactly two decimal places');
    expect(message).toContain('name: Name must be at least 3 characters');
    expect(message).toContain('. ');
  });

  it('falls back to legacy `errors` array shape', () => {
    const legacy = {
      name: 'ZodError',
      errors: [{ path: ['email'], message: 'Invalid email address' }],
    };
    expect(formatError(legacy)).toBe('email: Invalid email address');
  });

  it('maps Prisma P2002 unique-constraint to a readable message', () => {
    const prismaError = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: { target: ['mobile'] },
    };
    expect(formatError(prismaError)).toBe('Mobile already exists');
  });

  it('passes plain Error messages through', () => {
    expect(formatError(new Error('boom'))).toBe('boom');
  });

  it('stringifies non-string messages', () => {
    expect(formatError({ message: 42 })).toBe('42');
  });
});

describe('formatCurrency', () => {
  it('groups Toman amounts without decimals', () => {
    expect(formatCurrency(68500000)).toBe('68,500,000');
    expect(formatCurrency('1234567.89')).toBe('1,234,568'); // rounded
  });

  it('returns NaN label for nullish input', () => {
    expect(formatCurrency(null)).toBe('NaN');
    expect(formatCurrency(undefined)).toBe('NaN');
  });
});

describe('convertToPlainObject', () => {
  it('serializes Dates and Decimals to plain JSON', () => {
    const input = {
      id: '1',
      createdAt: new Date('2026-08-27T10:00:00Z'),
      price: { d: ['68500000.00'], s: 6, e: 7 }, // Prisma Decimal-like
    };
    const out = convertToPlainObject(input);
    expect(out.createdAt).toBe('2026-08-27T10:00:00.000Z');
    expect(typeof out.price).toBe('object');
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it('handles arrays of rows', () => {
    const rows = [{ a: 1 }, { a: 2 }];
    expect(convertToPlainObject(rows)).toEqual(rows);
  });
});

describe('formatId', () => {
  it('shortens ids to the last 6 chars', () => {
    expect(formatId('a1b2c3d4e5f6')).toBe('..d4e5f6');
  });

  it('keeps short ids intact with the prefix', () => {
    expect(formatId('abc')).toBe('..abc');
  });
});

describe('slugifyCategory', () => {
  it('slugifies English names', () => {
    expect(slugifyCategory('Mobile Phones')).toBe('mobile-phones');
  });

  it('strips non-latin characters and trims dashes', () => {
    expect(slugifyCategory('  Audio & Sound! ')).toBe('audio-sound');
    expect(slugifyCategory('---')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('returns the three display shapes', () => {
    const parts = formatDateTime(new Date('2026-08-27T14:30:00Z'));
    expect(Object.keys(parts).sort()).toEqual(
      ['dateOnly', 'dateTime', 'timeOnly'].sort()
    );
    expect(typeof parts.dateTime).toBe('string');
    expect(parts.timeOnly).toMatch(/\d/);
  });

  it('accepts ISO strings', () => {
    const parts = formatDateTime('2026-01-01T00:00:00Z');
    expect(parts.dateOnly).toMatch(/2026/);
  });
});
