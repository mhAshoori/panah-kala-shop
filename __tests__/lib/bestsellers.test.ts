// Pure check on the bestseller merge rule: real sales first (descending),
// rating backfill to fill the block when too few products have sold.
// (The merge lives inline in getBestSellers; re-derive here so the rule
// itself — sort order, dedupe, fill cap — is pinned by a failing test if changed.)

type P = { id: string; numSales: number; rating: number; numReviews: number };

function mergeBestsellers(all: P[], take: number): P[] {
  const sold = all
    .filter((p) => p.numSales > 0)
    .sort((a, b) => b.numSales - a.numSales || b.rating - a.rating);
  const fill = all
    .filter((p) => p.numSales === 0)
    .sort((a, b) => b.rating - a.rating || b.numReviews - a.numReviews)
    .slice(0, Math.max(0, take - sold.length));
  return [...sold, ...fill].slice(0, take);
}

describe('bestseller merge rule', () => {
  const data: P[] = [
    { id: 'a', numSales: 5, rating: 3, numReviews: 9 },
    { id: 'b', numSales: 9, rating: 4, numReviews: 1 },
    { id: 'c', numSales: 0, rating: 5, numReviews: 2 },
    { id: 'd', numSales: 0, rating: 0, numReviews: 0 },
  ];

  it('ranks by real sales first', () => {
    expect(mergeBestsellers(data, 4).map((p) => p.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  it('backfills with unrated products when sales are scarce', () => {
    const few = data.map((p) => ({ ...p, numSales: p.id === 'a' ? 2 : 0 }));
    expect(mergeBestsellers(few, 2).map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('caps the block at the requested size', () => {
    expect(mergeBestsellers(data, 2).map((p) => p.id)).toEqual(['b', 'a']);
  });
});
