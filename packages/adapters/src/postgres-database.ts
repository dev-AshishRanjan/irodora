/**
 * The Postgres adapter.
 *
 * Implements `DatabasePort` — readiness, and the advisory lock the migration runner needs.
 * Not a query layer: Drizzle is that (ADR-0012), and wrapping it here would produce a second,
 * worse ORM.
 */

import type { DatabasePort } from '@irodora/ports';
import pg from 'pg';

export interface PostgresOptions {
  readonly connectionString: string;
  readonly poolMax?: number;
  /**
   * How long to wait for a connection before calling the database unreachable.
   *
   * Short on purpose. `/readyz` is polled by an orchestrator on a schedule; a probe that
   * hangs for the driver's default is a probe that has already failed, and holding the
   * request open just delays the answer the orchestrator is waiting for.
   */
  readonly connectionTimeoutMillis?: number;
}

export class PostgresDatabase implements DatabasePort {
  readonly #pool: pg.Pool;

  constructor(options: PostgresOptions) {
    this.#pool = new pg.Pool({
      connectionString: options.connectionString,
      max: options.poolMax ?? 10,
      connectionTimeoutMillis: options.connectionTimeoutMillis ?? 2000,
    });

    // A pool emits 'error' for an idle client dropped by the server. Unhandled, it takes the
    // process down — so an unrelated network blip becomes a crash loop. Readiness is the
    // mechanism that is supposed to report this, not the process dying.
    this.#pool.on('error', () => undefined);
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.#pool.query('SELECT 1 AS ok');
      return result.rows.length === 1;
    } catch {
      // Returns, never throws — `/readyz` turns a throw into a 500, which an orchestrator
      // reads as a broken container rather than one that is not ready.
      return false;
    }
  }

  /**
   * Run `body` while holding a session-level advisory lock, or report that someone else has it.
   *
   * `pg_try_advisory_lock` and NOT `pg_advisory_lock`: try returns immediately. The blocking
   * form would make every container in a compose stack queue behind the one that is
   * migrating, so a slow migration would delay every replica's boot instead of exactly one.
   *
   * The lock is **session-scoped**, so it is held by one dedicated client for the duration
   * and released on that client — releasing from a different pooled connection is a silent
   * no-op, which would leave the lock held until the session ends.
   */
  async withAdvisoryLock<T>(
    lockKey: bigint,
    body: () => Promise<T>,
  ): Promise<{ acquired: true; value: T } | { acquired: false }> {
    const client = await this.#pool.connect();

    try {
      const attempt = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [lockKey.toString()],
      );

      if (attempt.rows[0]?.locked !== true) return { acquired: false };

      try {
        return { acquired: true, value: await body() };
      } finally {
        // `finally`, always. A migration that throws must still release the lock — otherwise
        // every subsequent boot skips migrating and the schema silently stays behind, which
        // surfaces days later as a query error nowhere near the cause.
        await client.query('SELECT pg_advisory_unlock($1)', [lockKey.toString()]);
      }
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    // `end()` on an already-ended pool rejects. Close is called from shutdown paths that can
    // run twice, and a crash during shutdown is a confusing way to end an otherwise clean stop.
    try {
      await this.#pool.end();
    } catch {
      /* already closed */
    }
  }
}
