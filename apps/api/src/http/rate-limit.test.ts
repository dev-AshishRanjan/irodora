/**
 * Rate limiting — acceptance criterion 6.
 *
 * Two things here are worth more than the rest: the test that the limiter counts **exactly**
 * under concurrency (which is what `CachePort.increment` was added for, and what the previous
 * `get`+`set` shape would have failed), and the test that the window **resets** rather than
 * sliding — a throttle that never resets is a permanent ban nobody chose.
 *
 * The per-identifier rule has no auth routes to protect until F-033, so it is exercised against
 * a decoy identifier rather than left as a branch nobody has run.
 */

import { InMemoryCache } from '@irodora/ports';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.js';
import {
  checkRateLimit,
  rateLimitError,
  rateLimitHeaders,
  rateLimitKey,
  RATE_LIMIT_PER_IDENTIFIER,
  RATE_LIMIT_PER_IP,
  type RateLimitRule,
} from './rate-limit.js';

/** A small rule, so a test can exhaust it without a loop nobody reads. */
const RULE: RateLimitRule = { bucket: 'test', limit: 3, windowSeconds: 60 };

/** A clock the cache and the limiter share, so TTL behaviour is testable without sleeping. */
function fixedClock(startMs: number): { now: () => number; advance: (ms: number) => void } {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
}

describe('counting', () => {
  it('allows up to the limit and refuses the next one', async () => {
    const cache = new InMemoryCache();
    const now = 1_700_000_000_000;

    for (let i = 1; i <= RULE.limit; i += 1) {
      const decision = await checkRateLimit(cache, RULE, 'client-a', now);
      expect(decision.allowed).toBe(true);
      expect(decision.remaining).toBe(RULE.limit - i);
    }

    const refused = await checkRateLimit(cache, RULE, 'client-a', now);
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
  });

  it('never reports a negative remaining', () => {
    // A client shown `-4` learns how far past the line it went, which is noise it cannot act on.
    return (async () => {
      const cache = new InMemoryCache();
      for (let i = 0; i < RULE.limit + 5; i += 1)
        await checkRateLimit(cache, RULE, 'over', 1_700_000_000_000);
      const decision = await checkRateLimit(cache, RULE, 'over', 1_700_000_000_000);
      expect(decision.remaining).toBe(0);
    })();
  });

  it('COUNTS EXACTLY UNDER CONCURRENCY — the reason increment is a port method', async () => {
    // The `get` + `set` shape this replaced loses updates: two concurrent requests both read n
    // and both write n+1, so the limiter under-counts and admits more than its limit — silently,
    // and precisely under the concurrency it exists for.
    //
    // Ten simultaneous requests against a limit of three must produce exactly three allowances.
    const cache = new InMemoryCache();
    const decisions = await Promise.all(
      Array.from({ length: 10 }, () => checkRateLimit(cache, RULE, 'burst', 1_700_000_000_000)),
    );

    expect(decisions.filter((d) => d.allowed)).toHaveLength(RULE.limit);
    expect(decisions.filter((d) => !d.allowed)).toHaveLength(7);
  });

  it('keeps identifiers apart', async () => {
    const cache = new InMemoryCache();
    const now = 1_700_000_000_000;
    for (let i = 0; i < RULE.limit; i += 1) await checkRateLimit(cache, RULE, 'noisy', now);

    expect((await checkRateLimit(cache, RULE, 'noisy', now)).allowed).toBe(false);
    expect((await checkRateLimit(cache, RULE, 'quiet', now)).allowed).toBe(true);
  });

  it('keeps buckets apart, so per-IP and per-identifier cannot collide', async () => {
    // Both rules can see the same string — an IP and an account id are different namespaces, and
    // a shared counter would have one rule consuming the other's budget.
    const cache = new InMemoryCache();
    const now = 1_700_000_000_000;
    const same = 'same-string';

    for (let i = 0; i < RATE_LIMIT_PER_IDENTIFIER.limit; i += 1)
      await checkRateLimit(cache, RATE_LIMIT_PER_IDENTIFIER, same, now);

    expect((await checkRateLimit(cache, RATE_LIMIT_PER_IDENTIFIER, same, now)).allowed).toBe(false);
    expect((await checkRateLimit(cache, RATE_LIMIT_PER_IP, same, now)).allowed).toBe(true);
  });
});

describe('the window resets rather than sliding', () => {
  it('a refused client is allowed again in the next window', async () => {
    // The defect this catches is a throttle silently becoming a permanent ban: if the expiry
    // were refreshed on every request, a client that keeps knocking would never see it reset.
    const clock = fixedClock(1_700_000_000_000);
    const cache = new InMemoryCache(clock.now);

    for (let i = 0; i < RULE.limit; i += 1)
      await checkRateLimit(cache, RULE, 'persistent', clock.now());
    expect((await checkRateLimit(cache, RULE, 'persistent', clock.now())).allowed).toBe(false);

    // Keep knocking through the window — this is what would slide a naive implementation.
    for (let i = 0; i < 20; i += 1) {
      clock.advance(2_000);
      await checkRateLimit(cache, RULE, 'persistent', clock.now());
    }

    clock.advance(RULE.windowSeconds * 1000);
    expect((await checkRateLimit(cache, RULE, 'persistent', clock.now())).allowed).toBe(true);
  });

  it('puts the window index in the key, so a new window is a new counter', () => {
    const now = 1_700_000_000_000;
    expect(rateLimitKey(RULE, 'a', now)).toBe(rateLimitKey(RULE, 'a', now + 1_000));
    expect(rateLimitKey(RULE, 'a', now)).not.toBe(
      rateLimitKey(RULE, 'a', now + RULE.windowSeconds * 1000),
    );
  });
});

describe('what a client is told', () => {
  it('reports a reset in the future and a retry of at least one second', async () => {
    // `Retry-After: 0` invites an immediate retry, which is the opposite of what a limiter wants.
    const cache = new InMemoryCache();
    const now = 1_700_000_000_000;
    const decision = await checkRateLimit(cache, RULE, 'c', now);

    expect(decision.resetAt * 1000).toBeGreaterThan(now);
    expect(decision.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(RULE.windowSeconds);
  });

  it('carries the headers the contract requires', async () => {
    const cache = new InMemoryCache();
    const headers = rateLimitHeaders(await checkRateLimit(cache, RULE, 'c', 1_700_000_000_000));
    expect(Object.keys(headers).sort()).toEqual([
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ]);
  });

  it('is a 429 with a code the contract already closed over', () => {
    const error = rateLimitError({
      allowed: false,
      limit: 3,
      remaining: 0,
      resetAt: 1_700_000_060,
      retryAfterSeconds: 42,
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('rate_limited');
    expect(error.status).toBe(429);
    expect(error.message).toContain('42 seconds');
  });
});

describe('the known weakness, stated rather than discovered', () => {
  it('admits up to TWICE the limit across a window boundary', async () => {
    // A fixed window lets a client spend its budget at the end of one window and again at the
    // start of the next. Asserted so the number a limiter APPEARS to enforce and the number it
    // ACTUALLY enforces are not different in a way nobody wrote down — that gets reported as a
    // bug against the wrong component.
    //
    // The fix is a sliding log or token bucket, which costs either a stored list per identifier
    // or a read-modify-write we deliberately do not have. For blunting credential stuffing
    // rather than metering a paid quota, 2x at the boundary is the price of a primitive that
    // cannot race.
    const cache = new InMemoryCache();
    const windowMs = RULE.windowSeconds * 1000;
    const endOfWindow = Math.floor(1_700_000_000_000 / windowMs) * windowMs + windowMs - 1;

    let allowed = 0;
    for (let i = 0; i < RULE.limit; i += 1)
      if ((await checkRateLimit(cache, RULE, 'boundary', endOfWindow)).allowed) allowed += 1;
    for (let i = 0; i < RULE.limit; i += 1)
      if ((await checkRateLimit(cache, RULE, 'boundary', endOfWindow + 1)).allowed) allowed += 1;

    expect(allowed).toBe(RULE.limit * 2);
  });
});

describe('the per-identifier rule', () => {
  it('is tighter than the per-IP one, because an attempt is cheap for an attacker', () => {
    expect(RATE_LIMIT_PER_IDENTIFIER.limit).toBeLessThan(RATE_LIMIT_PER_IP.limit);
  });

  it('works, even though no route applies it until F-033', async () => {
    // Exercised against a decoy identifier rather than left as a branch nobody has run. When
    // F-033 adds auth routes the mechanism is one that has been watched work, not one that was
    // written and never called.
    const cache = new InMemoryCache();
    const now = 1_700_000_000_000;

    for (let i = 0; i < RATE_LIMIT_PER_IDENTIFIER.limit; i += 1)
      expect(
        (await checkRateLimit(cache, RATE_LIMIT_PER_IDENTIFIER, 'account-decoy', now)).allowed,
      ).toBe(true);

    expect(
      (await checkRateLimit(cache, RATE_LIMIT_PER_IDENTIFIER, 'account-decoy', now)).allowed,
    ).toBe(false);
  });
});
