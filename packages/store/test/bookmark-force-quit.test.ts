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
 * attestation). What this proves is that a write cut between its statements leaves the database
 * as it was, intact, and that a write cut after its COMMIT is kept.
 *
 * ## Why the statements are recorded rather than written here
 *
 * A hand-written replay would test the hand-written replay. The statements come from
 * `bookmarkColor` and `unbookmarkColor` themselves, through a recording driver over a scratch
 * copy, so a change to either method changes what is replayed.
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
let n = 0;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Recorded {
  readonly sql: string;
  readonly params: readonly unknown[];
}

/** A migrated database file, closed, optionally with `ai-nezumi` already bookmarked. */
function base(bookmarked: boolean): string {
  const path = join(dir, `base-${String(n++)}.sqlite`);
  const { driver, info } = nodeDriver(path);
  const repo = createRepository(driver, info);
  if (bookmarked) repo.bookmarkColor('ai-nezumi', NOW - 1000);
  repo.close();
  return path;
}

/** The writes one repository call issues inside its transaction, in order. */
function record(from: string, write: (repo: Repository) => void): readonly Recorded[] {
  const scratch = join(dir, `scratch-${String(n++)}.sqlite`);
  copyFileSync(from, scratch);
  const { driver: inner, info } = nodeDriver(scratch);
  const writes: Recorded[] = [];
  let inside = false;
  const recording: Driver = {
    ...inner,
    run(sql, params = []) {
      if (inside) writes.push({ sql, params });
      inner.run(sql, params);
    },
    transaction<T>(fn: () => T): T {
      inside = true;
      try {
        return inner.transaction(fn);
      } finally {
        inside = false;
      }
    },
  };
  const repo = createRepository(recording, info);
  write(repo);
  repo.close();
  return writes;
}

/** Replay `statements` on a copy of `from` in a child, killed at `cut`; return the copy. */
function killedAt(
  from: string,
  statements: readonly Recorded[],
  cut: number | 'after-commit',
): string {
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
function relaunch(path: string): {
  readonly bookmarks: readonly string[];
  readonly logged: number;
} {
  const { driver, info } = nodeDriver(path);
  const check = driver.query<{ integrity_check: string }>('PRAGMA integrity_check');
  // Mapped out of node:sqlite's null-prototype rows, which toStrictEqual tells from a literal.
  expect(check.map((row) => row.integrity_check)).toStrictEqual(['ok']);
  const repo = createRepository(driver, info);
  const result = {
    bookmarks: repo.listBookmarks(),
    logged: repo.changeLog().filter((e) => e.table_name === 'color_bookmark').length,
  };
  repo.close();
  return result;
}

describe('a bookmark killed mid-write', () => {
  const empty = base(false);
  const bookmark = record(empty, (repo) => {
    repo.bookmarkColor('ai-nezumi', NOW);
  });

  it('records the row and its change-log entry, in that order', () => {
    // What the cuts below fall between. If the method's shape changes, this says so first.
    expect(bookmark.map((s) => s.sql.trim().split(/\s+/).slice(0, 3).join(' '))).toStrictEqual([
      'INSERT INTO color_bookmark',
      'INSERT INTO change_log',
    ]);
  });

  it('killed after the row and before the change log, nothing survives', () => {
    expect(relaunch(killedAt(empty, bookmark, 1))).toStrictEqual({ bookmarks: [], logged: 0 });
  });

  it('killed after both and before COMMIT, nothing survives', () => {
    expect(relaunch(killedAt(empty, bookmark, 2))).toStrictEqual({ bookmarks: [], logged: 0 });
  });

  it('the decoy: killed after COMMIT, the bookmark is there', () => {
    // Without it the two cases above cannot tell "the kill rolled the write back" from "the
    // replay never wrote anything a relaunch could see".
    expect(relaunch(killedAt(empty, bookmark, 'after-commit'))).toStrictEqual({
      bookmarks: ['ai-nezumi'],
      logged: 1,
    });
  });
});

describe('a removal killed mid-write', () => {
  const kept = base(true);
  const removal = record(kept, (repo) => {
    repo.unbookmarkColor('ai-nezumi', NOW);
  });

  it('records the tombstone and its change-log entry', () => {
    expect(removal.map((s) => s.sql.trim().split(/\s+/).slice(0, 2).join(' '))).toStrictEqual([
      'UPDATE color_bookmark',
      'INSERT INTO',
    ]);
  });

  it('killed before COMMIT, the bookmark is still live', () => {
    expect(relaunch(killedAt(kept, removal, 2))).toStrictEqual({
      bookmarks: ['ai-nezumi'],
      logged: 1,
    });
  });

  it('the decoy: killed after COMMIT, it is removed', () => {
    expect(relaunch(killedAt(kept, removal, 'after-commit'))).toStrictEqual({
      bookmarks: [],
      logged: 2,
    });
  });
});
