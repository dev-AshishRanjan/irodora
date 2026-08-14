import { InMemoryCache, InMemoryDatabase } from '@irodora/ports';
import type { CachePort } from '@irodora/ports';
import { describe, expect, it } from 'vitest';

import { buildServer } from './server.js';

function serverWith(overrides: {
  database?: InMemoryDatabase;
  cache?: CachePort;
  now?: () => number;
}) {
  return buildServer({
    database: overrides.database ?? new InMemoryDatabase(),
    cache: overrides.cache ?? new InMemoryCache(),
    serviceName: 'api',
    logLevel: 'silent',
    ...(overrides.now ? { now: overrides.now } : {}),
  });
}

describe('/healthz answers about the process only', () => {
  it('is 200 when everything is healthy', async () => {
    const app = serverWith({});
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'api' });
    await app.close();
  });

  it('STAYS 200 while the database is unreachable', async () => {
    // The whole reason the two endpoints are separate. If /healthz checked the database, a
    // brief Postgres blip would fail the liveness probe, the orchestrator would restart a
    // healthy container, and a hiccup would become an outage. Coolify and Dokploy both
    // restart on probe failure without ceremony.
    const database = new InMemoryDatabase();
    database.setReachable(false);

    const app = serverWith({ database });
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('reports uptime from a real clock rather than a constant', async () => {
    let clock = 1_000_000;
    const app = serverWith({ now: () => clock });

    clock += 42_000;
    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.json()).toMatchObject({ uptimeSeconds: 42 });
    await app.close();
  });
});

describe('/readyz answers about dependencies', () => {
  it('is 200 and ready when database and cache both answer', async () => {
    const app = serverWith({});
    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toStrictEqual({
      status: 'ready',
      checks: { database: 'ok', cache: 'ok' },
    });
    await app.close();
  });

  it('is 503 — not 500 — when the database is unreachable', async () => {
    // 503 tells the orchestrator to stop routing traffic here. 500 tells it the container is
    // broken, which is a different and wrong response to a dependency being briefly away.
    const database = new InMemoryDatabase();
    database.setReachable(false);

    const app = serverWith({ database });
    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toStrictEqual({
      status: 'not_ready',
      checks: { database: 'unavailable', cache: 'ok' },
    });
    await app.close();
  });

  it('names WHICH dependency is down rather than short-circuiting', async () => {
    // "database ok, cache unavailable" is the sentence that ends an investigation.
    // "not ready" is the sentence that starts one.
    const cache: CachePort = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      setIfAbsent: () => Promise.resolve(true),
      ping: () => Promise.resolve(false),
    };

    const app = serverWith({ cache });
    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.json()).toStrictEqual({
      status: 'not_ready',
      checks: { database: 'ok', cache: 'unavailable' },
    });
    await app.close();
  });

  it('treats a ping that THROWS as unavailable, not as a 500', async () => {
    // Readiness is exactly where an adapter's unhappy path is least exercised. A throwing
    // ping must not become a 500 — the orchestrator would read that as a broken container.
    const cache: CachePort = {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      setIfAbsent: () => Promise.resolve(true),
      ping: () => Promise.reject(new Error('ECONNREFUSED')),
    };

    const app = serverWith({ cache });
    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ checks: { cache: 'unavailable' } });
    await app.close();
  });

  it('recovers without a restart once the dependency returns', async () => {
    // The point of readiness: the container is not broken, it was waiting. A probe that
    // cannot recover would make every dependency blip a permanent removal from the pool.
    const database = new InMemoryDatabase();
    const app = serverWith({ database });

    database.setReachable(false);
    expect((await app.inject({ method: 'GET', url: '/readyz' })).statusCode).toBe(503);

    database.setReachable(true);
    expect((await app.inject({ method: 'GET', url: '/readyz' })).statusCode).toBe(200);

    await app.close();
  });
});
