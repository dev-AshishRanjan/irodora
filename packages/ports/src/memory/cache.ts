/**
 * In-memory cache adapter.
 *
 * Not a test double — a real adapter that happens to store in a Map, and it runs the same
 * conformance suite Valkey does. That is what makes it usable for the local profile and for
 * tests without the tests agreeing with a mock.
 */

import type { CachePort, TtlSeconds } from '../cache.js';

interface Entry {
  readonly value: string;
  readonly expiresAt: number;
}

export class InMemoryCache implements CachePort {
  readonly #entries = new Map<string, Entry>();
  readonly #now: () => number;

  /** Injectable clock, so TTL behaviour is testable without sleeping. */
  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  #live(key: string): Entry | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry;
  }

  get(key: string): Promise<string | undefined> {
    // `?.value` and not a truthiness check: an empty string is a stored value, and reading
    // it as a miss silently disables caching for every empty response.
    return Promise.resolve(this.#live(key)?.value);
  }

  set(key: string, value: string, ttlSeconds: TtlSeconds): Promise<void> {
    this.#entries.set(key, { value, expiresAt: this.#now() + ttlSeconds * 1000 });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.#entries.delete(key);
    return Promise.resolve();
  }

  setIfAbsent(key: string, value: string, ttlSeconds: TtlSeconds): Promise<boolean> {
    // Single-threaded by construction here, but the CONTRACT is atomicity — the Valkey
    // adapter must use SET NX rather than reproducing this shape with two round trips.
    if (this.#live(key) !== undefined) return Promise.resolve(false);

    this.#entries.set(key, { value, expiresAt: this.#now() + ttlSeconds * 1000 });
    return Promise.resolve(true);
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
