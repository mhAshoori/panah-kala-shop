/**
 * In-memory fixed-window rate limiter for auth endpoints.
 * Suitable for a single server instance; swap for Upstash Redis when running
 * multi-instance in production (see docs/PRODUCTION_UPGRADE_PLAN.md §4.B).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodically evict expired buckets so the map cannot grow unbounded
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the caller may retry (only set when blocked) */
  retryAfterSeconds?: number;
};

/**
 * Consume one attempt for the given key.
 * @param key Stable identifier, e.g. `signin:email` or `signup:ip`
 * @param limit Max attempts per window
 * @param windowMs Window length in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true };
}

/** Clear all buckets (tests / admin reset). */
export function resetRateLimits() {
  buckets.clear();
}
