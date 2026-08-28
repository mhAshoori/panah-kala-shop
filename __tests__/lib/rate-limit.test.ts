import { rateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows attempts under the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('signin:a@b.com', 5, 60_000).allowed).toBe(true);
    }
  });

  it('blocks attempts over the limit and reports retry-after', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('signin:x@y.com', 5, 60_000);
    }
    const result = rateLimit('signin:x@y.com', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('signin:one@test.com', 5, 60_000);
    }
    expect(rateLimit('signin:one@test.com', 5, 60_000).allowed).toBe(false);
    expect(rateLimit('signin:two@test.com', 5, 60_000).allowed).toBe(true);
  });

  it('resets after the window expires', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      rateLimit('signin:win@test.com', 5, 1000);
    }
    expect(rateLimit('signin:win@test.com', 5, 1000).allowed).toBe(false);

    jest.advanceTimersByTime(1100);
    expect(rateLimit('signin:win@test.com', 5, 1000).allowed).toBe(true);
    jest.useRealTimers();
  });

  it('does not block other keys when sweeping expired buckets', () => {
    jest.useFakeTimers();
    rateLimit('signup:old@test.com', 1, 1000);
    jest.advanceTimersByTime(6 * 60 * 1000); // trigger a sweep
    expect(rateLimit('signup:new@test.com', 1, 60_000).allowed).toBe(true);
    jest.useRealTimers();
  });
});
