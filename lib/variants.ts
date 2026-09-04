/**
 * Pure variant helpers — shared by the admin form (combo generation),
 * the storefront selector (resolve + label) and the server actions.
 * No Prisma/DB imports: stays client-safe and unit-testable.
 */

export type OptionValueLite = {
  id: string;
  value: string;
  valueFa: string;
  hex?: string | null;
};

export type OptionLite = {
  id: string;
  name: string;
  nameFa: string;
  values: OptionValueLite[];
};

/** Display snapshot stored on ProductVariant.options JSON / cart items. */
export type VariantOptionSnapshot = {
  optionId?: string;
  optionFa: string;
  valueId?: string;
  valueFa: string;
  hex?: string | null;
};

export type VariantLite = {
  id: string;
  key: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  stock: number;
  options: VariantOptionSnapshot[];
  image?: string | null;
};

/** Deterministic combo signature: sorted valueIds joined by ':' */
export function buildVariantKey(valueIds: string[]): string {
  return [...valueIds].sort().join(':');
}

/** Resolve a variant from the user's option selection (valueId per optionId). */
export function resolveVariant(
  variants: VariantLite[],
  selection: Record<string, string>
): VariantLite | null {
  const valueIds = Object.values(selection);
  if (valueIds.length === 0) return null;
  const key = buildVariantKey(valueIds);
  return variants.find((v) => v.key === key) ?? null;
}

/** "رنگ: آبی / طرح: گل" from the selection and the option tree. */
export function variantLabel(
  options: OptionLite[],
  selection: Record<string, string>
): string {
  return options
    .map((o) => {
      const v = o.values.find((val) => val.id === selection[o.id]);
      return v ? `${o.nameFa}: ${v.valueFa}` : null;
    })
    .filter(Boolean)
    .join(' / ');
}

/** Snapshot for a selection — stored on the variant row and cart items. */
export function variantSnapshot(
  options: OptionLite[],
  selection: Record<string, string>
): VariantOptionSnapshot[] {
  return options.flatMap((o) => {
    const v = o.values.find((val) => val.id === selection[o.id]);
    if (!v) return [];
    return [
      {
        optionId: o.id,
        optionFa: o.nameFa,
        valueId: v.id,
        valueFa: v.valueFa,
        hex: v.hex ?? null,
      },
    ];
  });
}

/** All combinations (cartesian product) — used by the admin combos table. */
export function cartesian<T>(valuesByOption: T[][]): T[][] {
  return valuesByOption.reduce<T[][]>(
    (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
    [[]]
  );
}

/**
 * Derived parent aggregates: Product.price = cheapest variant ("from" price),
 * compareAtPrice = lowest non-null variant compareAtPrice, stock = Σ variant.
 */
export function recomputeParent(variants: {
  price: { toString(): string } | number | string;
  compareAtPrice?: { toString(): string } | number | string | null;
  stock: number;
}[]): {
  price: string;
  compareAtPrice: string | null;
  stock: number;
} {
  if (variants.length === 0) {
    return { price: '0', compareAtPrice: null, stock: 0 };
  }
  const prices = variants.map((v) => Number(v.price));
  const compares = variants
    .map((v) => (v.compareAtPrice == null ? null : Number(v.compareAtPrice)))
    .filter((n): n is number => n != null);
  return {
    price: Math.min(...prices).toString(),
    compareAtPrice: compares.length ? Math.min(...compares).toString() : null,
    stock: variants.reduce((sum, v) => sum + v.stock, 0),
  };
}
