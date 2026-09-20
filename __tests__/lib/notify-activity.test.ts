// Pure-logic tests for the admin activity toast poller's diff/cap rules.
// The client lives in components/shared/admin/admin-notifications.tsx; the
// cap/dedupe rules are mirrored here as an executable contract.

import { MAX_EVENTS_PER_TICK, diffEvents, aggregateOverflow } from '@/lib/notify';


type Ev = { id: string; kind: string };

const ev = (id: string): Ev => ({ id, kind: 'order' });

describe('admin activity diff', () => {
  it('filters out already-shown ids', () => {
    const shown = new Set(['order:a']);
    expect(diffEvents([ev('order:a'), ev('order:b')], shown)).toEqual([ev('order:b')]);
  });

  it('marks fresh ids as shown', () => {
    const shown = new Set<string>();
    diffEvents([ev('order:a')], shown);
    expect(shown.has('order:a')).toBe(true);
  });

  it('caps toasts per tick', () => {
    const events = Array.from({ length: 7 }, (_, i) => ev(`o${i}`));
    expect(diffEvents(events, new Set())).toHaveLength(MAX_EVENTS_PER_TICK);
  });
});

describe('admin activity overflow aggregation', () => {
  it('computes overflow beyond cap', () => {
    expect(aggregateOverflow(7, 4)).toBe(3);
    expect(aggregateOverflow(4, 4)).toBe(0);
  });
});
