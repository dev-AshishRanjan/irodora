/**
 * NFR-22, watched failing.
 *
 * > *No dermatological claim, no ethnic or racial classification, no attractiveness or body
 * > judgement. Absent from the data model and the copy; a schema check prevents such a field
 * > from being added.*
 *
 * A rule nobody has seen reject anything is configuration that parses
 * [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]]. So every prohibited family
 * is planted here as a migration that would really be applied, **and the unplanted ladder is
 * asserted clean in the same table** — without that half, "the check caught my mutation" is
 * indistinguishable from "the check always fires"
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 *
 * The second half of the file is the one that would actually be reached in anger: a database
 * that already has the column, which no review of `MIGRATIONS` can see.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  assertMigrationsClean,
  createRepository,
  findProhibited,
  migrate,
  MIGRATIONS,
  PROHIBITED_IDENTIFIERS,
  sqlCode,
  StoreError,
  SYNC_TABLES,
  uuidv7,
} from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-nfr22-'));
let n = 0;
const open = () => nodeDriver(join(dir, `db-${String(n++)}.sqlite`));

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A migration that adds one column to a table that exists. The realistic shape of the failure. */
const adds = (column: string): { version: number; up: string }[] => [
  { version: 99, up: `ALTER TABLE personal_color_profile ADD COLUMN ${column} TEXT;` },
];

describe('the ladder this build would apply', () => {
  it('is clean — the baseline, without which every assertion below proves nothing', () => {
    expect(() => {
      assertMigrationsClean(MIGRATIONS);
    }).not.toThrow();
  });

  it('has a personal_color_profile table at all, so the decoys target something real', () => {
    // A negative test needs a decoy, not an empty fixture: "no skin colour column" is
    // trivially true of a schema with no profile table, and would stay true if F-026 had
    // shipped nothing [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
    expect(SYNC_TABLES).toContain('personal_color_profile');
  });
});

describe('a migration adding a prohibited column is refused', () => {
  // The five real names this column has been given in five different products, plus the
  // British spelling, which is the one a UK-based team would reach for first.
  const skinNames = ['skin_color', 'skin_colour', 'skin_rgb', 'skin_tone', 'skintone'];
  for (const column of skinNames)
    it(`rejects ${column}`, () => {
      expect(() => {
        assertMigrationsClean(adds(column));
      }).toThrow(StoreError);
    });

  it('names the requirement and the column, not merely "invalid"', () => {
    // A refusal that does not say why gets worked around. This one has to survive somebody
    // reading it while trying to add the field, which is the moment it exists for.
    let message = '';
    try {
      assertMigrationsClean(adds('skin_color'));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('NFR-22');
    expect(message).toContain('skin_color');
    expect(message).toContain('ADR-0010');
  });

  it('rejects the other prohibited families too', () => {
    for (const column of ['complexion', 'ethnicity', 'ethnic_group', 'race', 'racial_group'])
      expect(() => {
        assertMigrationsClean(adds(column));
      }).toThrow(StoreError);
    for (const column of ['attractiveness_score', 'beauty_rating', 'body_shape', 'bmi'])
      expect(() => {
        assertMigrationsClean(adds(column));
      }).toThrow(StoreError);
  });

  it('every declared family has a case above', () => {
    // The proof-suite discipline from `verify-claims-proof.mjs`: a rule with no planted case
    // means the test silently covers less than the check does, and nobody would notice a
    // family being added without one.
    const covered = new Set<string>();
    for (const column of [
      ...skinNames,
      'complexion',
      'ethnicity',
      'race',
      'attractiveness_score',
      'body_shape',
    ])
      for (const finding of findProhibited(`ADD COLUMN ${column} TEXT`, 'case'))
        covered.add(finding.id);
    expect([...covered].sort()).toEqual(PROHIBITED_IDENTIFIERS.map((p) => p.id).sort());
  });
});

describe('what it must NOT reject', () => {
  it('leaves palette_member.weight alone', () => {
    // `body_` is prefixed for exactly this: a bare `weight` pattern would refuse the column
    // the palette weight ladder writes, and the rule would be removed within a release.
    expect(findProhibited('ALTER TABLE palette_member ADD COLUMN weight REAL;', 'x')).toEqual([]);
  });

  it('leaves a comment discussing the rule alone', () => {
    // This repository's SQL is heavily commented and the comments discuss these concepts by
    // name — including migration 3's own. A check that fired on prose would be deleted for
    // crying wolf, and then the real check would be gone with it.
    const sql =
      '-- There is no skin colour column here, and NFR-22 is why.\n' +
      '/* Not an ethnicity classification, not a race field. */\n' +
      'ALTER TABLE personal_color_profile ADD COLUMN method TEXT;';
    expect(findProhibited(sql, 'x')).toEqual([]);
    // And the stripping is asserted directly, because it is the part most likely to be wrong.
    expect(sqlCode(sql)).not.toContain('NFR-22');
    expect(sqlCode(sql)).toContain('ADD COLUMN method TEXT');
  });

  it('does not treat "bracelet" as "race"', () => {
    expect(findProhibited('ALTER TABLE garment ADD COLUMN bracelet TEXT;', 'x')).toEqual([]);
  });
});

describe('a database that already has the column', () => {
  it('is refused on open, which is the case no code review can catch', () => {
    const { driver, info } = open();
    createRepository(driver, info);

    // The column arrives some other way — a fork, a hand-run ALTER, a build older than the
    // rule. `MIGRATIONS` is clean and the database is not, so only the sqlite_master half of
    // the check can see it.
    driver.exec('ALTER TABLE personal_color_profile ADD COLUMN skin_color TEXT');

    expect(() => {
      migrate(driver);
    }).toThrow(/NFR-22/);
    driver.close();
  });

  it('opens normally when it does not — the baseline for the assertion above', () => {
    const { driver, info } = open();
    const repo = createRepository(driver, info);
    expect(() => {
      migrate(driver);
    }).not.toThrow();
    // And the repository still works, so "it opened" is a fact about a usable database rather
    // than about a function that returned.
    expect(repo.listProfiles()).toEqual([]);
    expect(uuidv7()).toMatch(/^[0-9a-f]{8}-/);
    repo.close();
  });
});
