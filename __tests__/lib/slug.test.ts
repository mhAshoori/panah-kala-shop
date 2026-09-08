// Regression tests for the slug-uniqueness guard in product.actions.
// The DB lookup is mirrored here: find all slugs starting with the base,
// then take the first free candidate in the base, base-2, base-3, … chain.

function pickSlug(existing: string[], requested: string): string {
  const taken = new Set(existing.filter((s) => s.startsWith(requested)));
  if (!taken.has(requested)) return requested;
  for (let n = 2; ; n++) {
    const candidate = `${requested}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

describe('resolveUniqueSlug (mirror)', () => {
  it('returns the slug unchanged when free', () => {
    expect(pickSlug([], 'backpack')).toBe('backpack');
    expect(pickSlug(['other-item'], 'backpack')).toBe('backpack');
  });

  it('suffixes -2 when the base slug is taken', () => {
    expect(pickSlug(['backpack'], 'backpack')).toBe('backpack-2');
  });

  it('skips existing suffixes and finds the first free one', () => {
    expect(pickSlug(['backpack', 'backpack-2'], 'backpack')).toBe('backpack-3');
    expect(
      pickSlug(['backpack', 'backpack-2', 'backpack-3'], 'backpack')
    ).toBe('backpack-4');
  });

  it('is not confused by unrelated prefixed slugs', () => {
    // "backpack-red" startsWith would be true for "backpack" prefix; the
    // real query uses startsWith for candidate lookup but only exact-match
    // on the chain — so backpack-red must not force a suffix.
    expect(pickSlug(['backpack-red'], 'backpack')).toBe('backpack');
  });

  it('handles chains longer than 10', () => {
    const existing = ['x', ...Array.from({ length: 9 }, (_, i) => `x-${i + 2}`)];
    expect(pickSlug(existing, 'x')).toBe('x-11');
  });
});
