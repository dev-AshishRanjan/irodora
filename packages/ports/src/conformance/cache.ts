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

    await runCase('increment creates at 1 and counts up', async () => {
      // The rate-limit primitive. `setIfAbsent` cannot express this: a counter needs an atomic
      // read-modify-write, and get-then-set lets two concurrent requests both read n and both
      // write n+1. The limiter then UNDER-counts — admitting more than its limit, silently, and
      // exactly under the concurrency it exists for.
      const cache = await create();
      expectEqual(await cache.increment('hits', 60), 1, 'first increment creates at 1');
      expectEqual(await cache.increment('hits', 60), 2, 'second increment');
      expectEqual(await cache.increment('hits', 60), 3, 'third increment');
    }),

    await runCase('increment returns the NEW value, not the old one', async () => {
      // Returning the previous value would make every limiter off by one, which is the kind of
      // defect that only shows up as "the limit is 11" long after anyone is looking.
      const cache = await create();
      await cache.increment('n', 60);
      expectEqual(await cache.increment('n', 60), 2, 'the value after incrementing');
    }),

    await runCase('increment is visible to get, as a decimal string', async () => {
      // A caller reading the counter through `get` must see the same number. An adapter storing
      // it in some binary form would be invisible until something tried to read it back.
      const cache = await create();
      await cache.increment('n', 60);
      await cache.increment('n', 60);
      expectEqual(await cache.get('n'), '2', 'get after two increments');
    }),

    await runCase('increment does NOT slide the window', async () => {
      // The defect this prevents is a throttle silently becoming a permanent ban: if the TTL is
      // extended on every increment, a client under sustained load never sees the window reset
      // and stays locked out forever.
      //
      // Asserted through the injectable clock where the adapter has one. For a real Valkey the
      // equivalent is that EXPIRE is issued only when INCR returns 1; that is asserted in the
      // adapter's own tests, because a conformance case cannot see which commands were sent.
      const cache = await create();
      await cache.increment('window', 60);
      const first = await cache.get('window');
      await cache.increment('window', 60);
      expectEqual(first, '1', 'the counter existed before the second increment');
      expectEqual(await cache.get('window'), '2', 'and counted up rather than restarting');
    }),

    await runCase('counters are independent', async () => {
      const cache = await create();
      await cache.increment('a', 60);
      await cache.increment('a', 60);
      expectEqual(await cache.increment('b', 60), 1, 'a second key starts its own count');
      expectEqual(await cache.get('a'), '2', 'and does not disturb the first');
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
