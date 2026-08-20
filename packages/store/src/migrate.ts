/**
 * Forward-only migrations, on a `user_version` ladder.
 *
 * `user_version` rather than a `schema_migrations` table: it is a SQLite header field, it costs
 * no row, and it cannot itself be missing on a database that exists. A migrations table has to
 * be created by a migration, which is a bootstrap problem every project solves slightly
 * differently and one of the ways they solve it wrongly.
 *
 * **There is no `down`.** With no server, a rollback would have to run on every user's device
 * with no way to coordinate it, and a half-rolled-back population is unrecoverable. Correcting
 * a bad migration means shipping the next one.
 */

import { CONNECTION_PRAGMAS, MIGRATIONS, SCHEMA_VERSION } from './schema.js';
import type { Driver } from './repository.js';

/** Apply pragmas that must hold on **every** connection, not once at creation. */
export function applyPragmas(driver: Driver): void {
  for (const pragma of CONNECTION_PRAGMAS) driver.exec(pragma);
}

/**
 * Bring the database up to `SCHEMA_VERSION`. Returns how many steps ran.
 *
 * Each step runs **inside a transaction with its version bump**, so a migration that throws
 * halfway cannot leave the database claiming a version it does not have. That failure mode is
 * the reason to care: the next launch would skip the rest of the step and run forever against
 * a schema missing a column, reporting a version that says otherwise.
 */
export function migrate(driver: Driver): number {
  applyPragmas(driver);

  const [row] = driver.query<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > SCHEMA_VERSION)
    throw new Error(
      `database is at schema version ${String(current)}, newer than this build understands ` +
        `(${String(SCHEMA_VERSION)}). An older app opening a newer database must refuse ` +
        'rather than guess: writing to a schema it does not know is how data is lost.',
    );

  let applied = 0;
  for (const step of MIGRATIONS) {
    if (step.version <= current) continue;
    driver.transaction(() => {
      driver.exec(step.up);
      // Interpolated because PRAGMA does not take a bound parameter. The value is a number
      // from a literal in this repository, never from input.
      driver.exec(`PRAGMA user_version = ${String(step.version)}`);
    });
    applied += 1;
  }
  return applied;
}
