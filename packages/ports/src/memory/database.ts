/**
 * In-memory database adapter — enough to exercise readiness and the advisory-lock contract
 * without a server. The real Postgres adapter is in `@irodora/adapters`.
 */

import type { DatabasePort } from '../database.js';

/**
 * The lock table, held by the *server* rather than by a client.
 *
 * This exists because the naive in-memory adapter gets the topology wrong: it keeps locks
 * per instance, so two "connections" never contend and every lock test passes vacuously.
 * A real database has one lock table and many clients, and the conformance suite depends on
 * that shape — its release-on-throw case acquires from a second connection precisely because
 * a single one cannot detect a leak.
 *
 * Pass the same table to several `InMemoryDatabase` instances to model several containers
 * talking to one server.
 */
export class InMemoryLockTable {
  readonly held = new Set<bigint>();
}

export class InMemoryDatabase implements DatabasePort {
  #reachable: boolean;
  readonly #locks: InMemoryLockTable;

  constructor(options: { reachable?: boolean; locks?: InMemoryLockTable } = {}) {
    this.#reachable = options.reachable ?? true;
    // Defaults to a private table so an isolated instance behaves sensibly; share one
    // explicitly to model concurrent clients.
    this.#locks = options.locks ?? new InMemoryLockTable();
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
    if (this.#locks.held.has(lockKey)) return { acquired: false };

    this.#locks.held.add(lockKey);
    try {
      return { acquired: true, value: await body() };
    } finally {
      this.#locks.held.delete(lockKey);
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
