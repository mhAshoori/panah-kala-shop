/**
 * Storefront category visibility — pure and unit-testable.
 * A category with hideEmpty=true disappears from the storefront while it
 * (and its subtree) has no products; the admin can opt out per category.
 */
export function filterVisibleCategories<
  T extends {
    id: string;
    parentId: string | null;
    hideEmpty: boolean;
    count: number;
  },
>(categories: T[]): T[] {
  const hasVisibleProducts = (c: T) => c.count > 0 || !c.hideEmpty;
  const visibleIds = new Set(
    categories.filter(hasVisibleProducts).map((c) => c.id)
  );
  // Keep children of visible parents (a child's own count may be 0 while
  // its parent aggregates products)
  return categories.filter(
    (c) =>
      visibleIds.has(c.id) ||
      (c.parentId != null && visibleIds.has(c.parentId))
  );
}
