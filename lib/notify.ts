// Pure helpers + types for the admin activity toast poller.
// Kept prisma-free so Jest (node env) and client code can both import it.

export const MAX_EVENTS_PER_TICK = 4;

export type AdminActivityEvent = {
  // unique per event so the client toast poller can dedupe
  id: string;
  // 'order' | 'payment' | 'signup' | 'question' | 'lowStock'
  kind: 'order' | 'payment' | 'signup' | 'question' | 'lowStock';
  // toast link target
  href: string;
  createdAtIso: string;
  // optional detail: order id / product name / etc.
  refId?: string;
};

export type DiffableEvent = { id: string; kind: string };

export function diffEvents<T extends DiffableEvent>(
  events: T[],
  shown: Set<string>,
  max = MAX_EVENTS_PER_TICK
): T[] {
  const fresh = events.filter((e) => !shown.has(e.id));
  fresh.forEach((e) => shown.add(e.id));
  return fresh.slice(0, max);
}

export function aggregateOverflow(count: number, max = MAX_EVENTS_PER_TICK): number {
  return Math.max(0, count - max);
}
