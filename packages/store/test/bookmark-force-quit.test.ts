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
 * Every boundary is cut, not a chosen few. The harness is `fixtures/force-quit.ts`, shared with the
 * lookbook (F-238).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Repository } from '../src/index.js';
import { BEGIN, COMMIT, expected, forceQuit, shape } from './fixtures/force-quit.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-force-quit-'));
const { base, record, everyCut } = forceQuit(dir);
const NOW = 1_760_000_000_000;
/**
 * Each every-cut case spawns one child per boundary, five to seven of them. Alone that is under a
 * second; under the whole monorepo's parallel run it passed the 5 s default and the case timed out
 * with nothing wrong. The budget is for the processes, not for a slow write.
 */
const CHILDREN_BUDGET = 60_000;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface State {
  readonly bookmarks: readonly string[];
  readonly logged: number;
}

/** What a relaunch shows: the live bookmarks, and how many bookmark writes the log holds. */
const read = (repo: Repository): State => ({
  bookmarks: repo.listBookmarks(),
  logged: repo.changeLog().filter((e) => e.table_name === 'color_bookmark').length,
});

/** `ai-nezumi` never bookmarked, live, or removed. */
const seeded = (bookmark: 'none' | 'live' | 'removed'): string =>
  base((repo) => {
    if (bookmark !== 'none') repo.bookmarkColor('ai-nezumi', NOW - 2000);
    if (bookmark === 'removed') repo.unbookmarkColor('ai-nezumi', NOW - 1000);
  });

describe('a bookmark killed at every point of its write', () => {
  const empty = seeded('none');
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
      expect(everyCut(empty, bookmark, read)).toStrictEqual(
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
      const states = everyCut(empty, split, read);
      expect(states).not.toStrictEqual(
        expected(split, { bookmarks: [], logged: 0 }, { bookmarks: ['ai-nezumi'], logged: 1 }),
      );
      expect(states).toContainEqual({ bookmarks: ['ai-nezumi'], logged: 0 });
    },
    CHILDREN_BUDGET,
  );
});

describe('a removal killed at every point of its write', () => {
  const live = seeded('live');
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
      expect(everyCut(live, removal, read)).toStrictEqual(
        expected(removal, { bookmarks: ['ai-nezumi'], logged: 1 }, { bookmarks: [], logged: 2 }),
      );
    },
    CHILDREN_BUDGET,
  );
});

describe('a revival killed at every point of its write', () => {
  const removed = seeded('removed');
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
      expect(everyCut(removed, revival, read)).toStrictEqual(
        expected(revival, { bookmarks: [], logged: 2 }, { bookmarks: ['ai-nezumi'], logged: 3 }),
      );
    },
    CHILDREN_BUDGET,
  );
});
