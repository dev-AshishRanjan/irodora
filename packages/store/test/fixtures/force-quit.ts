/**
 * The force-quit harness, shared by every test that kills a write mid-transaction (F-237, F-238).
 *
 * ## What it does
 *
 * - **`record`** runs one repository call on a scratch copy of a database, through a driver that
 *   records every write it issues — **its transaction's `BEGIN` and `COMMIT` included**, recorded
 *   where the method opens and closes it. A write made outside any transaction is recorded bare,
 *   and replays in autocommit, as it would on a phone.
 * - **`killedAt`** copies the database, and has a child process (`replay-and-die.ts`) replay the
 *   recorded statements on the copy and SIGKILL itself before statement `cut`, or after the last.
 * - **`everyCut`** does that at every boundary, then opens what each child left — its write-ahead
 *   log included — as the next launch would: `integrity_check` must be ok and the repository must
 *   open it. The caller says what to read from it.
 * - **`expected`** is the claim, for one recorded write: a kill anywhere before its COMMIT has run
 *   leaves exactly the state before it, and a kill after leaves exactly the state after.
 *
 * **A process kill is not power loss.** `synchronous = FULL` is the guard for that, and no CI
 * runner can pull a phone's battery. The device run is the person's.
 *
 * Moved here from `bookmark-force-quit.test.ts` when the lookbook needed it too (F-238), with the
 * bookmark cases unchanged.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import { nodeDriver } from '../../src/drivers/node.js';
import { CONNECTION_PRAGMAS } from '../../src/schema.js';
import { createRepository, type Driver, type Repository } from '../../src/index.js';

const CHILD = fileURLToPath(new URL('./replay-and-die.ts', import.meta.url));

export interface Recorded {
  readonly sql: string;
  readonly params: readonly unknown[];
}

export const BEGIN: Recorded = { sql: 'BEGIN', params: [] };
export const COMMIT: Recorded = { sql: 'COMMIT', params: [] };

/** The first words of each statement, so a test can say what shape the write has. */
export const shape = (statements: readonly Recorded[], words = 3): string[] =>
  statements.map((s) => s.sql.trim().split(/\s+/).slice(0, words).join(' '));

/** The claim, for one recorded write: before its COMMIT, the state before; after, the state after. */
export const expected = <S>(statements: readonly Recorded[], before: S, after: S): S[] => {
  const commit = statements.lastIndexOf(COMMIT);
  return Array.from({ length: statements.length + 1 }, (_, cut) => (cut > commit ? after : before));
};

/** A harness writing its files under `dir`. */
export function forceQuit(dir: string) {
  let n = 0;
  const file = (kind: string, ext = 'sqlite'): string => join(dir, `${kind}-${String(n++)}.${ext}`);

  /** A migrated database file, closed, set up by `seed`. */
  const base = (seed: (repo: Repository) => void = () => undefined): string => {
    const path = file('base');
    const { driver, info } = nodeDriver(path);
    const repo = createRepository(driver, info);
    seed(repo);
    repo.close();
    return path;
  };

  /** Every write one repository call issues on a copy of `from`, with its BEGIN and COMMIT. */
  const record = (from: string, write: (repo: Repository) => void): readonly Recorded[] => {
    const scratch = file('scratch');
    copyFileSync(from, scratch);
    const { driver: inner, info } = nodeDriver(scratch);
    let recording = false;
    const writes: Recorded[] = [];
    const recorder: Driver = {
      ...inner,
      run(sql, params = []) {
        if (recording) writes.push({ sql, params });
        inner.run(sql, params);
      },
      transaction<T>(fn: () => T): T {
        if (recording) writes.push(BEGIN);
        const result = inner.transaction(fn);
        if (recording) writes.push(COMMIT);
        return result;
      },
    };
    const repo = createRepository(recorder, info);
    recording = true;
    write(repo);
    recording = false;
    repo.close();
    return writes;
  };

  /** Replay `statements` on a copy of `from` in a child, killed before statement `cut`. */
  const killedAt = (from: string, statements: readonly Recorded[], cut: number): string => {
    const target = file('target');
    copyFileSync(from, target);
    const plan = file('plan', 'json');
    writeFileSync(plan, JSON.stringify({ pragmas: CONNECTION_PRAGMAS, statements, cut }));
    const child = spawnSync(process.execPath, [CHILD, target, plan], {
      encoding: 'utf8',
      timeout: 30_000,
    });
    // It got to the cut, and it did not leave cleanly: a child that threw before the cut, or
    // exited normally, would make every assertion after this a statement about something else.
    expect(child.stdout, child.stderr).toBe('CUT\n');
    expect(child.status === 0 && child.signal === null).toBe(false);
    return target;
  };

  /** The next launch: open what the child left, check it, and read it back. */
  const relaunch = <S>(path: string, read: (repo: Repository) => S): S => {
    const { driver, info } = nodeDriver(path);
    const check = driver.query<{ integrity_check: string }>('PRAGMA integrity_check');
    // Mapped out of node:sqlite's null-prototype rows, which toStrictEqual tells from a literal.
    expect(check.map((row) => row.integrity_check)).toStrictEqual(['ok']);
    const repo = createRepository(driver, info);
    const state = read(repo);
    repo.close();
    return state;
  };

  /** What the next launch sees after a kill at every boundary: before the first statement to after the last. */
  const everyCut = <S>(
    from: string,
    statements: readonly Recorded[],
    read: (repo: Repository) => S,
  ): readonly S[] =>
    Array.from({ length: statements.length + 1 }, (_, cut) =>
      relaunch(killedAt(from, statements, cut), read),
    );

  return { base, record, everyCut };
}
