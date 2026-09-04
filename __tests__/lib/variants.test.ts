import {
  buildVariantKey,
  resolveVariant,
  variantLabel,
  variantSnapshot,
  cartesian,
  recomputeParent,
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
  it('price = min, stock = sum', () => {
    const r = recomputeParent([
      { price: '120000', stock: 2 },
      { price: '90000', stock: 3 },
    ]);
    expect(r).toEqual({ price: '90000', compareAtPrice: null, stock: 5 });
  });

  it('compareAtPrice = lowest non-null', () => {
    const r = recomputeParent([
      { price: '100000', compareAtPrice: '150000', stock: 1 },
      { price: '120000', compareAtPrice: '200000', stock: 1 },
      { price: '110000', compareAtPrice: null, stock: 1 },
    ]);
    expect(r.compareAtPrice).toBe('150000');
    expect(r.price).toBe('100000');
  });

  it('handles the empty list', () => {
    expect(recomputeParent([])).toEqual({ price: '0', compareAtPrice: null, stock: 0 });
  });
});
