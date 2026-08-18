/**
 * `Idempotency-Key` on every non-idempotent mutation (api-contract §6).
 *
 * ## There is no new port, and that is deliberate
 *
 * `CachePort.setIfAbsent` already exists and its own comment says what it is for: *"This is the
 * primitive behind idempotency keys and rate limits, and it is the reason the port cannot be
 * `get` + `set`: doing it in two calls is a race that shows up as a duplicate wardrobe item on a
 * flaky mobile network."*
 *
 * F-002 anticipated this feature. Adding an `IdempotencyPort` would be a second interface over
 * the same store, a second adapter to write, and a second conformance suite to keep honest — for
 * a capability the existing port was designed to provide. So this is a plugin over `CachePort`,
 * and the Valkey adapter it will run against in production already exists.
 *
 * ## The three outcomes, and why the middle one is the whole point
 *
 * | request | outcome |
 * |---|---|
 * | first use of a key | proceeds; the response is stored under it |
 * | same key, **same** request | the stored response is replayed, handler not run |
 * | same key, **different** request | `409 idempotency_key_conflict` |
 *
 * The third is the one that matters. Silently replaying the first response for a *different*
 * request is worse than any error: a client that retried with a changed body would be told its
 * change succeeded when it never ran. So the stored record carries a **fingerprint** of the
 * request, and a mismatch is refused rather than served.
 *
 * ## What the fingerprint covers, and what it cannot
 *
 * Method, URL and body. Not headers — an `Authorization` that rotates mid-retry would otherwise
 * read as a different request, and the tenancy question is F-034's, enforced by the row-level
 * policy rather than by a cache key.
 *
 * **The honest limit:** two different users presenting the same key collide, because the key
 * space here is global. That is correct for F-015, where there is no authenticated identity to
 * scope by, and it becomes wrong the moment F-033 lands. The key builder takes a `scope` for
 * exactly that reason, and today every caller passes the same one.
 */

import type { CachePort } from '@irodora/ports';
import { createHash } from 'node:crypto';
import { ApiError } from './errors.js';

/** How long a key is honoured. api-contract §6: 24 hours. */
export const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

export const IDEMPOTENCY_HEADER = 'idempotency-key';

/** Keys are client-generated; this bounds what we will store, not what they may mean. */
export const IDEMPOTENCY_KEY_MIN = 8;
export const IDEMPOTENCY_KEY_MAX = 255;

export interface IdempotentRequest {
  readonly method: string;
  readonly url: string;
  readonly body: unknown;
}

/** What is stored under a key: enough to detect reuse, and the response to replay. */
export interface IdempotencyRecord {
  readonly fingerprint: string;
  readonly status: number;
  readonly body: unknown;
}

/**
 * A stable fingerprint of the request.
 *
 * `JSON.stringify` on the body with sorted keys: two requests that differ only in property order
 * are the same request, and treating them as different would turn a legitimate retry from a
 * client that re-serialised its payload into a 409.
 */
export function fingerprintRequest(request: IdempotentRequest): string {
  const canonical = JSON.stringify({
    method: request.method.toUpperCase(),
    url: request.url,
    body: sortKeys(request.body),
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
  );
}

/**
 * The cache key.
 *
 * `scope` exists so F-033 can pass an authenticated identity without changing this signature or
 * silently re-keying every stored record. Until then it is a constant, and the limitation is
 * stated in the module comment rather than discovered later.
 */
export function idempotencyCacheKey(scope: string, key: string): string {
  return `idempotency:${scope}:${key}`;
}

export function assertIdempotencyKey(raw: string | undefined): string {
  if (raw === undefined || raw.length === 0)
    throw new ApiError(
      'idempotency_key_required',
      'This request changes state and needs an Idempotency-Key header. Send the same key if ' +
        'you retry, so a network failure cannot apply the change twice.',
    );

  if (raw.length < IDEMPOTENCY_KEY_MIN || raw.length > IDEMPOTENCY_KEY_MAX)
    throw new ApiError(
      'bad_request',
      `Idempotency-Key must be ${String(IDEMPOTENCY_KEY_MIN)}-${String(IDEMPOTENCY_KEY_MAX)} ` +
        'characters. A UUID is a good choice.',
    );

  return raw;
}

export type IdempotencyOutcome =
  { readonly kind: 'proceed' } | { readonly kind: 'replay'; readonly record: IdempotencyRecord };

/**
 * Claim a key, or say what to do instead.
 *
 * The claim is `setIfAbsent`, in **one** call. Doing it as `get` then `set` is a race two
 * concurrent retries win together — which is exactly the duplicate the header exists to prevent,
 * and exactly why `CachePort` has this primitive rather than the two it decomposes into.
 */
export async function claimIdempotencyKey(
  cache: CachePort,
  scope: string,
  key: string,
  request: IdempotentRequest,
): Promise<IdempotencyOutcome> {
  const cacheKey = idempotencyCacheKey(scope, key);
  const fingerprint = fingerprintRequest(request);

  const won = await cache.setIfAbsent(
    cacheKey,
    JSON.stringify({ fingerprint, status: 0, body: null } satisfies IdempotencyRecord),
    IDEMPOTENCY_TTL_SECONDS,
  );
  if (won) return { kind: 'proceed' };

  const stored = await cache.get(cacheKey);
  if (stored === undefined)
    // The entry expired between `setIfAbsent` losing and `get` reading. Rare, and proceeding is
    // the right answer: the TTL has passed, so replaying is no longer something we promised.
    return { kind: 'proceed' };

  const record = JSON.parse(stored) as IdempotencyRecord;

  if (record.fingerprint !== fingerprint)
    throw new ApiError(
      'idempotency_key_conflict',
      'This Idempotency-Key was already used for a different request. Reusing a key with a ' +
        'changed body would have told you a change succeeded that never ran, so it is refused.',
    );

  // status 0 is the placeholder written when the key was claimed: the first request is still in
  // flight. Replaying nothing would be wrong, so the client is asked to retry.
  if (record.status === 0)
    throw new ApiError(
      'conflict',
      'A request with this Idempotency-Key is still in progress. Retry shortly.',
    );

  return { kind: 'replay', record };
}

/** Store the response so a retry with the same key replays it rather than re-running. */
export async function recordIdempotentResponse(
  cache: CachePort,
  scope: string,
  key: string,
  request: IdempotentRequest,
  status: number,
  body: unknown,
): Promise<void> {
  await cache.set(
    idempotencyCacheKey(scope, key),
    JSON.stringify({
      fingerprint: fingerprintRequest(request),
      status,
      body,
    } satisfies IdempotencyRecord),
    IDEMPOTENCY_TTL_SECONDS,
  );
}
