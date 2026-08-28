import en from '@/messages/en.json';
import fa from '@/messages/fa.json';

// Flatten nested objects into dot-separated key paths
function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe('message catalogs', () => {
  const enKeys = flattenKeys(en).sort();
  const faKeys = flattenKeys(fa).sort();

  it('fa has exactly the same keys as en', () => {
    expect(faKeys).toEqual(enKeys);
  });

  it('has no empty values', () => {
    const check = (obj: Record<string, unknown>, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const p = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.trim()).not.toBe('');
        } else {
          check(value as Record<string, unknown>, p);
        }
      }
    };
    check(en);
    check(fa);
  });

  describe('regression keys that previously crashed the app', () => {
    it.each([
      ['checkout.cod'],
      ['checkout.cashOnDelivery'],
      ['checkout.zarinpal'],
      ['admin.font'],
      ['admin.categories'],
      ['category.title'],
      ['search.title'],
      ['review.title'],
    ])('%s resolves in both locales', (key) => {
      const resolve = (obj: Record<string, unknown>) =>
        key.split('.').reduce<unknown>(
          (acc, part) =>
            typeof acc === 'object' && acc !== null
              ? (acc as Record<string, unknown>)[part]
              : undefined,
          obj
        );
      expect(typeof resolve(en) === 'string' || typeof resolve(en) === 'object').toBe(
        true
      );
      expect(typeof resolve(fa) === 'string' || typeof resolve(fa) === 'object').toBe(
        true
      );
    });
  });
});
