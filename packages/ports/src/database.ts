/**
 * The database port.
 *
 * Postgres in every profile. The port exists for two reasons that are not "we might swap
 * Postgres": readiness has to be answerable without the caller knowing what a pool is, and
 * the migration runner has to be testable without a real server.
 *
 * Deliberately NOT a query abstraction. Drizzle is the query layer (ADR-0012) and wrapping
 * it here would produce a second, worse ORM. This port carries only what infrastructure
 * needs.
 */

export interface DatabasePort {
  /**
   * Can this process reach the database and get an answer?
   *
   * Returns, never throws. `/readyz` calls it, and a probe that throws becomes a 500 —
   * which an orchestrator reads as "this container is broken" rather than "not ready yet",
   * and restarts a process that was about to become healthy.
   */
  ping(): Promise<boolean>;

  /**
   * Run `body` while holding a Postgres advisory lock, or return `skipped` if another
   * process holds it.
   *
   * This is the migration primitive. Every container in a compose stack starts at the same
   * instant and every one of them will try to migrate; exactly one may.
   */
  withAdvisoryLock<T>(
    lockKey: bigint,
    body: () => Promise<T>,
  ): Promise<{ acquired: true; value: T } | { acquired: false }>;

  close(): Promise<void>;
}
