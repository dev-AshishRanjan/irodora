/**
 * Migrations at boot, under a lock.
 *
 * Every container in a compose stack starts at the same instant and every one of them runs
 * this. Exactly one may migrate; the rest must carry on booting rather than queue, fail, or
 * — worst — apply the same migration concurrently.
 *
 * There are no migrations yet. The schema arrives with F-034; the **lock** is infrastructure
 * and belongs here, which is the right order: retrofitting a lock after the first migration
 * has already raced is a data-recovery exercise.
 */

import type { DatabasePort } from '@irodora/ports';

/**
 * A fixed key every process must agree on.
 *
 * Postgres advisory locks are namespaced by a bare integer with no registry, so two features
 * picking "1" would silently share a lock. Derived from the string "irodora:migrate" and
 * written as a literal so it is greppable and stable — a runtime hash would move the moment
 * someone changed the seed string.
 */
export const MIGRATION_LOCK_KEY = 7_264_913_845_120_663n;

export type MigrationOutcome =
  | { readonly ran: true; readonly applied: readonly string[] }
  | { readonly ran: false; readonly reason: 'another-process-is-migrating' | 'disabled' };

export interface Migration {
  readonly id: string;
  readonly up: () => Promise<void>;
}

export interface MigrateOptions {
  readonly database: DatabasePort;
  readonly migrations: readonly Migration[];
  /** `IRODORA_DATABASE_MIGRATE_ON_BOOT`. A replica can be told not to try at all. */
  readonly enabled: boolean;
}

/**
 * Returns rather than throwing on contention.
 *
 * "Someone else is migrating" is a normal, expected outcome for every container except one —
 * not an error. Throwing would make the other replicas crash-loop through their restart
 * policy while the migration they are waiting for is running perfectly well.
 */
export async function migrateAtBoot(options: MigrateOptions): Promise<MigrationOutcome> {
  if (!options.enabled) return { ran: false, reason: 'disabled' };

  const result = await options.database.withAdvisoryLock(MIGRATION_LOCK_KEY, async () => {
    const applied: string[] = [];

    for (const migration of options.migrations) {
      await migration.up();
      applied.push(migration.id);
    }

    return applied;
  });

  return result.acquired
    ? { ran: true, applied: result.value }
    : { ran: false, reason: 'another-process-is-migrating' };
}
