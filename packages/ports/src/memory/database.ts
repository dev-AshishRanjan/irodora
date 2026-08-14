/**
 * In-memory database adapter — enough to exercise readiness and the advisory-lock contract
 * without a server. The real Postgres adapter is in `@irodora/adapters`.
 */

import type { DatabasePort } from '../database.js';

export class InMemoryDatabase implements DatabasePort {
  #reachable: boolean;
  readonly #held = new Set<bigint>();

  constructor(options: { reachable?: boolean } = {}) {
    this.#reachable = options.reachable ?? true;
  }

  /** Simulate the dependency going away, for readiness tests. */
  setReachable(reachable: boolean): void {
    this.#reachable = reachable;
  }

  ping(): Promise<boolean> {
    return Promise.resolve(this.#reachable);
  }

  async withAdvisoryLock<T>(
    lockKey: bigint,
    body: () => Promise<T>,
  ): Promise<{ acquired: true; value: T } | { acquired: false }> {
    if (this.#held.has(lockKey)) return { acquired: false };

    this.#held.add(lockKey);
    try {
      return { acquired: true, value: await body() };
    } finally {
      this.#held.delete(lockKey);
    }
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * A database that is genuinely unreachable.
 *
 * Not a mock returning `false` — it is the same class with the flag off, so readiness tests
 * exercise the real code path rather than a stand-in that agrees with them.
 */
export class UnreachableDatabase extends InMemoryDatabase {
  constructor() {
    super({ reachable: false });
  }
}
