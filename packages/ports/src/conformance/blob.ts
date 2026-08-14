/**
 * The blob-store conformance suite.
 */

import type { BlobStorePort } from '../blob.js';
import { runCase, type ConformanceSuite, expectEqual, expectTrue } from './runner.js';

export type BlobFactory = () => Promise<BlobStorePort> | BlobStorePort;

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);

/** Turns an unexpected miss into a readable conformance failure rather than a null-assertion crash. */
function requireBytes(value: Uint8Array | undefined, what: string): Uint8Array {
  if (value === undefined) throw new Error(`${what}: expected bytes, got undefined`);
  return value;
}

export async function runBlobConformance(
  adapter: string,
  create: BlobFactory,
): Promise<ConformanceSuite> {
  const cases = [
    await runCase('an absent key returns undefined', async () => {
      const store = await create();
      expectEqual(await store.get('absent'), undefined, 'get on an absent key');
    }),

    await runCase('bytes survive a round trip unchanged', async () => {
      const store = await create();
      await store.put('k', bytes(0, 1, 254, 255), 'application/octet-stream');
      const got = requireBytes(await store.get('k'), 'round-tripped bytes');
      expectEqual([...got], [0, 1, 254, 255], 'round-tripped bytes');
    }),

    await runCase('an empty object is stored, not treated as absent', async () => {
      // A zero-byte upload is legitimate, and an adapter that conflates it with "missing"
      // makes a wardrobe image silently disappear rather than fail loudly.
      const store = await create();
      await store.put('empty', bytes(), 'application/octet-stream');
      const got = await store.get('empty');
      expectTrue(got !== undefined, 'an empty object is present');
      expectEqual(got?.byteLength, 0, 'its length');
    }),

    await runCase('head reports size and content type without the body', async () => {
      const store = await create();
      await store.put('k', bytes(1, 2, 3), 'image/avif');
      expectEqual(await store.head('k'), { key: 'k', size: 3, contentType: 'image/avif' }, 'head');
    }),

    await runCase('head on an absent key returns undefined', async () => {
      const store = await create();
      expectEqual(await store.head('absent'), undefined, 'head on an absent key');
    }),

    await runCase('delete is idempotent', async () => {
      // DSR erasure (F-035) retries. An adapter that throws on a second delete turns a
      // completed erasure into a failed job, which reads as data that was not erased.
      const store = await create();
      await store.put('k', bytes(1), 'application/octet-stream');
      await store.delete('k');
      await store.delete('k');
      expectEqual(await store.get('k'), undefined, 'get after two deletes');
    }),

    await runCase('a stored blob is not aliased to the caller buffer', async () => {
      // The caller reusing its buffer must not mutate what was stored. An S3 adapter cannot
      // alias, so an in-memory one that does would let a test pass against behaviour the
      // real adapter does not have.
      const store = await create();
      const buffer = bytes(1, 2, 3);
      await store.put('k', buffer, 'application/octet-stream');
      buffer[0] = 99;
      const stored = requireBytes(await store.get('k'), 'stored bytes after caller mutation');
      expectEqual([...stored], [1, 2, 3], 'stored bytes after caller mutation');
    }),

    await runCase('ping answers rather than throwing', async () => {
      const store = await create();
      expectTrue(await store.ping(), 'ping on a healthy store');
    }),
  ];

  return { suite: 'blob', adapter, cases };
}
