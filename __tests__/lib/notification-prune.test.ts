// Prune simulation: when count > cap, the cutoff (skip = count - prune)/
// delete-everything-at-or-below-cutoff strategy keeps exactly cap-1 newest rows.
import { pruneCount, NOTIFICATION_LOG_CAP } from '@/lib/notification-events';

// Mirrors the recordNotification prune branch without prisma.
function simulatePrune(count: number, keepBefore = NOTIFICATION_LOG_CAP - 1) {
  const prune = pruneCount(count);
  if (prune === 0) return 0;
  const skip = count - prune; // rows kept before the cutoff
  expect(skip).toBe(keepBefore);
  return prune;
}

describe('notification rolling cap (5,000)', () => {
  it('below cap → no delete', () => {
    expect(simulatePrune(4999)).toBe(0);
    expect(simulatePrune(0)).toBe(0);
    expect(simulatePrune(1)).toBe(0);
  });

  it('at/over cap → deletes exact overflow, keeps cap-1', () => {
    expect(simulatePrune(5000)).toBe(1);
    expect(simulatePrune(6170)).toBe(1171);
  });
});
