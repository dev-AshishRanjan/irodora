/**
 * The personal colour profile in SQLite.
 *
 * The conformance suite proves durability, tombstones and the range CHECK against **both**
 * drivers. This file proves what only the CI driver can be asked: that a database written by
 * an older build takes the migration, that a row holding a value from a different vocabulary
 * is refused rather than cast, and that the twenty-one per-dimension columns are wired to the
 * dimensions they are named after.
 *
 * That last one sounds trivial and is the defect this file exists for: `confidence_chroma` and
 * `confidence_contrast` are adjacent in the column list, in the INSERT and in the SELECT, and
 * a transposition between them type-checks, round-trips, and is invisible in every test that
 * writes the same number into both.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  createRepository,
  migrate,
  MIGRATIONS,
  PROFILE_DIMENSIONS,
  SCHEMA_VERSION,
  StoreError,
  uuidv7,
} from '../src/index.js';
import type { NewPersonalProfile, ProfileDimension, Repository } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-profile-'));
let n = 0;
const open = (): { repo: Repository; driver: ReturnType<typeof nodeDriver>['driver'] } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Every dimension gets a DIFFERENT confidence and the origins are not all the same.
 *
 * `0.11 … 0.17`, one per dimension, so a transposed pair of columns changes a value rather
 * than swapping two numbers that happen to be equal. A fixture with 0.5 everywhere would pass
 * on a wiring that is completely crossed.
 */
const distinctConfidence = Object.fromEntries(
  PROFILE_DIMENSIONS.map((d, i) => [d, 0.11 + i * 0.01]),
) as Record<ProfileDimension, number>;

const profile = (id: string, over: Partial<NewPersonalProfile> = {}): NewPersonalProfile => ({
  id,
  method: 'guided',
  lightness: { min: 0.4, max: 0.72 },
  temperatureBias: 0.33,
  chroma: { min: 0.03, max: 0.15 },
  contrast: 'medium',
  confidence: distinctConfidence,
  origin: {
    lightness: 'derived',
    temperature: 'user',
    chroma: 'derived',
    contrast: 'user',
    neutrals: 'derived',
    accents: 'derived',
    avoid: 'user',
  },
  neutrals: ['ai-nezumi', 'usu-gami'],
  accents: ['beni-hi'],
  avoid: ['kariyasu'],
  ...over,
});

describe('a profile round-trips', () => {
  it('comes back with every dimension attached to its own column', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.saveProfile(profile(id), 1000);

    const after = repo.getProfile(id);
    expect(after).toBeDefined();
    // The whole record at once. Asserting field by field is how a transposition survives:
    // the two crossed fields get checked against each other's values and both pass.
    expect(after?.confidence).toEqual(distinctConfidence);
    expect(after?.origin).toEqual(profile(id).origin);
    expect(after?.lightness).toEqual({ min: 0.4, max: 0.72 });
    expect(after?.chroma).toEqual({ min: 0.03, max: 0.15 });
    expect(after?.temperatureBias).toBe(0.33);
    expect(after?.contrast).toBe('medium');
    expect(after?.method).toBe('guided');
    expect(after?.neutrals).toEqual(['ai-nezumi', 'usu-gami']);
    expect(after?.accents).toEqual(['beni-hi']);
    expect(after?.avoid).toEqual(['kariyasu']);
    repo.close();
  });

  it('keeps list order, because the order is the ranking', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.saveProfile(profile(id, { neutrals: ['usu-gami', 'ai-nezumi', 'sumi'] }), 1000);
    expect(repo.getProfile(id)?.neutrals).toEqual(['usu-gami', 'ai-nezumi', 'sumi']);

    const insertsAfterFirstWrite = repo
      .changeLog()
      .filter((r) => r.table_name === 'profile_dimension_color' && r.op === 'insert').length;
    // Three neutrals, one accent, one avoid.
    expect(insertsAfterFirstWrite).toBe(5);

    // Reordered, not replaced. The ids are derived from (profile, dimension, slug), so this
    // is three updates and NO new rows — the assertion that would fail on an implementation
    // that tore the list down and rebuilt it, which reads identically from `getProfile`.
    repo.saveProfile(profile(id, { neutrals: ['sumi', 'usu-gami', 'ai-nezumi'] }), 2000);
    expect(repo.getProfile(id)?.neutrals).toEqual(['sumi', 'usu-gami', 'ai-nezumi']);

    const inserts = repo
      .changeLog()
      .filter((r) => r.table_name === 'profile_dimension_color' && r.op === 'insert').length;
    expect(inserts).toBe(insertsAfterFirstWrite);
    repo.close();
  });

  it('lets one slug sit in two dimensions without the rows colliding', () => {
    // A low-chroma entry can be somebody's neutral and, at a different lightness, on another
    // person's avoid list. The row id is derived from (profile, dimension, slug) precisely so
    // this is two rows rather than a UNIQUE failure.
    const { repo } = open();
    const id = uuidv7();
    repo.saveProfile(profile(id, { neutrals: ['sumi'], avoid: ['sumi'] }), 1000);
    const after = repo.getProfile(id);
    expect(after?.neutrals).toEqual(['sumi']);
    expect(after?.avoid).toEqual(['sumi']);
    repo.close();
  });

  it('separates a tombstoned profile from one that never existed', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.saveProfile(profile(id), 1000);
    repo.deleteProfile(id, 2000);

    expect(repo.getProfile(id)?.deletedAt).toBe(2000);
    expect(repo.getProfile('never-existed')).toBeUndefined();
    expect(repo.listProfiles()).toEqual([]);
    // The list entries go too. They are tombstoned explicitly rather than left to a cascade
    // that a soft delete never fires.
    expect(repo.getProfile(id)?.neutrals).toEqual([]);
    repo.close();
  });
});

describe('the migration', () => {
  it('brings a version-2 database up without touching what is in it', () => {
    const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
    // A database as an older build left it: migrated to 2 and stopped there.
    driver.exec('PRAGMA foreign_keys = ON');
    for (const step of MIGRATIONS.filter((m) => m.version <= 2)) {
      driver.exec(step.up);
      driver.exec(`PRAGMA user_version = ${String(step.version)}`);
    }
    driver.run(
      `INSERT INTO palette (id, created_at, updated_at, deleted_at, name, name_ja,
         classification, category, version_id)
       VALUES ('kept', 1, 1, NULL, 'Kept', 'Kept', 'editorial', 'contemporary', '2026.08.1')`,
    );

    const applied = migrate(driver);
    expect(applied).toBe(1);
    expect(driver.query<{ user_version: number }>('PRAGMA user_version')[0]?.user_version).toBe(
      SCHEMA_VERSION,
    );
    // The pre-existing row is still there. A migration that loses data passes every test that
    // only checks the new table exists.
    expect(driver.query<{ id: string }>('SELECT id FROM palette')).toEqual([{ id: 'kept' }]);
    const repo = createRepository(driver, info);
    expect(repo.listProfiles()).toEqual([]);
    repo.close();
  });
});

describe('a row from a vocabulary that is not ours', () => {
  it('is refused by name rather than cast into the union', () => {
    const { repo, driver } = open();
    const id = uuidv7();
    repo.saveProfile(profile(id), 1000);

    // The database's own half: the CHECK refuses the value outright.
    let rejected = false;
    try {
      driver.run('UPDATE personal_color_profile SET contrast_preference = ? WHERE id = ?', [
        'extreme',
        id,
      ]);
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
    // And the row is unchanged, so a refused write is not a partial one.
    expect(repo.getProfile(id)?.contrast).toBe('medium');
    repo.close();
  });

  it('throws a StoreError when the CHECK is not there to stop it', () => {
    /*
     * The read path's own guard, exercised where the database cannot help.
     *
     * `ignore_check_constraints` stands in for the case that actually produces this row: a
     * build with a wider vocabulary wrote it, and this build has to read it. Without the
     * guard the string would travel as a `ContrastPreference`, be compared against three
     * values it is not any of, and simply never match — no error, ever.
     */
    const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
    const repo = createRepository(driver, info);
    driver.exec('PRAGMA ignore_check_constraints = ON');
    const id = uuidv7();
    driver.run(
      `INSERT INTO personal_color_profile (id, created_at, updated_at, deleted_at, method,
         lightness_min, lightness_max, temperature_bias, chroma_min, chroma_max,
         contrast_preference, confidence_lightness, confidence_temperature, confidence_chroma,
         confidence_contrast, confidence_neutrals, confidence_accents, confidence_avoid,
         origin_lightness, origin_temperature, origin_chroma, origin_contrast,
         origin_neutrals, origin_accents, origin_avoid)
       VALUES (?, 1, 1, NULL, 'guided', 0.2, 0.8, 0, 0.0, 0.2, 'extreme',
         0.5,0.5,0.5,0.5,0.5,0.5,0.5,
         'derived','derived','derived','derived','derived','derived','derived')`,
      [id],
    );

    expect(() => repo.getProfile(id)).toThrow(StoreError);
    // Naming the column and the allowed set, so the message survives being read by somebody
    // who does not already know what went wrong.
    expect(() => repo.getProfile(id)).toThrow(/contrast_preference/);
    repo.close();
  });
});
