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

  it('rejects age, which F-037 added — including the names it actually gets given', () => {
    // NFR-22 is written about dermatological, ethnic and body judgements; age belongs with them
    // for the same reason. What colour suits somebody is not a function of how old they are.
    for (const column of ['age', 'age_band', 'age_range', 'birth_year', 'date_of_birth', 'dob'])
      expect(() => {
        assertMigrationsClean(adds(column));
      }).toThrow(StoreError);
  });

  it('rejects health, which is regulated territory the product stays out of', () => {
    for (const column of [
      'health_status',
      'medical_history',
      'diagnosis',
      'pregnancy_status',
      'disability',
    ])
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
      'age_band',
      'health_status',
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
    expect(findProhibited('ALTER TABLE palette_member ADD COLUMN weight REAL;', 'x')).toHaveLength(
      0,
    );
  });

  it('leaves a comment discussing the rule alone', () => {
    // This repository's SQL is heavily commented and the comments discuss these concepts by
    // name — including migration 3's own. A check that fired on prose would be deleted for
    // crying wolf, and then the real check would be gone with it.
    const sql =
      '-- There is no skin colour column here, and NFR-22 is why.\n' +
      '/* Not an ethnicity classification, not a race field. */\n' +
      'ALTER TABLE personal_color_profile ADD COLUMN method TEXT;';
    expect(findProhibited(sql, 'x')).toHaveLength(0);
    // And the stripping is asserted directly, because it is the part most likely to be wrong.
    expect(sqlCode(sql)).not.toContain('NFR-22');
    expect(sqlCode(sql)).toContain('ADD COLUMN method TEXT');
  });

  it('does not treat "bracelet" as "race"', () => {
    expect(findProhibited('ALTER TABLE garment ADD COLUMN bracelet TEXT;', 'x')).toHaveLength(0);
  });

  it('does not treat "percentage" — or five other ordinary words — as "age"', () => {
    /*
     * THE DECOYS THAT DECIDE WHETHER THE AGE RULE SURVIVES. Every one of these contains the
     * letters "age", and a rule that flagged `percentage` would be removed within a day —
     * taking the real protection with it. The rule is anchored, and this is where that is
     * watched NOT firing.
     */
    for (const word of [
      'average',
      'image_path',
      'storage_key',
      'language',
      'usage_count',
      'percentage',
    ])
      expect(findProhibited(`ALTER TABLE garment ADD COLUMN ${word} TEXT;`, 'x')).toHaveLength(0);
  });

  it('does not treat "manager" or "condition" as health', () => {
    // A bare `condition` was considered for the health family and LEFT OUT, precisely because
    // it is an ordinary word in a codebase. The families name what a FIELD would be called, not
    // every word a health claim might use.
    for (const word of ['manager_id', 'condition_code'])
      expect(findProhibited(`ALTER TABLE garment ADD COLUMN ${word} TEXT;`, 'x')).toHaveLength(0);
  });

  it('DOES flag `healthy_margin`, and that false positive is accepted deliberately', () => {
    /*
     * `\bhealth\w*\b` matches `healthy_margin`. Recorded rather than tuned away.
     *
     * The alternative is anchoring to `health_` with an underscore, which would then MISS
     * `healthstatus` and `healthData` — the names the field would actually be given. A rule
     * aimed at a protected characteristic should err toward refusing, and the cost here is a
     * column nobody in a colour product would write.
     *
     * Asserted so the trade-off is visible and somebody narrowing the rule has to come here
     * first and decide it again, rather than discovering it as a surprise.
     */
    const findings = findProhibited('ALTER TABLE garment ADD COLUMN healthy_margin TEXT;', 'x');
    expect(findings.map((f) => f.id)).toEqual(['health']);
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
    expect(repo.listProfiles()).toHaveLength(0);
    expect(uuidv7()).toMatch(/^[0-9a-f]{8}-/);
    repo.close();
  });
});
