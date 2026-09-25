import {
  buildVariantKey,
  resolveVariant,
  variantLabel,
  variantSnapshot,
  cartesian,
  recomputeParent,
  valueAvailable,
  type OptionLite,
  type VariantLite,
} from '@/lib/variants';

const colorOption: OptionLite = {
  id: 'opt-color',
  name: 'color',
  nameFa: 'رنگ',
  values: [
    { id: 'v-red', value: 'Red', valueFa: 'قرمز', hex: '#D32F2F' },
    { id: 'v-blue', value: 'Blue', valueFa: 'آبی', hex: '#2255A4' },
  ],
};

const ramOption: OptionLite = {
  id: 'opt-ram',
  name: 'ram',
  nameFa: 'رم',
  values: [
    { id: 'v-8', value: '8GB', valueFa: '۸ گیگابایت' },
    { id: 'v-16', value: '16GB', valueFa: '۱۶ گیگابایت' },
  ],
};

const options = [colorOption, ramOption];

const mkVariant = (
  valueIds: string[],
  overrides: Partial<VariantLite> = {}
): VariantLite => ({
  id: `var-${valueIds.join('-')}`,
  key: buildVariantKey(valueIds),
  price: '100000',
  stock: 5,
  options: [],
  ...overrides,
});

describe('buildVariantKey', () => {
  it('is order-insensitive', () => {
    expect(buildVariantKey(['a', 'b', 'c'])).toBe(
      buildVariantKey(['c', 'a', 'b'])
    );
  });

  it('joins sorted ids with a colon', () => {
    expect(buildVariantKey(['b', 'a'])).toBe('a:b');
  });
});

describe('resolveVariant', () => {
  const variants: VariantLite[] = [
    mkVariant(['v-red', 'v-8'], { id: 'var-1', stock: 3 }),
    mkVariant(['v-red', 'v-16'], { id: 'var-2', stock: 0 }),
    mkVariant(['v-blue', 'v-8'], { id: 'var-3', stock: 7 }),
  ];

  it('finds the matching combo', () => {
    const v = resolveVariant(variants, { 'opt-color': 'v-blue', 'opt-ram': 'v-8' });
    expect(v?.id).toBe('var-3');
  });

  it('returns null when no combo matches', () => {
    expect(resolveVariant(variants, { 'opt-color': 'v-blue', 'opt-ram': 'v-16' })).toBeNull();
  });

  it('returns null for an empty selection', () => {
    expect(resolveVariant(variants, {})).toBeNull();
  });
});

describe('variantLabel', () => {
  it('joins fa labels with a slash', () => {
    const label = variantLabel(options, { 'opt-color': 'v-red', 'opt-ram': 'v-16' });
    expect(label).toBe('رنگ: قرمز / رم: ۱۶ گیگابایت');
  });

  it('skips options with no selection', () => {
    expect(variantLabel(options, { 'opt-color': 'v-blue' })).toBe('رنگ: آبی');
  });
});

describe('variantSnapshot', () => {
  it('carries fa names and hex', () => {
    const snap = variantSnapshot(options, { 'opt-color': 'v-red', 'opt-ram': 'v-8' });
    expect(snap).toEqual([
      { optionId: 'opt-color', optionFa: 'رنگ', valueId: 'v-red', valueFa: 'قرمز', hex: '#D32F2F' },
      { optionId: 'opt-ram', optionFa: 'رم', valueId: 'v-8', valueFa: '۸ گیگابایت', hex: null },
    ]);
  });
});

describe('cartesian', () => {
  it('produces 2×3 = 6 combos', () => {
    const a: OptionLite['values'] = [
      { id: 'a1', value: 'A1', valueFa: 'الف' },
      { id: 'a2', value: 'A2', valueFa: 'ب' },
    ];
    const b: OptionLite['values'] = [
      { id: 'b1', value: 'B1', valueFa: 'پ' },
      { id: 'b2', value: 'B2', valueFa: 'ت' },
      { id: 'b3', value: 'B3', valueFa: 'ث' },
    ];
    expect(cartesian([a, b])).toHaveLength(6);
  });

  it('returns [] for an empty option', () => {
    expect(cartesian([[], [{ id: 'x', value: 'X', valueFa: 'ایکس' }]])).toHaveLength(0);
  });

  it('returns singletons for one option', () => {
    const a: OptionLite['values'] = [
      { id: 'a1', value: 'A1', valueFa: 'الف' },
      { id: 'a2', value: 'A2', valueFa: 'ب' },
    ];
    expect(cartesian([a])).toHaveLength(2);
  });
});

describe('recomputeParent', () => {
  it('price = min, stock = sum, returned as integers', () => {
    const r = recomputeParent([
      { price: 120000, stock: 2 },
      { price: 90000, stock: 3 },
    ]);
    // Numbers, not strings: these are written straight into Int columns, and a
    // .toString() here would let the test stay green on a broken write path.
    expect(r).toEqual({ price: 90000, compareAtPrice: null, stock: 5 });
  });

  it('keeps the product discount when every variant carries the same ratio', () => {
    // 150000/100000, 180000/120000 and 165000/110000 are all 1.5x, so the
    // product has a single honest discount and may advertise it.
    const r = recomputeParent([
      { price: 100000, compareAtPrice: 150000, stock: 1 },
      { price: 120000, compareAtPrice: 180000, stock: 1 },
      { price: 110000, compareAtPrice: 165000, stock: 1 },
    ]);
    expect(r.compareAtPrice).toBe(150000);
    expect(r.price).toBe(100000);
  });

  it('clears the product discount when only SOME variants are discounted', () => {
    // This is the 004 analysis finding A-002. The old rule took
    // min(compareAtPrice) over non-null values, so this produced
    // {price: 100000, compareAtPrice: 150000} — a 33% product badge that only
    // one of three purchasable variants actually carried.
    const r = recomputeParent([
      { price: 100000, compareAtPrice: 150000, stock: 1 },
      { price: 120000, compareAtPrice: null, stock: 1 },
    ]);
    expect(r.compareAtPrice).toBeNull();
    expect(r.price).toBe(100000);
  });

  it('clears the product discount when the ratios differ', () => {
    const r = recomputeParent([
      { price: 100000, compareAtPrice: 150000, stock: 1 },
      { price: 120000, compareAtPrice: 200000, stock: 1 },
      { price: 110000, compareAtPrice: 121000, stock: 1 },
    ]);
    expect(r.compareAtPrice).toBeNull();
  });

  it('stock still sums, and a uniform ratio keeps its discount', () => {
    // Both are 1.5x, so the product discount is honest and survives.
    const r = recomputeParent([
      { price: 100000, compareAtPrice: 150000, stock: 2 },
      { price: 120000, compareAtPrice: 180000, stock: 3 },
    ]);
    expect(r).toEqual({ price: 100000, compareAtPrice: 150000, stock: 5 });

    // Differing ratios clear it, but the stock sum is unaffected either way.
    const mixed = recomputeParent([
      { price: 100000, compareAtPrice: 150000, stock: 2 },
      { price: 120000, compareAtPrice: 121000, stock: 3 },
    ]);
    expect(mixed).toEqual({ price: 100000, compareAtPrice: null, stock: 5 });
  });

  it('handles the empty list', () => {
    expect(recomputeParent([])).toEqual({ price: 0, compareAtPrice: null, stock: 0 });
  });
});

describe('filterVisibleCategories (via product.actions)', () => {
  it('drops empty categories with hideEmpty, keeps non-empty and opted-out', async () => {
    const { filterVisibleCategories } = await import('@/lib/category-visibility');
    const cats = [
      { id: 'a', parentId: null, hideEmpty: true, count: 3 },
      { id: 'b', parentId: null, hideEmpty: true, count: 0 },
      { id: 'c', parentId: null, hideEmpty: false, count: 0 },
      { id: 'd', parentId: 'a', hideEmpty: true, count: 0 },
      { id: 'e', parentId: 'b', hideEmpty: true, count: 0 },
    ];
    const out = filterVisibleCategories(cats);
    expect(out.map((c) => c.id).sort()).toEqual(['a', 'c', 'd']);
  });
});

describe('valueAvailable', () => {
  const snap = (valueId: string) => ({
    optionId: valueId + '-opt', optionFa: 'x', valueId, valueFa: 'x', hex: null,
  });
  const variants: VariantLite[] = [
    { id: 'v1', key: 'k1', price: '1', stock: 1, options: [snap('c-brown'), snap('d-1')] },
    { id: 'v2', key: 'k2', price: '1', stock: 1, options: [snap('c-brown'), snap('d-2')] },
    { id: 'v3', key: 'k3', price: '1', stock: 1, options: [snap('c-yellow'), snap('d-1')] },
  ];

  it('disables values with no compatible variant given the rest of the selection', () => {
    // nothing picked: everything reachable
    expect(valueAvailable(variants, {}, 'opt-color', 'c-yellow')).toBe(true);
    expect(valueAvailable(variants, {}, 'opt-design', 'd-2')).toBe(true);
    // yellow picked: design 2 unreachable
    const afterYellow = { 'opt-color': 'c-yellow' };
    expect(valueAvailable(variants, afterYellow, 'opt-design', 'd-1')).toBe(true);
    expect(valueAvailable(variants, afterYellow, 'opt-design', 'd-2')).toBe(false);
    // design 2 picked: yellow unreachable
    const afterD2 = { 'opt-design': 'd-2' };
    expect(valueAvailable(variants, afterD2, 'opt-color', 'c-brown')).toBe(true);
    expect(valueAvailable(variants, afterD2, 'opt-color', 'c-yellow')).toBe(false);
  });
});
