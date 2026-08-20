/**
 * The `node:sqlite` driver. **CI only. This module must never be reachable from a phone.**
 *
 * `apps/mobile` bundles `@irodora/store`. A `node:sqlite` import reachable from the package's
 * main entry is a crash on device — the same shape `@irodora/design-tokens` warns about for
 * `node:fs`. So this lives behind its own export (`@irodora/store/node`), `src/index.ts` does
 * not re-export it, and a boundary guard in `scripts/verify-guards.mjs` proves the rule fires
 * rather than trusting this comment to hold.
 *
 * ## What it is for, and what it does not prove
 *
 * The database cannot be tested on the thing it ships on: `expo-sqlite` needs a device and CI
 * has none. This driver is what lets the conformance suite run at all. Built into Node 24 —
 * SQLite 3.53.3 here — so it adds no dependency, which matters because the alternative
 * (`better-sqlite3`) is a native module that has to compile on every runner.
 *
 * **It does not encrypt.** SQLCipher is not in `node:sqlite`, so `encryptsAtRest` is `false`
 * and the suite reports which driver it ran against. FR-56's encryption clause is verifiable
 * only on a device and is attested on F-041, not gated here.
 */

import { DatabaseSync } from 'node:sqlite';
import type { Driver, DriverInfo } from '../repository.js';

export const NODE_DRIVER_INFO: DriverInfo = {
  name: 'node:sqlite',
  // Stated as data rather than left to a comment, so the conformance report can print it and
  // a reader cannot mistake a green CI run for a proof about encryption at rest.
  encryptsAtRest: false,
};

/**
 * Open a database. `:memory:` is fine for most tests, but **durability tests need a file** —
 * a memory database cannot be reopened, so "the row survived a reopen" would be asserting
 * that an object still has its property.
 */
export function nodeDriver(path = ':memory:'): { driver: Driver; info: DriverInfo } {
  let db = new DatabaseSync(path);

  const driver: Driver = {
    exec(sql) {
      db.exec(sql);
    },
    query<T>(sql: string, params: readonly unknown[] = []): T[] {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    run(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    transaction<T>(fn: () => T): T {
      // Explicit rather than a helper: node:sqlite has no transaction wrapper, and the
      // rollback path is the half that matters. A write and its change_log append must be
      // atomic — a log row describing a rolled-back write would make a future reconciliation
      // confidently wrong.
      db.exec('BEGIN');
      try {
        const result = fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.close();
    },
    reopen() {
      if (path === ':memory:')
        throw new Error(
          'cannot reopen an in-memory database — it has nothing to reopen. A durability ' +
            'test against :memory: would assert that an object still has its property. ' +
            'Pass a file path.',
        );
      db.close();
      db = new DatabaseSync(path);
    },
  };

  return { driver, info: NODE_DRIVER_INFO };
}
