/**
 * Rate limiting, per IP and per identifier (api-contract §8).
 *
 * ## A fixed window, and why not something cleverer
 *
 * The window is `floor(now / windowMs)`, and it is part of the key — so a new window is a new
 * counter rather than a value someone has to reset. Nothing sweeps, nothing expires late, and a
 * process restart loses at most one window.
 *
 * Its known weakness is the boundary: a client can send `limit` requests at the end of one
 * window and `limit` more at the start of the next, so the true worst case over a sliding window
 * is **twice the limit**. A sliding-log or token bucket fixes that and costs either a stored list
 * per identifier or a read-modify-write we deliberately do not have. For the job here — blunting
 * credential stuffing and runaway clients, not metering a paid quota — 2× at the boundary is a
 * price worth paying for a primitive that cannot race.
 *
 * **It is written down rather than left for someone to discover**, because the number a limiter
 * appears to enforce and the number it actually enforces being different is exactly the kind of
 * thing that gets reported as a bug against the wrong component.
 *
 * ## It returns a decision; it does not throw
 *
 * The contract says a 429 carries `Retry-After` **and** `X-RateLimit-Reset`, always. An
 * exception cannot carry headers, so throwing from here would mean the error handler
 * reconstructing values it never computed. The caller applies the headers — on every response,
 * not only on the rejection, because a client that can see its remaining budget is one that does
 * not have to discover the limit by hitting it.
 */

import type { CachePort } from '@irodora/ports';
import { ApiError } from './errors.js';

export interface RateLimitRule {
  /** What is being limited, so per-IP and per-identifier counters cannot collide. */
  readonly bucket: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

/**
 * The defaults.
 *
 * **Uncalibrated.** No measurement produced these; they are the shape api-contract §8 describes,
 * chosen to be generous enough that a normal client never sees one. They belong in configuration
 * the moment there is traffic to size them against (F-036), and moving them is a config change
 * rather than a deploy at that point.
 */
export const RATE_LIMIT_PER_IP: RateLimitRule = { bucket: 'ip', limit: 300, windowSeconds: 60 };

/**
 * The tighter rule, for routes where an attempt is cheap for the attacker and expensive for us.
 *
 * There are **no auth routes until F-033**, so nothing applies this today. It exists — and is
 * tested against a decoy identifier — so the per-identifier half is a mechanism that has been
 * exercised rather than a branch nobody has run.
 */
export const RATE_LIMIT_PER_IDENTIFIER: RateLimitRule = {
  bucket: 'identifier',
  limit: 10,
  windowSeconds: 60,
};

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  /** Never negative: a client seeing `-4` learns how far past the line it went, which is noise. */
  readonly remaining: number;
  /** Epoch seconds at which this window ends. */
  readonly resetAt: number;
  /** Whole seconds until then, minimum 1 — `Retry-After: 0` invites an immediate retry. */
  readonly retryAfterSeconds: number;
}

/** The key. The window index is part of it, so a new window is a new counter. */
export function rateLimitKey(rule: RateLimitRule, identifier: string, nowMs: number): string {
  const window = Math.floor(nowMs / (rule.windowSeconds * 1000));
  return `ratelimit:${rule.bucket}:${identifier}:${String(window)}`;
}

/**
 * Count this request and decide.
 *
 * One `increment` call. That is the whole reason `CachePort.increment` exists: the obvious
 * `get` then `set` is a read-modify-write two concurrent requests both win, and a limiter that
 * loses updates under-enforces precisely when it matters.
 */
export async function checkRateLimit(
  cache: CachePort,
  rule: RateLimitRule,
  identifier: string,
  nowMs: number = Date.now(),
): Promise<RateLimitDecision> {
  const windowMs = rule.windowSeconds * 1000;
  const windowEndMs = (Math.floor(nowMs / windowMs) + 1) * windowMs;

  const count = await cache.increment(rateLimitKey(rule, identifier, nowMs), rule.windowSeconds);

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt: Math.ceil(windowEndMs / 1000),
    retryAfterSeconds: Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000)),
  };
}

/** The headers a response carries, whether or not it was allowed. */
export function rateLimitHeaders(decision: RateLimitDecision): Readonly<Record<string, string>> {
  return {
    'x-ratelimit-limit': String(decision.limit),
    'x-ratelimit-remaining': String(decision.remaining),
    'x-ratelimit-reset': String(decision.resetAt),
  };
}

/**
 * The error for a refused request.
 *
 * `Retry-After` is on the response rather than in the body: it is an HTTP-level instruction that
 * clients and proxies already understand, and putting it only in JSON would mean every consumer
 * writing its own backoff.
 */
export function rateLimitError(decision: RateLimitDecision): ApiError {
  return new ApiError(
    'rate_limited',
    `Too many requests. Try again in ${String(decision.retryAfterSeconds)} seconds.`,
    { limit: decision.limit, resetAt: decision.resetAt },
  );
}
