/**
 * The database conformance suite.
 *
 * Small, because the port is small — but the advisory-lock cases are the ones that matter:
 * every container in a compose stack boots at the same instant, and exactly one may migrate.
 */

import type { DatabasePort } from '../database.js';
import { runCase, type ConformanceSuite, expectEqual, expectTrue } from './runner.js';

export type DatabaseFactory = () => Promise<DatabasePort> | DatabasePort;

/** An arbitrary but FIXED key. Two processes agree on a lock only if they use the same number. */
export const LOCK_KEY = 8_675_309n;

export async function runDatabaseConformance(
  adapter: string,
  create: DatabaseFactory,
): Promise<ConformanceSuite> {
  const cases = [
    await runCase('ping answers rather than throwing', async () => {
      const db = await create();
      expectTrue(await db.ping(), 'ping on a healthy database');
      await db.close();
    }),

    await runCase('the advisory lock runs the body and returns its value', async () => {
      const db = await create();
      const result = await db.withAdvisoryLock(LOCK_KEY, () => Promise.resolve('migrated'));
      expectEqual(result, { acquired: true, value: 'migrated' }, 'lock result');
      await db.close();
    }),

    await runCase('a second holder is refused, not queued', async () => {
      // Refused, not queued, on purpose: a second container should skip migrating and get
      // on with booting. Queueing would make every container wait for the migration it is
      // not going to run.
      const db = await create();
      let inner: { acquired: boolean } = { acquired: true };

      await db.withAdvisoryLock(LOCK_KEY, async () => {
        inner = await db.withAdvisoryLock(LOCK_KEY, () => Promise.resolve('should not run'));
      });

      expectEqual(inner.acquired, false, 'the nested acquisition');
      await db.close();
    }),

    await runCase('the lock is released even when the body throws', async () => {
      // A migration that fails must not leave the lock held, or every subsequent boot skips
      // migrating and the schema silently stays behind.
      const db = await create();

      await db
        .withAdvisoryLock(LOCK_KEY, () => Promise.reject(new Error('migration failed')))
        .catch(() => undefined);

      const after = await db.withAdvisoryLock(LOCK_KEY, () => Promise.resolve('ok'));
      expectTrue(after.acquired, 'acquisition after a failed body');
      await db.close();
    }),

    await runCase('close is safe to call twice', async () => {
      const db = await create();
      await db.close();
      await db.close();
    }),
  ];

  return { suite: 'database', adapter, cases };
}
