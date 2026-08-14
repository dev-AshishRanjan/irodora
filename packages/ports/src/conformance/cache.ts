/**
 * The cache conformance suite. Every adapter runs it — in-memory, Valkey, anything later.
 *
 * These are behaviours the application relies on, not an API tour. Each case exists because
 * getting it wrong produces a specific, real defect, named in the comment.
 */

import type { CachePort } from '../cache.js';
import { runCase, type ConformanceSuite, expectEqual, expectTrue } from './runner.js';

/** A factory, so each case gets a clean store and cases cannot pass by leaning on each other. */
export type CacheFactory = () => Promise<CachePort> | CachePort;

export async function runCacheConformance(
  adapter: string,
  create: CacheFactory,
): Promise<ConformanceSuite> {
  const cases = [
    await runCase('a miss returns undefined, not an error', async () => {
      const cache = await create();
      expectEqual(await cache.get('absent'), undefined, 'get on an absent key');
    }),

    await runCase('a value survives a round trip', async () => {
      const cache = await create();
      await cache.set('k', 'v', 60);
      expectEqual(await cache.get('k'), 'v', 'get after set');
    }),

    await runCase('an empty string is a value, not a miss', async () => {
      // The defect this prevents: an adapter using a falsy check reports a cached empty
      // response as a miss, so the expensive path runs on every request and nobody notices
      // because the answer is still correct.
      const cache = await create();
      await cache.set('empty', '', 60);
      expectEqual(await cache.get('empty'), '', 'get on a stored empty string');
    }),

    await runCase('delete removes the value', async () => {
      const cache = await create();
      await cache.set('k', 'v', 60);
      await cache.delete('k');
      expectEqual(await cache.get('k'), undefined, 'get after delete');
    }),

    await runCase('deleting an absent key succeeds', async () => {
      const cache = await create();
      await cache.delete('never-existed');
    }),

    await runCase('setIfAbsent wins exactly once', async () => {
      // This is the idempotency-key primitive. An adapter implementing it as get-then-set
      // lets two concurrent requests both win, which is a duplicate wardrobe item created
      // by a mobile retry — a data-quality bug the user cleans up by hand.
      const cache = await create();
      expectTrue(await cache.setIfAbsent('lock', 'first', 60), 'first setIfAbsent');
      expectEqual(await cache.setIfAbsent('lock', 'second', 60), false, 'second setIfAbsent');
      expectEqual(await cache.get('lock'), 'first', 'the first writer keeps the value');
    }),

    await runCase('setIfAbsent succeeds again after delete', async () => {
      const cache = await create();
      await cache.setIfAbsent('lock', 'first', 60);
      await cache.delete('lock');
      expectTrue(await cache.setIfAbsent('lock', 'second', 60), 'setIfAbsent after delete');
    }),

    await runCase('an expired entry is a miss', async () => {
      const cache = await create();
      await cache.set('short', 'v', 0);
      expectEqual(await cache.get('short'), undefined, 'get after a zero TTL');
    }),

    await runCase('ping answers rather than throwing', async () => {
      // /readyz calls this. A ping that throws instead of returning false turns a readiness
      // check into a 500, and the orchestrator reads that as a crash rather than as
      // "not ready yet".
      const cache = await create();
      expectTrue(await cache.ping(), 'ping on a healthy cache');
    }),
  ];

  return { suite: 'cache', adapter, cases };
}
