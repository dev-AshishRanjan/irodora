/**
 * Gate 7, API half — the HTTP surface end to end, through `app.inject`.
 *
 * ## What this catches that the unit suites cannot
 *
 * Every mechanism here was already unit-tested and passing before this file existed. **None of
 * them was attached to the server.** `mapError` was a function nobody called; `checkRateLimit`
 * counted nothing; `claimIdempotencyKey` claimed nothing. A thrown `Error` went out as Fastify's
 * default 500 carrying its own message — with the connection string in it.
 *
 * That is the argument for an e2e gate in one paragraph. A unit test proves a function behaves.
 * Only a request through the whole stack proves the function *runs*.
 *
 * ## Every error body is parsed through the published contract
 *
 * `errorBody` runs `errorResponseSchema.parse`, so each of these assertions also checks that the
 * response matches the schema the OpenAPI document publishes. A 500 whose body drifted from the
 * envelope would fail here rather than in somebody's generated client.
 *
 * ## What gate 7 does NOT cover, and it is most of the gate's charter
 *
 * The charter names Playwright, axe WCAG 2.2 A/AA, a keyboard-only journey, a simulated-CVD
 * journey, and the NFR-12 assertion that a Lens scan transmits no image bytes. **All of those are
 * the web surface, and `apps/web` does not exist until F-017.** Activating gate 7 here covers the
 * API half only. `scripts/e2e-scope.mjs` prints that on every run rather than letting a green
 * gate imply coverage it does not have — gate 9's precedent, and the honest way to activate a
 * gate whose charter outruns its subject.
 *
 * `app.inject` rather than a listening socket: no port binding, no ordering hazard between
 * suites, and the same request path Fastify serves in production.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { errorResponseSchema, PAGE_LIMIT_MAX, type ErrorResponse } from '@irodora/contracts';
import { InMemoryCache, InMemoryDatabase } from '@irodora/ports';
import type { CachePort } from '@irodora/ports';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { RATE_LIMIT_PER_IP } from '../src/http/rate-limit.js';
import { registeredRoutes } from '../src/http/route.js';
import { buildServer } from '../src/server.js';
import { buildFixtureSurface, LEAKY_SECRET, stubDatabase } from './surface.js';

const OPENAPI = join(dirname(fileURLToPath(import.meta.url)), '..', 'openapi.json');

let surface: ReturnType<typeof buildFixtureSurface> | undefined;

function fixture(options?: Parameters<typeof buildFixtureSurface>[0]) {
  surface = buildFixtureSurface(options);
  return surface;
}

afterEach(async () => {
  await surface?.app.close();
  surface = undefined;
});

/**
 * The error body, **parsed through the published contract**.
 *
 * Not a cast. A response that no longer matches `errorResponseSchema` fails here — which is the
 * only place in the suite that would notice the envelope drifting away from what the OpenAPI
 * document promises.
 */
function errorBody(response: LightMyRequestResponse): ErrorResponse {
  return errorResponseSchema.parse(response.json());
}

/** The field paths a validation failure named. Never the values — that is the point. */
function errorFields(response: LightMyRequestResponse): readonly string[] {
  const details = errorBody(response).error.details ?? {};
  const fields = details['fields'];
  return typeof fields === 'object' && fields !== null ? Object.keys(fields) : [];
}

describe('the fixture surface cannot be mistaken for the real one', () => {
  it('is absent from a server built the way production builds it', () => {
    // If this ever fails, a fixture route has reached the shipped route table.
    const { app } = buildServer({
      database: new InMemoryDatabase(),
      cache: new InMemoryCache(),
      serviceName: 'irodora-api',
      logLevel: 'silent',
    });

    expect([...registeredRoutes(app)].map((registered) => registered.url).sort()).toEqual([
      '/healthz',
      '/readyz',
    ]);
  });

  it('is absent from the published OpenAPI document', () => {
    expect(readFileSync(OPENAPI, 'utf8')).not.toContain('/v1/fixture');
  });
});

describe('a request that matches the contract', () => {
  it('is served, and carries the rate-limit headers on the way out', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/echo?n=7' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ ok: boolean; echoed: number }>()).toEqual({ ok: true, echoed: 7 });
    // On a SUCCESS, not only on a refusal. A client that can see its remaining budget does not
    // have to discover the limit by hitting it.
    expect(response.headers['x-ratelimit-limit']).toBe(String(RATE_LIMIT_PER_IP.limit));
    expect(Number(response.headers['x-ratelimit-remaining'])).toBe(RATE_LIMIT_PER_IP.limit - 1);
  });

  it('serves a path parameter the route declared', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/colors/asagi' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ slug: string }>()).toEqual({ slug: 'asagi' });
  });

  it('carries a correlation id the client can quote', async () => {
    const { app } = fixture();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/fixture/boom',
      headers: { 'x-request-id': 'trace-from-the-edge-01' },
    });

    // Honoured from the edge, so a trace does not stop at our boundary.
    expect(errorBody(response).error.requestId).toBe('trace-from-the-edge-01');
  });

  it('REFUSES a hostile request id rather than logging it', async () => {
    // An arbitrary client string ends up in every log line. A value with a newline in it is log
    // injection — a forged log entry that looks exactly like a real one.
    const { app } = fixture();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/fixture/boom',
      headers: { 'x-request-id': 'ok\nlevel=30 msg="admin login succeeded"' },
    });

    const { requestId } = errorBody(response).error;
    expect(requestId).not.toContain('\n');
    expect(requestId).not.toContain('admin login succeeded');
  });
});

describe('a request that does not match the contract', () => {
  it('is a 422 naming the field path', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/echo?n=not-a-number' });

    expect(response.statusCode).toBe(422);
    expect(errorBody(response).error.code).toBe('validation_failed');
    expect(errorFields(response)).toContain('querystring.n');
  });

  it('NEVER echoes the value it rejected', async () => {
    // A 422 that repeats the request body is a copy of user data in the client's network tab and
    // in every proxy between. The offending value here is deliberately something that would be a
    // disclosure if it came back.
    const { app } = fixture();
    const secret = 'correct-horse-battery-staple';
    const response = await app.inject({
      method: 'POST',
      url: '/v1/fixture/items',
      headers: { 'idempotency-key': 'key-for-invalid-body' },
      payload: { name: 12345, password: secret },
    });

    expect(response.statusCode).toBe(422);
    expect(response.body).not.toContain(secret);
  });

  it('turns malformed JSON into our own bad_request, not the framework message', async () => {
    const { app } = fixture();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/fixture/items',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'key-for-bad-json' },
      payload: '{"name": ',
    });

    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('bad_request');
  });

  it('answers an unknown route inside the error envelope', async () => {
    // Fastify's default 404 is a differently shaped body. A client parsing our envelope would
    // fail to parse it, which turns "no such route" into "the API is broken".
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/nothing-here' });

    expect(response.statusCode).toBe(404);
    expect(errorBody(response).error.code).toBe('not_found');
  });
});

describe('THE DECOY — a handler that throws with a secret in the message', () => {
  it('returns 500 with the secret absent from the response', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/boom' });

    expect(response.statusCode).toBe(500);
    // The whole point. Before the error handler was wired, this assertion failed: the connection
    // string went out in Fastify's default 500 body. Watched, not assumed — removing
    // `useErrorHandling` from `buildServer` turns this case red.
    expect(response.body).not.toContain(LEAKY_SECRET);
    expect(response.body).not.toContain('hunter2');
    expect(response.body).not.toContain('connection refused');
    expect(errorBody(response).error.code).toBe('internal_error');
    // And the client still gets a handle into our traces.
    expect(errorBody(response).error.requestId.length).toBeGreaterThan(0);
  });
});

describe('idempotency', () => {
  const body = { name: 'Asagi scarf' };

  it('refuses a mutation with no Idempotency-Key', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'POST', url: '/v1/fixture/items', payload: body });

    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('idempotency_key_required');
  });

  it('replays the stored response instead of running the handler twice', async () => {
    const { app, creations } = fixture();
    const send = () =>
      app.inject({
        method: 'POST',
        url: '/v1/fixture/items',
        headers: { 'idempotency-key': 'a-stable-client-key' },
        payload: body,
      });

    const first = await send();
    const second = await send();

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json<unknown>()).toEqual(first.json<unknown>());
    // The assertion that matters. Equal bodies could also mean the handler ran twice and was
    // deterministic; the counter is what distinguishes a replay from a coincidence.
    expect(creations()).toBe(1);
  });

  it('THE DECOY — the same key with a DIFFERENT body is refused, not served', async () => {
    // Silently replaying the first response for a changed request would tell a client its change
    // succeeded when it never ran. That is worse than any error.
    const { app, creations } = fixture();
    const key = 'reused-key';

    const first = await app.inject({
      method: 'POST',
      url: '/v1/fixture/items',
      headers: { 'idempotency-key': key },
      payload: { name: 'first' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/fixture/items',
      headers: { 'idempotency-key': key },
      payload: { name: 'second — a different request' },
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(errorBody(second).error.code).toBe('idempotency_key_conflict');
    expect(creations()).toBe(1);
  });

  it('does not apply to a GET, which is idempotent already', async () => {
    const { app } = fixture();
    expect((await app.inject({ method: 'GET', url: '/v1/fixture/echo?n=1' })).statusCode).toBe(200);
  });

  it('does not burn a key on a request that failed validation', async () => {
    // The reason the hook runs AFTER validation. A client that sent a bad body, was told so, and
    // fixed it must be able to retry with the same key — claiming it first would turn the
    // client's own correction into a 409.
    const { app, creations } = fixture();
    const key = 'key-survives-a-422';

    const rejected = await app.inject({
      method: 'POST',
      url: '/v1/fixture/items',
      headers: { 'idempotency-key': key },
      payload: { name: '' },
    });
    const corrected = await app.inject({
      method: 'POST',
      url: '/v1/fixture/items',
      headers: { 'idempotency-key': key },
      payload: body,
    });

    expect(rejected.statusCode).toBe(422);
    expect(corrected.statusCode).toBe(201);
    expect(creations()).toBe(1);
  });
});

describe('pagination', () => {
  it('refuses a limit above the hard ceiling rather than serving a huge page', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/list?limit=10000' });

    expect(response.statusCode).toBe(422);
    expect(errorBody(response).error.code).toBe('validation_failed');
  });

  it('serves the ceiling itself, so the limit is a boundary rather than an off-by-one', async () => {
    const { app } = fixture();
    const response = await app.inject({
      method: 'GET',
      url: `/v1/fixture/list?limit=${String(PAGE_LIMIT_MAX)}`,
    });
    expect(response.statusCode).toBe(200);
  });

  it('applies the default when no limit is sent — the AJV/Zod seam, end to end', async () => {
    // AJV admits the request without applying `.default()`; the handler parses through Zod to
    // get the value the published contract promises. If that second parse were dropped, `limit`
    // would be `undefined` here and the response would be empty rather than defaulted.
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/list' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ data: unknown[] }>().data).toHaveLength(3);
  });

  it('reports an unusable cursor without serving a page', async () => {
    const { app } = fixture();
    const response = await app.inject({ method: 'GET', url: '/v1/fixture/list?cursor=' });

    // Either layer may catch it — AJV on `minLength`, or `parsePageParams` on the branded
    // cursor. Both are refusals; asserting which one would pin an implementation detail rather
    // than the behaviour, and the behaviour is that an unusable cursor never returns rows.
    expect([400, 422]).toContain(response.statusCode);
    expect(['invalid_cursor', 'validation_failed']).toContain(errorBody(response).error.code);
  });
});

describe('rate limiting', () => {
  it('enforces the SHIPPED number, not a convenient one', async () => {
    // Deliberately exercises RATE_LIMIT_PER_IP as configured. A test against a small injected
    // rule would prove the limiter counts and prove nothing about what the server actually
    // enforces — and the number a limiter appears to enforce differing from the number it does
    // is precisely the defect `rate-limit.ts` was written to make visible.
    const { app } = fixture();

    let lastAllowed = 0;
    let firstRefusal: LightMyRequestResponse | undefined;

    for (let i = 0; i < RATE_LIMIT_PER_IP.limit + 1; i += 1) {
      const response = await app.inject({ method: 'GET', url: '/v1/fixture/echo?n=1' });
      if (response.statusCode === 200) lastAllowed = i + 1;
      else firstRefusal ??= response;
    }

    expect(lastAllowed).toBe(RATE_LIMIT_PER_IP.limit);
    expect(firstRefusal?.statusCode).toBe(429);
    expect(firstRefusal === undefined ? undefined : errorBody(firstRefusal).error.code).toBe(
      'rate_limited',
    );
    // The contract says a 429 carries both, always.
    expect(firstRefusal?.headers['retry-after']).toBeDefined();
    expect(firstRefusal?.headers['x-ratelimit-reset']).toBeDefined();
  }, 30_000);

  it('never refuses a health probe, however hard the orchestrator polls', async () => {
    // A liveness probe that gets a 429 is a container the orchestrator restarts — the limiter
    // taking down the healthy process it exists to protect.
    const { app } = fixture();
    for (let i = 0; i < RATE_LIMIT_PER_IP.limit + 5; i += 1)
      expect((await app.inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(200);
  }, 30_000);

  it('FAILS OPEN when the cache is unreachable, and the limiter is still consulted', async () => {
    // A decision, not an oversight: failing closed would turn a cache blip into a total outage.
    // The consequence — no rate limiting while the cache is down — is asserted here so it is a
    // recorded property rather than something discovered during an incident.
    let attempts = 0;
    class DeadCache extends InMemoryCache {
      override increment(): Promise<number> {
        attempts += 1;
        return Promise.reject(new Error('ECONNREFUSED'));
      }
    }
    const dead: CachePort = new DeadCache();
    const { app } = fixture({ cache: dead });

    const response = await app.inject({ method: 'GET', url: '/v1/fixture/echo?n=1' });
    expect(response.statusCode).toBe(200);
    // With no budget to report, it reports none rather than inventing one.
    expect(response.headers['x-ratelimit-remaining']).toBeUndefined();
    // The discriminating half. Without it this case passes just as well against a server with
    // NO limiter at all — a 200 and no headers is exactly what an unwired app produces, so the
    // assertion has to be that the limiter ran and chose to allow.
    expect(attempts).toBeGreaterThan(0);
  });
});

describe('the health endpoints stay different', () => {
  it('/healthz is 200 WITH THE DATABASE DOWN', async () => {
    // The whole point of the split. A liveness probe that fails on a database blip makes the
    // orchestrator restart a healthy container, turning a hiccup into an outage.
    const { app } = fixture({ database: stubDatabase(false) });
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ status: string }>().status).toBe('ok');
  });

  it('/readyz is 503 with the database down, and names which dependency', async () => {
    const { app } = fixture({ database: stubDatabase(false) });
    const response = await app.inject({ method: 'GET', url: '/readyz' });
    const report = response.json<{ status: string; checks: Record<string, string> }>();

    expect(response.statusCode).toBe(503);
    expect(report.status).toBe('not_ready');
    // "database unavailable, cache ok" is the sentence that ends an investigation.
    expect(report.checks['database']).toBe('unavailable');
    expect(report.checks['cache']).toBe('ok');
  });

  it('/readyz is 200 when everything answers', async () => {
    const { app } = fixture();
    expect((await app.inject({ method: 'GET', url: '/readyz' })).statusCode).toBe(200);
  });
});
