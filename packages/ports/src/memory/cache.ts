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

  increment(key: string, ttlSeconds: TtlSeconds): Promise<number> {
    const live = this.#live(key);

    // The window does NOT slide. `expiresAt` is set when the counter is created and preserved
    // on every subsequent increment — a limiter whose window extends on each request never
    // resets under sustained load, so a client that keeps knocking stays locked out forever.
    // That turns a throttle into a ban nobody chose.
    const expiresAt = live?.expiresAt ?? this.#now() + ttlSeconds * 1000;

    // A non-numeric existing value restarts the count rather than producing NaN. It means the
    // key was used for something else, which is a bug — but NaN would then propagate into
    // every comparison a limiter makes, and `NaN > limit` is false, so the limiter would admit
    // everything. Restarting is wrong in a way that fails closed.
    const next = Number.parseInt(live?.value ?? '0', 10);
    const value = String((Number.isFinite(next) ? next : 0) + 1);

    this.#entries.set(key, { value, expiresAt });
    return Promise.resolve(Number(value));
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
