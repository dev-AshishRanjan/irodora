/**
 * A bookmark write killed mid-transaction (F-237, FR-56: "a force-quit mid-transaction").
 *
 * ## What this is, and what it is not
 *
 * Until now FR-56's force-quit clause rested on the pragmas (WAL, `synchronous = FULL`) and on
 * thrown-error rollbacks. A thrown error unwinds through `ROLLBACK`; a killed process runs
 * nothing at all. So here a CHILD PROCESS replays the statements the real repository method
 * issued, exactly as it issued them, and is killed with SIGKILL between two of them. The parent
 * then opens the file the child left behind — its write-ahead log included — the way the next
 * launch would.
 *
 * **A process kill is not power loss.** Pages the OS already holds survive a kill and may not
 * survive a power cut; `synchronous = FULL` is the guard for that, and nothing on a CI runner can
 * pull a phone's battery. Nor is it the device: the person's run kills the real app (F-237's
 * attestation). What this proves is that a write cut at any boundary of its statements leaves the
 * database as it was, intact, and that a write cut after its COMMIT is kept.
 *
 * ## Why the statements are recorded rather than written here
 *
 * A hand-written replay would test the hand-written replay. The statements come from
 * `bookmarkColor` and `unbookmarkColor` themselves, through a recording driver over a scratch
 * copy — **their transaction's `BEGIN` and `COMMIT` included**, recorded where the method opens
 * and closes it. The child adds no transaction of its own. So a method that wrote its row and its
 * change-log entry in two transactions would be replayed as two, and the cut between them would
 * leave half a write; the split decoy below shows the per-cut assertion catching exactly that.
 * Every boundary is cut, not a chosen few.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import { CONNECTION_PRAGMAS } from '../src/schema.js';
import { createRepository, type Driver, type Repository } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-force-quit-'));
const CHILD = fileURLToPath(new URL('./fixtures/replay-and-die.ts', import.meta.url));
const NOW = 1_760_000_000_000;
/**
 * Each every-cut case spawns one child per boundary, five to seven of them. Alone that is under a
 * second; under the whole monorepo's parallel run it passed the 5 s default and the case timed out
 * with nothing wrong. The budget is for the processes, not for a slow write.
 */
const CHILDREN_BUDGET = 60_000;
let n = 0;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Recorded {
  readonly sql: string;
  readonly params: readonly unknown[];
}

interface State {
  readonly bookmarks: readonly string[];
  readonly logged: number;
}

const BEGIN: Recorded = { sql: 'BEGIN', params: [] };
const COMMIT: Recorded = { sql: 'COMMIT', params: [] };

/** A migrated database file, closed, with `ai-nezumi` never bookmarked, live, or removed. */
function base(bookmark: 'none' | 'live' | 'removed'): string {
  const path = join(dir, `base-${String(n++)}.sqlite`);
  const { driver, info } = nodeDriver(path);
  const repo = createRepository(driver, info);
  if (bookmark !== 'none') repo.bookmarkColor('ai-nezumi', NOW - 2000);
  if (bookmark === 'removed') repo.unbookmarkColor('ai-nezumi', NOW - 1000);
  repo.close();
  return path;
}

/**
 * Every write one repository call issues, in order, with the BEGIN and COMMIT of each transaction
 * it opens. A write made outside any transaction is recorded too, bare — and replays in autocommit,
 * which is what it would do on a phone.
 */
function record(from: string, write: (repo: Repository) => void): readonly Recorded[] {
  const scratch = join(dir, `scratch-${String(n++)}.sqlite`);
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
}

/** Replay `statements` on a copy of `from` in a child, killed before statement `cut`. */
function killedAt(from: string, statements: readonly Recorded[], cut: number): string {
  const target = join(dir, `target-${String(n++)}.sqlite`);
  copyFileSync(from, target);
  const plan = join(dir, `plan-${String(n++)}.json`);
  writeFileSync(plan, JSON.stringify({ pragmas: CONNECTION_PRAGMAS, statements, cut }));
  const child = spawnSync(process.execPath, [CHILD, target, plan], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  // It got to the cut, and it did not leave cleanly: a child that threw before the cut, or
  // exited normally, would make every assertion below a statement about something else.
  expect(child.stdout, child.stderr).toBe('CUT\n');
  expect(child.status === 0 && child.signal === null).toBe(false);
  return target;
}

/** The next launch: open what the child left, check it, and read the bookmarks back. */
function relaunch(path: string): State {
  const { driver, info } = nodeDriver(path);
  const check = driver.query<{ integrity_check: string }>('PRAGMA integrity_check');
  // Mapped out of node:sqlite's null-prototype rows, which toStrictEqual tells from a literal.
  expect(check.map((row) => row.integrity_check)).toStrictEqual(['ok']);
  const repo = createRepository(driver, info);
  const state = {
    bookmarks: repo.listBookmarks(),
    logged: repo.changeLog().filter((e) => e.table_name === 'color_bookmark').length,
  };
  repo.close();
  return state;
}

/** What the next launch sees after a kill at every boundary: before the first statement to after the last. */
const everyCut = (from: string, statements: readonly Recorded[]): readonly State[] =>
  Array.from({ length: statements.length + 1 }, (_, cut) =>
    relaunch(killedAt(from, statements, cut)),
  );

/**
 * The claim, for one recorded write: a kill anywhere before its COMMIT has run leaves exactly the
 * state before it, and a kill after leaves exactly the state after. Nothing in between, ever.
 */
const expected = (statements: readonly Recorded[], before: State, after: State): State[] => {
  const commit = statements.lastIndexOf(COMMIT);
  return Array.from({ length: statements.length + 1 }, (_, cut) => (cut > commit ? after : before));
};

const shape = (statements: readonly Recorded[]): string[] =>
  statements.map((s) => s.sql.trim().split(/\s+/).slice(0, 3).join(' '));

describe('a bookmark killed at every point of its write', () => {
  const empty = base('none');
  const bookmark = record(empty, (repo) => {
    repo.bookmarkColor('ai-nezumi', NOW);
  });

  it('is one transaction: the row and its change-log entry between one BEGIN and one COMMIT', () => {
    expect(shape(bookmark)).toStrictEqual([
      'BEGIN',
      'INSERT INTO color_bookmark',
      'INSERT INTO change_log',
      'COMMIT',
    ]);
  });

  it(
    'leaves nothing until COMMIT has run, and the bookmark with its log entry after',
    () => {
      expect(everyCut(empty, bookmark)).toStrictEqual(
        expected(bookmark, { bookmarks: [], logged: 0 }, { bookmarks: ['ai-nezumi'], logged: 1 }),
      );
    },
    CHILDREN_BUDGET,
  );

  it(
    'the decoy: the same write split into two transactions leaves half of it at one cut',
    () => {
      // What a method that committed its row before logging it would replay as. Without this, the
      // case above cannot tell "the method's transaction held" from "the per-cut check cannot see a
      // half-write".
      const [, row, log] = bookmark;
      if (row === undefined || log === undefined) throw new Error('the recording is not a write');
      const split = [BEGIN, row, COMMIT, BEGIN, log, COMMIT];
      const states = everyCut(empty, split);
      expect(states).not.toStrictEqual(
        expected(split, { bookmarks: [], logged: 0 }, { bookmarks: ['ai-nezumi'], logged: 1 }),
      );
      expect(states).toContainEqual({ bookmarks: ['ai-nezumi'], logged: 0 });
    },
    CHILDREN_BUDGET,
  );
});

describe('a removal killed at every point of its write', () => {
  const live = base('live');
  const removal = record(live, (repo) => {
    repo.unbookmarkColor('ai-nezumi', NOW);
  });

  it('is one transaction: the tombstone and its change-log entry', () => {
    expect(shape(removal)).toStrictEqual([
      'BEGIN',
      'UPDATE color_bookmark SET',
      'INSERT INTO change_log',
      'COMMIT',
    ]);
  });

  it(
    'leaves the bookmark live until COMMIT has run, and removed after',
    () => {
      expect(everyCut(live, removal)).toStrictEqual(
        expected(removal, { bookmarks: ['ai-nezumi'], logged: 1 }, { bookmarks: [], logged: 2 }),
      );
    },
    CHILDREN_BUDGET,
  );
});

describe('a revival killed at every point of its write', () => {
  const removed = base('removed');
  const revival = record(removed, (repo) => {
    repo.bookmarkColor('ai-nezumi', NOW);
  });

  it('is one transaction: the revived row and its change-log entry', () => {
    expect(shape(revival)).toStrictEqual([
      'BEGIN',
      'UPDATE color_bookmark SET',
      'INSERT INTO change_log',
      'COMMIT',
    ]);
  });

  it(
    'leaves it removed until COMMIT has run, and bookmarked again after',
    () => {
      expect(everyCut(removed, revival)).toStrictEqual(
        expected(revival, { bookmarks: [], logged: 2 }, { bookmarks: ['ai-nezumi'], logged: 3 }),
      );
    },
    CHILDREN_BUDGET,
  );
});
