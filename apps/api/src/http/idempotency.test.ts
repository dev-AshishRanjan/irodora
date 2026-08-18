/**
 * Idempotency — acceptance criterion 4.
 *
 * The case that carries this file is **same key, different body**. Silently replaying the first
 * response there is worse than any error: a client that retried with a changed payload would be
 * told its change succeeded when it never ran. So it is refused, and the test that proves it has
 * a decoy — a same-key-same-body replay — sitting beside it, because "it threw" is only evidence
 * if the near-identical case does not.
 */

import { InMemoryCache, type CachePort } from '@irodora/ports';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.js';
import {
  assertIdempotencyKey,
  claimIdempotencyKey,
  fingerprintRequest,
  idempotencyCacheKey,
  IDEMPOTENCY_KEY_MAX,
  IDEMPOTENCY_KEY_MIN,
  IDEMPOTENCY_TTL_SECONDS,
  recordIdempotentResponse,
} from './idempotency.js';

const SCOPE = 'anonymous';
const KEY = '0f9a3c1e-7b2d-4c6a-9e18-5d0b7c2a4f31';

const create = { method: 'POST', url: '/v1/things', body: { name: 'kinari' } };

describe('the header is required on a mutation', () => {
  it('refuses a missing key, and says what to do on retry', () => {
    expect(() => assertIdempotencyKey(undefined)).toThrow(ApiError);
    expect(() => assertIdempotencyKey(undefined)).toThrow(/Send the same key if you retry/u);
  });

  it('refuses an empty one', () => {
    expect(() => assertIdempotencyKey('')).toThrow(ApiError);
  });

  it('bounds what it will store, without pretending to constrain meaning', () => {
    expect(() => assertIdempotencyKey('a'.repeat(IDEMPOTENCY_KEY_MIN - 1))).toThrow(/characters/u);
    expect(() => assertIdempotencyKey('a'.repeat(IDEMPOTENCY_KEY_MAX + 1))).toThrow(/characters/u);
    expect(assertIdempotencyKey('a'.repeat(IDEMPOTENCY_KEY_MIN))).toHaveLength(IDEMPOTENCY_KEY_MIN);
  });

  it('maps a missing key to 400 and a reused one to 409, per the contract', () => {
    expect(new ApiError('idempotency_key_required', 'x').status).toBe(400);
    expect(new ApiError('idempotency_key_conflict', 'x').status).toBe(409);
  });
});

describe('the fingerprint', () => {
  it('is stable across property order — a re-serialised retry is the same request', () => {
    // Without this, a client that rebuilt its payload from a different object would be told its
    // key was reused, which is a 409 for doing exactly what retrying means.
    expect(fingerprintRequest({ ...create, body: { a: 1, b: 2 } })).toBe(
      fingerprintRequest({ ...create, body: { b: 2, a: 1 } }),
    );
  });

  it('is stable at every depth', () => {
    expect(fingerprintRequest({ ...create, body: { o: { a: 1, b: 2 } } })).toBe(
      fingerprintRequest({ ...create, body: { o: { b: 2, a: 1 } } }),
    );
  });

  it('preserves array order, because array order is data', () => {
    expect(fingerprintRequest({ ...create, body: { xs: [1, 2] } })).not.toBe(
      fingerprintRequest({ ...create, body: { xs: [2, 1] } }),
    );
  });

  it('changes with the method, the url and the body', () => {
    const base = fingerprintRequest(create);
    expect(fingerprintRequest({ ...create, method: 'PUT' })).not.toBe(base);
    expect(fingerprintRequest({ ...create, url: '/v1/other' })).not.toBe(base);
    expect(fingerprintRequest({ ...create, body: { name: 'sumi' } })).not.toBe(base);
  });
});

describe('claiming a key', () => {
  it('the first use proceeds', async () => {
    const cache = new InMemoryCache();
    expect(await claimIdempotencyKey(cache, SCOPE, KEY, create)).toEqual({ kind: 'proceed' });
  });

  it('claims with ONE call, so two concurrent retries cannot both win', async () => {
    // `get` then `set` is a race both retries win — the duplicate the header exists to prevent,
    // and the reason CachePort has setIfAbsent rather than the two calls it decomposes into.
    const cache = new InMemoryCache();
    const [a, b] = await Promise.all([
      claimIdempotencyKey(cache, SCOPE, KEY, create),
      claimIdempotencyKey(cache, SCOPE, KEY, create).catch((error: unknown) => error),
    ]);

    const outcomes = [a, b];
    expect(outcomes.filter((o) => (o as { kind?: string }).kind === 'proceed')).toHaveLength(1);
  });

  it('replays a stored response for the same key and the same request', async () => {
    const cache = new InMemoryCache();
    await claimIdempotencyKey(cache, SCOPE, KEY, create);
    await recordIdempotentResponse(cache, SCOPE, KEY, create, 201, { id: 'thing-1' });

    const outcome = await claimIdempotencyKey(cache, SCOPE, KEY, create);
    expect(outcome).toEqual({
      kind: 'replay',
      record: { fingerprint: fingerprintRequest(create), status: 201, body: { id: 'thing-1' } },
    });
  });

  it('THE CASE THAT MATTERS — same key, different body, is refused', async () => {
    const cache = new InMemoryCache();
    await claimIdempotencyKey(cache, SCOPE, KEY, create);
    await recordIdempotentResponse(cache, SCOPE, KEY, create, 201, { id: 'thing-1' });

    const changed = { ...create, body: { name: 'sumi' } };
    await expect(claimIdempotencyKey(cache, SCOPE, KEY, changed)).rejects.toThrow(ApiError);
    await expect(claimIdempotencyKey(cache, SCOPE, KEY, changed)).rejects.toThrow(
      /told you a change succeeded that never ran/u,
    );
  });

  it('the decoy — the SAME body replays rather than throwing', async () => {
    // Without this, the assertion above could be passing because claiming twice always throws
    // [[a-decoy-that-is-not-broken-proves-nothing]]. The two calls differ only in the body.
    const cache = new InMemoryCache();
    await claimIdempotencyKey(cache, SCOPE, KEY, create);
    await recordIdempotentResponse(cache, SCOPE, KEY, create, 201, { id: 'thing-1' });

    const outcome = await claimIdempotencyKey(cache, SCOPE, KEY, create);
    expect(outcome.kind).toBe('replay');
  });

  it('refuses while the first request is still in flight rather than replaying nothing', async () => {
    const cache = new InMemoryCache();
    await claimIdempotencyKey(cache, SCOPE, KEY, create);
    // No `recordIdempotentResponse` — the handler has not finished.
    await expect(claimIdempotencyKey(cache, SCOPE, KEY, create)).rejects.toThrow(
      /still in progress/u,
    );
  });

  it('proceeds when the record expired between claiming and reading', async () => {
    // Rare, and proceeding is right: the TTL has passed, so replaying is no longer something we
    // promised. Written as a real CachePort rather than a spread of InMemoryCache — spreading a
    // class instance drops its prototype, so the stub would be a different shape than the thing
    // it is standing in for.
    const racing: CachePort = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      setIfAbsent: () => Promise.resolve(false),
      ping: () => Promise.resolve(true),
    };

    expect(await claimIdempotencyKey(racing, SCOPE, KEY, create)).toEqual({ kind: 'proceed' });
  });
});

describe('the key space', () => {
  it('is scoped, so F-033 can add an identity without re-keying every record', () => {
    expect(idempotencyCacheKey('anonymous', KEY)).not.toBe(idempotencyCacheKey('user-1', KEY));
  });

  it('two scopes do not collide today, even though every caller passes the same one', async () => {
    // The stated limitation: the key space is global until there is an authenticated identity
    // to scope by. The mechanism is already in place so that change is a caller change.
    const cache = new InMemoryCache();
    await claimIdempotencyKey(cache, 'user-1', KEY, create);
    expect(await claimIdempotencyKey(cache, 'user-2', KEY, create)).toEqual({ kind: 'proceed' });
  });

  it('honours a key for 24 hours, per api-contract section 6', () => {
    expect(IDEMPOTENCY_TTL_SECONDS).toBe(86_400);
  });
});
