import { describe, expect, it } from 'vitest';

import type { BlobMetadata, BlobStorePort } from '../blob.js';
import type { CachePort, TtlSeconds } from '../cache.js';
import type { DatabasePort } from '../database.js';
import { InMemoryBlobStore } from '../memory/blob.js';
import { InMemoryCache } from '../memory/cache.js';
import { InMemoryDatabase, InMemoryLockTable } from '../memory/database.js';
import { runBlobConformance } from './blob.js';
import { runCacheConformance } from './cache.js';
import { runDatabaseConformance } from './database.js';
import { allPassed, failedCaseNames } from './runner.js';

describe('the in-memory adapters conform', () => {
  it('cache', async () => {
    const result = await runCacheConformance('in-memory', () => new InMemoryCache());

    expect(failedCaseNames(result)).toStrictEqual([]);
    expect(result.cases.length).toBeGreaterThanOrEqual(9);
  });

  it('blob store', async () => {
    const result = await runBlobConformance('in-memory', () => new InMemoryBlobStore());

    expect(failedCaseNames(result)).toStrictEqual([]);
    expect(result.cases.length).toBeGreaterThanOrEqual(8);
  });

  it('database', async () => {
    // One shared lock table across instances — the suite's release-on-throw case acquires
    // from a second connection, and per-instance locks would make it pass vacuously.
    const locks = new InMemoryLockTable();
    const result = await runDatabaseConformance('in-memory', () => new InMemoryDatabase({ locks }));

    expect(failedCaseNames(result)).toStrictEqual([]);
    expect(result.cases.length).toBeGreaterThanOrEqual(5);
  });
});

describe('the advisory-lock suite can fail', () => {
  /**
   * Holds the lock forever once the body throws.
   *
   * The realistic bug: an implementation that releases the lock after `await body()` instead
   * of in a `finally`. A migration that fails then leaves the lock held, every subsequent
   * boot skips migrating, and the schema silently stays behind — which surfaces as a query
   * error days later, nowhere near the cause.
   */
  class LeakyLockDatabase implements DatabasePort {
    // Server-side, like the real thing — the leak has to be visible to a SECOND connection
    // or the decoy proves nothing.
    readonly #held: Set<bigint>;

    constructor(held: Set<bigint>) {
      this.#held = held;
    }

    ping(): Promise<boolean> {
      return Promise.resolve(true);
    }

    async withAdvisoryLock<T>(
      lockKey: bigint,
      body: () => Promise<T>,
    ): Promise<{ acquired: true; value: T } | { acquired: false }> {
      if (this.#held.has(lockKey)) return { acquired: false };
      this.#held.add(lockKey);

      const value = await body(); // no finally — the leak
      this.#held.delete(lockKey);

      return { acquired: true, value };
    }

    close(): Promise<void> {
      return Promise.resolve();
    }
  }

  it('catches a lock that is not released when the migration fails', async () => {
    const held = new Set<bigint>();
    const result = await runDatabaseConformance(
      'broken:leaky-lock',
      () => new LeakyLockDatabase(held),
    );

    expect(allPassed(result)).toBe(false);
    expect(failedCaseNames(result)).toContain('the lock is released even when the body throws');
  });
});

/**
 * The suites are proven to be able to fail.
 *
 * > A conformance case that cannot fail launders every adapter through it.
 *
 * The broken adapters below are not random — each reproduces a mistake a real adapter makes.
 * `FalsyCache` uses a truthiness check, which is what someone writes first. `AliasingBlob`
 * stores the caller's buffer, which is what an in-memory adapter does unless someone thought
 * about it. If a suite passed these, it would be checking nothing.
 */
describe('the suites can fail', () => {
  /** Reads an empty string as a miss — the truthiness bug. */
  class FalsyCache extends InMemoryCache {
    override async get(key: string): Promise<string | undefined> {
      const value = await super.get(key);
      // The bug, written the way it actually gets written. NOT `?? undefined` — that would
      // only catch null, which is exactly the behaviour this decoy must not have.
      if (!value) return undefined;
      return value;
    }
  }

  /** get-then-set instead of an atomic operation — two concurrent callers both win. */
  class RacyCache implements CachePort {
    readonly #inner = new InMemoryCache();

    get(key: string): Promise<string | undefined> {
      return this.#inner.get(key);
    }
    set(key: string, value: string, ttl: TtlSeconds): Promise<void> {
      return this.#inner.set(key, value, ttl);
    }
    delete(key: string): Promise<void> {
      return this.#inner.delete(key);
    }
    async setIfAbsent(key: string, value: string, ttl: TtlSeconds): Promise<boolean> {
      await this.#inner.set(key, value, ttl);
      return true;
    }
    ping(): Promise<boolean> {
      return this.#inner.ping();
    }
  }

  /**
   * Stores the caller's buffer by reference.
   *
   * Written standalone rather than by subclassing: the first attempt overrode `put` and
   * delegated to `super`, which copies — so the "broken" adapter was not broken and the
   * test failed for the right reason. Worth keeping in mind when writing any decoy.
   */
  class AliasingBlob implements BlobStorePort {
    readonly deleteIsIdempotent = true as const;
    readonly #blobs = new Map<string, { body: Uint8Array; contentType: string }>();

    put(key: string, body: Uint8Array, contentType: string): Promise<void> {
      this.#blobs.set(key, { body, contentType }); // no copy — the defect
      return Promise.resolve();
    }
    get(key: string): Promise<Uint8Array | undefined> {
      return Promise.resolve(this.#blobs.get(key)?.body);
    }
    head(key: string): Promise<BlobMetadata | undefined> {
      const blob = this.#blobs.get(key);
      return Promise.resolve(
        blob ? { key, size: blob.body.byteLength, contentType: blob.contentType } : undefined,
      );
    }
    delete(key: string): Promise<void> {
      this.#blobs.delete(key);
      return Promise.resolve();
    }
    ping(): Promise<boolean> {
      return Promise.resolve(true);
    }
  }

  it('catches a cache that reads an empty string as a miss', async () => {
    const result = await runCacheConformance('broken:falsy', () => new FalsyCache());

    expect(allPassed(result)).toBe(false);
    expect(failedCaseNames(result)).toContain('an empty string is a value, not a miss');
  });

  it('catches a cache whose setIfAbsent is not atomic', async () => {
    const result = await runCacheConformance('broken:racy', () => new RacyCache());

    expect(allPassed(result)).toBe(false);
    expect(failedCaseNames(result)).toContain('setIfAbsent wins exactly once');
  });

  it('catches a blob store that aliases the caller buffer', async () => {
    const result = await runBlobConformance('broken:aliasing', () => new AliasingBlob());

    expect(allPassed(result)).toBe(false);
    expect(failedCaseNames(result)).toContain('a stored blob is not aliased to the caller buffer');
  });

  it('catches a blob store that is not idempotent on delete', async () => {
    class ThrowingDelete extends InMemoryBlobStore {
      #deleted = new Set<string>();
      override async delete(key: string): Promise<void> {
        if (this.#deleted.has(key)) throw new Error('NoSuchKey');
        this.#deleted.add(key);
        await super.delete(key);
      }
    }

    const result = await runBlobConformance('broken:throwing-delete', () => new ThrowingDelete());

    expect(allPassed(result)).toBe(false);
    expect(failedCaseNames(result)).toContain('delete is idempotent');
  });

  it('does not fail a healthy adapter for the same reasons', async () => {
    // The other half of the proof: the broken cases above must be the ADAPTER's fault, not
    // a suite that fails everything it is given.
    const cache = await runCacheConformance('in-memory', () => new InMemoryCache());
    const blob = await runBlobConformance('in-memory', () => new InMemoryBlobStore());

    expect(allPassed(cache)).toBe(true);
    expect(allPassed(blob)).toBe(true);
  });
});

describe('the in-memory cache honours TTL', () => {
  it('expires an entry once its TTL has passed', async () => {
    let now = 1_000_000;
    const cache = new InMemoryCache(() => now);

    await cache.set('k', 'v', 30);
    expect(await cache.get('k')).toBe('v');

    now += 31_000;
    expect(await cache.get('k')).toBeUndefined();
  });

  it('frees the slot for setIfAbsent once expired', async () => {
    let now = 1_000_000;
    const cache = new InMemoryCache(() => now);

    expect(await cache.setIfAbsent('lock', 'first', 30)).toBe(true);
    now += 31_000;
    expect(await cache.setIfAbsent('lock', 'second', 30)).toBe(true);
  });
});

describe('interface shape', () => {
  it('a blob store declares delete idempotency on the type', () => {
    const store: BlobStorePort = new InMemoryBlobStore();
    expect(store.deleteIsIdempotent).toBe(true);
  });

  it('head returns metadata without the body', async () => {
    const store = new InMemoryBlobStore();
    await store.put('k', Uint8Array.from([1, 2]), 'image/png');

    const meta: BlobMetadata | undefined = await store.head('k');
    expect(meta).toStrictEqual({ key: 'k', size: 2, contentType: 'image/png' });
  });
});
