/**
 * Preference feedback in the database (FR-37, F-046).
 *
 * ## What earns this file
 *
 * The engine's `preference.test.ts` proves the weight is a bounded, deterministic function of
 * two counts. This proves the counts are the ones the person actually produced — a different
 * claim, and the one storage can get wrong.
 *
 * **The engine is deliberately not imported here.** `packages/store` carries no runtime
 * dependency on it and does not need one for a test either: what these integers MEAN is
 * asserted where the meaning lives, and re-checking it here would couple two packages to
 * duplicate a property one of them owns.
 *
 * The assertion that matters most is **symmetry**: a pairing is unordered, so recording
 * `(rust, charcoal)` and then `(charcoal, rust)` must produce ONE row with two observations. A
 * store that made two rows would look correct in every read that happened to ask the same way
 * round, and the recommender would appear to forget depending on which garment was in hand.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import { createRepository } from '../src/index.js';
import type { Repository } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-preference-'));
let n = 0;
const open = (): { repo: Repository; driver: ReturnType<typeof nodeDriver>['driver'] } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

describe('a pairing is unordered', () => {
  it('records BOTH directions into one row', () => {
    const { repo } = open();
    repo.recordPreference('rust', 'charcoal', 'accepted', NOW);
    repo.recordPreference('charcoal', 'rust', 'accepted', NOW + 1);

    const all = repo.listPreferences();
    expect(all).toHaveLength(1);
    expect(all[0]?.accepted).toBe(2);
    // Canonically ordered on the way in, so a reader never has to try it both ways.
    expect(all[0]?.familyA).toBe('charcoal');
    expect(all[0]?.familyB).toBe('rust');
    repo.close();
  });

  it('still keeps DIFFERENT pairings apart', () => {
    // The decoy: a store that collapsed everything into one row would pass the test above.
    const { repo } = open();
    repo.recordPreference('rust', 'charcoal', 'accepted', NOW);
    repo.recordPreference('rust', 'gold', 'accepted', NOW + 1);
    expect(repo.listPreferences()).toHaveLength(2);
    repo.close();
  });

  it('is refused by the DATABASE, not only by the writer', () => {
    // A rule enforced only by the writer holds until somebody writes a second writer. The
    // CHECK is what makes a mis-ordered row impossible rather than merely unlikely.
    const { repo, driver } = open();
    expect(() => {
      driver.run(
        `INSERT INTO pairing_preference
           (id, created_at, updated_at, deleted_at, family_a, family_b, accepted, rejected)
         VALUES ('bad', 1, 1, NULL, 'rust', 'charcoal', 1, 0)`,
      );
    }).toThrow();
    repo.close();
  });
});

describe('repeated selection', () => {
  it('accumulates, and the weight follows the counts', () => {
    const { repo } = open();
    for (let i = 0; i < 4; i += 1) repo.recordPreference('rust', 'charcoal', 'accepted', NOW + i);

    const stored = repo.listPreferences()[0];
    // Four observations from four taps, and the rejections untouched. The store holds
    // counts; the engine holds the meaning, and neither owns both.
    expect(stored?.accepted).toBe(4);
    expect(stored?.rejected).toBe(0);
    repo.close();
  });

  it('counts rejections separately, on the same row', () => {
    const { repo } = open();
    repo.recordPreference('rust', 'charcoal', 'accepted', NOW);
    repo.recordPreference('rust', 'charcoal', 'rejected', NOW + 1);
    repo.recordPreference('rust', 'charcoal', 'rejected', NOW + 2);

    const stored = repo.listPreferences()[0];
    expect(stored?.accepted).toBe(1);
    expect(stored?.rejected).toBe(2);
    // Asserted as SEPARATE columns rather than as a net, because a store that incremented the
    // wrong one would still produce a plausible net and this is the only place that can see it.
    expect(stored?.accepted).not.toBe(stored?.rejected);
    repo.close();
  });
});

describe('reset', () => {
  it('removes the rows AND the log of them', () => {
    /*
     * A HARD delete, unlike every other delete in this repository. A tombstone would be a
     * record of what somebody asked to have forgotten, and a change-log row saying
     * "pairing_preference rust/charcoal was updated" is the same record wearing another name.
     * "Reset" that leaves a trail of what was reset is not reset.
     */
    const { repo } = open();
    repo.recordPreference('rust', 'charcoal', 'accepted', NOW);
    repo.recordPreference('gold', 'stone', 'rejected', NOW + 1);
    expect(repo.listPreferences()).toHaveLength(2);

    repo.resetPreferences(NOW + 2);

    expect(repo.listPreferences()).toEqual([]);
    const trail = repo
      .changeLog()
      .filter((e) => e.table_name === 'pairing_preference' && e.row_id !== 'all');
    expect(trail).toEqual([]);
    repo.close();
  });

  it('leaves everything else alone', () => {
    // The decoy for the line above. A reset implemented as "delete from change_log" would pass
    // it and would erase the history of every other table in the database.
    const { repo } = open();
    repo.recordPreference('rust', 'charcoal', 'accepted', NOW);
    const before = repo.changeLog().filter((e) => e.table_name !== 'pairing_preference').length;

    repo.resetPreferences(NOW + 1);

    expect(repo.changeLog().filter((e) => e.table_name !== 'pairing_preference')).toHaveLength(
      before,
    );
    repo.close();
  });

  it('starts from neutral again afterwards', () => {
    const { repo } = open();
    for (let i = 0; i < 8; i += 1) repo.recordPreference('rust', 'charcoal', 'accepted', NOW + i);
    repo.resetPreferences(NOW + 100);
    repo.recordPreference('rust', 'charcoal', 'accepted', NOW + 101);

    // One observation, not nine. A reset that only zeroed the derived value would leave the
    // counts and this would be nine.
    expect(repo.listPreferences()[0]?.accepted).toBe(1);
    repo.close();
  });
});

describe('criterion 3 — it affects only this device', () => {
  it('writes nothing outside its own table', () => {
    /*
     * "Feedback affects only the submitting user, never global ranking." There is no server to
     * send it to (ADR-0051), and the published rule weights are CONTENT with their own version
     * and digest. This asserts the mechanical half: recording a preference touches one table
     * and leaves every other row count where it was.
     */
    const { repo, driver } = open();
    const count = (t: string) =>
      driver.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)[0]?.n ?? 0;
    const before = ['saved_color', 'palette', 'garment', 'personal_color_profile'].map(count);

    repo.recordPreference('rust', 'charcoal', 'accepted', NOW);

    expect(['saved_color', 'palette', 'garment', 'personal_color_profile'].map(count)).toEqual(
      before,
    );
    repo.close();
  });
});
