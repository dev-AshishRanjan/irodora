import { runDatabaseConformance, failedCaseNames } from '@irodora/ports';
import { describe, expect, it, afterAll } from 'vitest';

import { migrateAtBoot, MIGRATION_LOCK_KEY } from './migrate.js';
import { PostgresDatabase } from './postgres-database.js';

/**
 * A REAL Postgres, from `docker compose up postgres`.
 *
 * Not a mock and not an in-memory stand-in, because the thing under test is
 * `pg_try_advisory_lock` — a Postgres behaviour. A fake would be asserting that our fake
 * behaves like our fake.
 *
 * These tests are skipped when no database is reachable, and the skip is LOUD: a silent skip
 * would turn "the lock is untested" into a green run, which is the failure mode this
 * repository keeps finding.
 */
const CONNECTION =
  process.env['IRODORA_TEST_DATABASE_URL'] ?? 'postgres://irodora:irodora@localhost:5432/irodora';

const pool = new PostgresDatabase({ connectionString: CONNECTION, poolMax: 8 });
const reachable = await pool.ping();

if (!reachable) {
  console.warn(
    `\n  SKIPPING the Postgres adapter tests — no database at ${CONNECTION}.\n` +
      '  The advisory-lock race is NOT covered by this run.\n' +
      '  Start one with: docker compose up -d postgres\n',
  );
}

afterAll(async () => {
  await pool.close();
});

describe.skipIf(!reachable)('the Postgres adapter conforms', () => {
  it('passes the database conformance suite', async () => {
    const result = await runDatabaseConformance(
      'postgres',
      () => new PostgresDatabase({ connectionString: CONNECTION }),
    );

    expect(failedCaseNames(result)).toStrictEqual([]);
  });
});

describe.skipIf(!reachable)('simultaneous starts do not race', () => {
  it('lets exactly one of eight concurrent processes migrate', async () => {
    // The decoy is the concurrency itself. A single-process test passes whether or not the
    // lock works, so it proves nothing about the situation it claims to cover — every
    // container in a compose stack starting at the same instant.
    const CONTAINERS = 8;
    let concurrentlyInside = 0;
    let maxConcurrentlyInside = 0;

    const databases = Array.from(
      { length: CONTAINERS },
      () => new PostgresDatabase({ connectionString: CONNECTION, poolMax: 2 }),
    );

    try {
      const outcomes = await Promise.all(
        databases.map((database) =>
          migrateAtBoot({
            database,
            enabled: true,
            migrations: [
              {
                id: 'test-0001',
                up: async () => {
                  concurrentlyInside += 1;
                  maxConcurrentlyInside = Math.max(maxConcurrentlyInside, concurrentlyInside);
                  // Hold it long enough that a broken lock would overlap. Without a pause the
                  // test could pass on timing rather than on the lock.
                  await new Promise((resolve) => setTimeout(resolve, 150));
                  concurrentlyInside -= 1;
                },
              },
            ],
          }),
        ),
      );

      const ran = outcomes.filter((o) => o.ran);
      const skipped = outcomes.filter((o) => !o.ran);

      expect(ran).toHaveLength(1);
      expect(skipped).toHaveLength(CONTAINERS - 1);
      // The property that actually matters: the migration body never overlapped itself.
      expect(maxConcurrentlyInside).toBe(1);

      // And the ones that skipped did so for the right reason — not because they errored.
      for (const outcome of skipped) {
        expect(outcome).toStrictEqual({ ran: false, reason: 'another-process-is-migrating' });
      }
    } finally {
      await Promise.all(databases.map((d) => d.close()));
    }
  }, 30_000);

  it('releases the lock when a migration throws, so the next boot can migrate', async () => {
    // A migration that fails must not hold the lock. Otherwise every later boot skips
    // migrating and the schema silently stays behind — surfacing days later, nowhere near
    // the cause.
    //
    // `nextBoot` is a SEPARATE pool on purpose, and this is the whole test. Postgres advisory
    // locks are re-entrant within a session: asking the same connection whether it can take
    // the lock it already leaked always answers yes. The first version of this test reused
    // one pool and passed against an implementation that never released the lock — found by
    // deliberately breaking the `finally` and watching the test stay green.
    const failing = new PostgresDatabase({ connectionString: CONNECTION });
    const nextBoot = new PostgresDatabase({ connectionString: CONNECTION });

    try {
      await expect(
        migrateAtBoot({
          database: failing,
          enabled: true,
          migrations: [{ id: 'fails', up: () => Promise.reject(new Error('boom')) }],
        }),
      ).rejects.toThrow('boom');

      const after = await nextBoot.withAdvisoryLock(MIGRATION_LOCK_KEY, () =>
        Promise.resolve('acquired'),
      );
      expect(after).toStrictEqual({ acquired: true, value: 'acquired' });
    } finally {
      await failing.close();
      await nextBoot.close();
    }
  });

  it('does not hold the lock at all when migration is disabled', async () => {
    const database = new PostgresDatabase({ connectionString: CONNECTION });

    try {
      const outcome = await migrateAtBoot({ database, enabled: false, migrations: [] });
      expect(outcome).toStrictEqual({ ran: false, reason: 'disabled' });
    } finally {
      await database.close();
    }
  });
});

describe('readiness against an unreachable database', () => {
  it('returns false rather than throwing, and does so promptly', async () => {
    // Real I/O against a port nothing listens on — not a mock. `/readyz` is polled on a
    // schedule; a probe that hangs has already failed.
    const database = new PostgresDatabase({
      connectionString: 'postgres://irodora:irodora@127.0.0.1:1/irodora',
      connectionTimeoutMillis: 1000,
    });

    const startedAt = Date.now();
    const result = await database.ping();

    expect(result).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(5000);

    await database.close();
  }, 15_000);
});
