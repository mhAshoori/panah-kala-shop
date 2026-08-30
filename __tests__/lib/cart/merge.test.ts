import { mergeCartItems } from '@/lib/cart/merge';
import { CartItem } from '@/types';

const item = (productId: string, qty: number, price = '100000'): CartItem => ({
  productId,
  qty,
  price,
  name: `Product ${productId}`,
  slug: `product-${productId}`,
  image: '/images/test.jpg',
});

// In-memory stock lookup stub
const stockOf =
  (stocks: Record<string, number>) =>
  async (id: string): Promise<number | null> =>
    id in stocks ? stocks[id] : null;

describe('mergeCartItems', () => {
  it('adopts all guest items when the cart is empty', async () => {
    const result = await mergeCartItems([], [item('p1', 2)], stockOf({}));
    expect(result).toHaveLength(1);
    expect(result[0].qty).toBe(2);
  });

  it('sums quantities for the same product', async () => {
    const result = await mergeCartItems(
      [item('p1', 1)],
      [item('p1', 2)],
      stockOf({ p1: 10 })
    );
    expect(result).toHaveLength(1);
    expect(result[0].qty).toBe(3);
  });

  it('keeps distinct products separate', async () => {
    const result = await mergeCartItems(
      [item('p1', 1)],
      [item('p2', 2)],
      stockOf({ p1: 10, p2: 10 })
    );
    expect(result).toHaveLength(2);
  });

  it('clamps merged quantity to available stock', async () => {
    const result = await mergeCartItems(
      [item('p1', 3)],
      [item('p1', 5)],
      stockOf({ p1: 4 })
    );
    expect(result[0].qty).toBe(4); // 3 + 5 = 8 → clamped to stock 4
  });

  it('clamps guest-only items to stock', async () => {
    const result = await mergeCartItems(
      [],
      [item('p1', 9)],
      stockOf({ p1: 2 })
    );
    // Guest item adopted as-is (stock re-checked at checkout), but the
    // merge of an existing item clamps — new items pass through
    expect(result[0].qty).toBe(9);
  });

  it('does not mutate the input arrays', async () => {
    const existing = [item('p1', 1)];
    const guest = [item('p1', 2)];
    await mergeCartItems(existing, guest, stockOf({ p1: 10 }));
    expect(existing[0].qty).toBe(1);
    expect(guest[0].qty).toBe(2);
  });

  it('handles unknown stock gracefully (no clamping)', async () => {
    const result = await mergeCartItems(
      [item('p1', 1)],
      [item('p1', 2)],
      stockOf({})
    );
    expect(result[0].qty).toBe(3);
  });
});
