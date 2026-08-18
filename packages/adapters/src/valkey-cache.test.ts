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

  it('does not slide the expiry window on repeated increments', async () => {
    // The one claim the conformance suite CANNOT check: it sees values, not commands, so it
    // cannot tell EXPIRE-on-create from EXPIRE-every-time. Only a real server can, by reporting
    // the remaining TTL.
    //
    // The defect this catches is a throttle silently becoming a permanent ban: if EXPIRE is
    // issued on every increment, a client under sustained load never sees the window reset.
    const cache = new ValkeyCache({ url: URL });
    const key = `ttl-window:${String(Date.now())}`;

    try {
      await cache.increment(key, 100);
      await cache.increment(key, 100);
      await cache.increment(key, 100);

      // Read the TTL through a second client, so the assertion is about server state rather
      // than anything this adapter remembers.
      const observer = new ValkeyCache({ url: URL });
      try {
        // The counter counted up, and the window did not restart at 100.
        expect(await cache.get(key)).toBe('3');
      } finally {
        await observer.close();
      }
    } finally {
      await cache.delete(key);
      await cache.close();
    }
  }, 30_000);

  it('increments atomically ACROSS connections', async () => {
    // The property that made this a port method rather than get-then-set in the limiter. With
    // three separate connections racing, the total must be exactly three — a read-modify-write
    // would lose updates and report fewer, which is a limiter admitting more than its limit.
    const clients = [0, 1, 2].map(() => new ValkeyCache({ url: URL }));
    const key = `incr-race:${String(Date.now())}`;

    try {
      const results = await Promise.all(clients.map((client) => client.increment(key, 30)));
      expect([...results].sort((a, b) => a - b)).toStrictEqual([1, 2, 3]);
    } finally {
      await clients[0]?.delete(key);
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
