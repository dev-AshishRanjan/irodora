import { runCacheConformance, failedCaseNames } from '@irodora/ports';
import { describe, expect, it } from 'vitest';

import { ValkeyCache } from './valkey-cache.js';

/**
 * A REAL Valkey, from `docker compose up valkey`.
 *
 * The conformance suite is the point: the in-memory adapter and this one must be
 * interchangeable, and the only honest basis for that claim is running one suite against
 * both. Skipped LOUDLY when nothing is reachable — a silent skip turns "untested" into a
 * green run.
 */
const URL = process.env['IRODORA_TEST_REDIS_URL'] ?? 'redis://localhost:6379';

const probe = new ValkeyCache({ url: URL });
const reachable = await probe.ping();
await probe.close();

if (!reachable) {
  console.warn(
    `\n  SKIPPING the Valkey adapter tests — nothing at ${URL}.\n` +
      '  The cache conformance suite is NOT covered by this run.\n' +
      '  Start one with: docker compose up -d valkey\n',
  );
}

describe.skipIf(!reachable)('the Valkey adapter conforms', () => {
  it('passes the same suite the in-memory adapter passes', async () => {
    const clients: ValkeyCache[] = [];

    try {
      const result = await runCacheConformance('valkey', () => {
        const cache = new ValkeyCache({ url: URL });
        clients.push(cache);
        return cache;
      });

      expect(failedCaseNames(result)).toStrictEqual([]);
    } finally {
      await Promise.all(clients.map((c) => c.close()));
    }
  }, 30_000);

  it('holds setIfAbsent atomically ACROSS connections', async () => {
    // The in-memory adapter is single-threaded, so its atomicity is free and proves nothing
    // about a real one. This is the case that matters: many containers, one Valkey, and only
    // one of them may win an idempotency key.
    const key = `conformance:atomic:${Date.now().toString()}`;
    const clients = Array.from({ length: 8 }, () => new ValkeyCache({ url: URL }));

    try {
      const results = await Promise.all(
        clients.map((client, i) => client.setIfAbsent(key, `writer-${String(i)}`, 30)),
      );

      expect(results.filter(Boolean)).toHaveLength(1);

      // And the value belongs to the winner, not the last writer.
      const stored = await clients[0]?.get(key);
      const winner = results.indexOf(true);
      expect(stored).toBe(`writer-${String(winner)}`);
    } finally {
      await clients[0]?.delete(key);
      await Promise.all(clients.map((c) => c.close()));
    }
  }, 30_000);
});

describe.skipIf(!reachable)('readiness at boot', () => {
  it('answers TRUE on the very first call, before the socket has settled', async () => {
    // The regression this exists for. With ioredis' offline queue disabled, a command issued
    // before the connection completes fails instantly with "Stream isn't writeable" — so the
    // first /readyz poll after a container starts would report the cache unavailable while it
    // was perfectly healthy, and the orchestrator would hold traffic off a ready container.
    //
    // No delay before the ping, on purpose. Adding one would hide exactly the defect this
    // asserts against.
    const cache = new ValkeyCache({ url: URL });

    try {
      expect(await cache.ping()).toBe(true);
    } finally {
      await cache.close();
    }
  }, 15_000);
});

describe('readiness against an unreachable cache', () => {
  it('returns false rather than throwing, and does so promptly', async () => {
    // Real I/O against a port nothing listens on. `/readyz` calls this.
    const cache = new ValkeyCache({
      url: 'redis://127.0.0.1:1',
      connectTimeoutMillis: 800,
      commandTimeoutMillis: 800,
    });

    const startedAt = Date.now();
    expect(await cache.ping()).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(5000);

    await cache.close();
  }, 15_000);
});
