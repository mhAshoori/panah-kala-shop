// Pure discount helpers shared by product cards, the PDP and JSON-LD.
// A discount exists only when compareAtPrice is present and strictly
// greater than the selling price (avoids 0% / negative nonsense badges).

export type DiscountInfo = {
  /** 0–99, rounded down */
  percent: number;
  /** Toman saved per unit */
  saveAmount: number;
};

export function getDiscount(
  price: string | number,
  compareAtPrice?: string | number | null
): DiscountInfo | null {
  if (compareAtPrice === null || compareAtPrice === undefined) return null;

  const p = Number(price);
  const cmp = Number(compareAtPrice);

  if (!Number.isFinite(p) || !Number.isFinite(cmp)) return null;
  if (cmp <= p) return null;

  const percent = Math.floor(((cmp - p) / cmp) * 100);
  if (percent <= 0) return null;

  return { percent, saveAmount: Math.round(cmp - p) };
}
