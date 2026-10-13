/**
 * A lookbook write killed mid-transaction (F-238, FR-56: "a force-quit mid-transaction").
 *
 * A saved outfit is written across three tables — the outfit, its slots, its components — each row
 * with its change-log entry. A child process replays the statements `saveOutfit` and
 * `removeOutfit` actually issued, their BEGIN and COMMIT included, and is killed with SIGKILL at
 * every boundary (`fixtures/force-quit.ts`). The next launch must find the lookbook exactly as it
 * was before the write, or exactly as it is after: never an outfit without its slots or its score.
 *
 * The fixture is the smallest outfit that crosses all three tables and repeats a row in each: two
 * slots and two components, twelve statements. **A process kill is not power loss**, and the
 * person's device run is the real app's.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { uuidv7, type NewOutfit, type NewSavedColor, type Repository } from '../src/index.js';
import { BEGIN, COMMIT, expected, forceQuit, shape } from './fixtures/force-quit.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-outfit-force-quit-'));
const { base, record, everyCut } = forceQuit(dir);
const NOW = 1_760_000_000_000;
/**
 * Each every-cut case spawns one child per boundary: thirteen for a save of twelve statements,
 * nineteen for the split decoy. Measured at 2026-10-14 near 0.12 s a child alone; under the whole
 * monorepo's parallel run F-237's five-child cases took 14 s. 120 s is for the processes — room
 * for that load times the extra children, and a hang still fails.
 */
const CHILDREN_BUDGET = 120_000;

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const TOP = 'garment-top';
const SHOE = 'garment-shoe';

const colour = (name: string): Omit<NewSavedColor, 'id'> => ({
  name,
  xyz_x: 0.0412,
  xyz_y: 0.0434,
  xyz_z: 0.0877,
  lab_l: 24.8,
  lab_a: 1.9,
  lab_b: -15.4,
  oklch_l: 0.342,
  oklch_c: 0.046,
  oklch_h: 262.1,
  hex: '#2F3B52',
  source: 'reference',
  confidence: 1,
  corpus_slug: null,
});

const entry: NewOutfit = {
  overall: 66,
  countsThreshold: 60,
  envelope: {
    engine: 'e',
    scorer: 's',
    corpus: 'c',
    rules: 'r',
    occasion: 'default',
    profile: 'p:1',
  },
  items: [
    { slot: 'top', garmentId: TOP, garmentLabel: 'Shirt', locked: true, color: colour('Ai') },
    { slot: 'shoe', garmentId: SHOE, garmentLabel: 'shoe', locked: false, color: colour('Kuro') },
  ],
  components: [
    { component: 'harmony', score: 70, direction: 'supports', weight: 0.5, contribution: 35 },
    { component: 'contrast', score: 62, direction: 'neutral', weight: 0.5, contribution: 31 },
  ],
};

interface State {
  /** Each live outfit as (slots, components): a whole one is (2, 2). */
  readonly outfits: readonly (readonly [number, number])[];
  readonly logged: number;
}

const read = (repo: Repository): State => ({
  outfits: repo.listOutfits().map((o) => [o.items.length, o.components.length] as const),
  logged: repo.changeLog().filter((e) => e.table_name.startsWith('outfit')).length,
});

/** Two garments for the slots to point at, and optionally the outfit already saved. */
const seeded = (saved: boolean): string =>
  base((repo) => {
    for (const [id, type] of [
      [TOP, 'top'],
      [SHOE, 'shoe'],
    ] as const)
      repo.createGarment({ id, type, color: { id: uuidv7(), ...colour(type) } }, NOW - 3000);
    if (saved) repo.saveOutfit(entry, NOW - 1000);
  });

const NONE: State = { outfits: [], logged: 0 };
const ONE: State = { outfits: [[2, 2]], logged: 5 };

describe('a saved outfit killed at every point of its write', () => {
  const empty = seeded(false);
  const save = record(empty, (repo) => {
    repo.saveOutfit(entry, NOW);
  });

  it('is one transaction: the outfit, its slots and its components, each with its log entry', () => {
    expect(shape(save)).toStrictEqual([
      'BEGIN',
      'INSERT INTO outfit',
      'INSERT INTO change_log',
      'INSERT INTO outfit_item',
      'INSERT INTO change_log',
      'INSERT INTO outfit_item',
      'INSERT INTO change_log',
      'INSERT INTO outfit_component',
      'INSERT INTO change_log',
      'INSERT INTO outfit_component',
      'INSERT INTO change_log',
      'COMMIT',
    ]);
  });

  it(
    'leaves no outfit until COMMIT has run, and the whole outfit after — never part of one',
    () => {
      expect(everyCut(empty, save, read)).toStrictEqual(expected(save, NONE, ONE));
    },
    CHILDREN_BUDGET,
  );

  it(
    'the decoy: the same write committed after the outfit row leaves an outfit with nothing in it',
    () => {
      // What a save that committed its outfit before its children would replay as. Without this,
      // the case above cannot tell "the transaction held" from "a half-entry is invisible here".
      const [, outfitRow, outfitLog, ...rest] = save;
      if (outfitRow === undefined || outfitLog === undefined) throw new Error('not a write');
      const split = [BEGIN, outfitRow, outfitLog, COMMIT, BEGIN, ...rest];
      const states = everyCut(empty, split, read);
      expect(states).not.toStrictEqual(expected(split, NONE, ONE));
      expect(states).toContainEqual({ outfits: [[0, 0]], logged: 1 });
    },
    CHILDREN_BUDGET,
  );
});

describe('a removed outfit killed at every point of its write', () => {
  const saved = seeded(true);
  const removal = record(saved, (repo) => {
    const [live] = repo.listOutfits();
    if (live === undefined) throw new Error('the seed saved nothing');
    repo.removeOutfit(live.id, NOW);
  });

  it('is one transaction: the outfit, then each child, tombstoned and logged', () => {
    expect(shape(removal, 2)).toStrictEqual([
      'BEGIN',
      'UPDATE outfit',
      'INSERT INTO',
      'UPDATE outfit_item',
      'INSERT INTO',
      'UPDATE outfit_item',
      'INSERT INTO',
      'UPDATE outfit_component',
      'INSERT INTO',
      'UPDATE outfit_component',
      'INSERT INTO',
      'COMMIT',
    ]);
  });

  it(
    'leaves the outfit whole until COMMIT has run, and gone after',
    () => {
      expect(everyCut(saved, removal, read)).toStrictEqual(
        expected(removal, ONE, { outfits: [], logged: 10 }),
      );
    },
    CHILDREN_BUDGET,
  );
});
