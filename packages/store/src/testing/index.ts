/**
 * The store conformance suite.
 *
 * Exported so **both** drivers run the same one — `node:sqlite` in CI, `expo-sqlite` on a
 * device. That is the only thing making a green CI run say anything at all about the database
 * that ships, and it says it only as far as the suite reaches.
 *
 * Findings-based rather than assertion-based, for the same reason `@irodora/ui/testing` is:
 * this package runs under Vitest and `apps/mobile` runs under Jest (ADR-0055), so a suite that
 * called `expect` could only ever run in one of them.
 *
 * ## The assertions that earn it
 *
 * Three of these are written specifically against tests that look right and prove nothing:
 *
 * - **durability** reopens the database. A round-trip without a reopen tests the cache.
 * - **foreign keys** are proven by watching a bad write *fail*, never by reading the pragma
 *   back. `PRAGMA foreign_keys` returning 1 asserts that a line executed; it does not assert
 *   that the constraint is enforced on this connection, which is the thing that is usually
 *   wrong because SQLite defaults it **off** and it is per-connection.
 * - **the change log** is checked for *which* row and op, not for a count. A count passes on
 *   a log that recorded the wrong operation against the wrong id.
 */

import { createRepository } from '../createRepository.js';
import { uuidv7 } from '../id.js';
import type {
  Driver,
  DriverInfo,
  NewPalette,
  NewPersonalProfile,
  NewSavedColor,
} from '../repository.js';

export interface StoreFinding {
  readonly driver: string;
  readonly check: string;
  readonly detail: string;
}

/** Opens a fresh, EMPTY database. A file path, not `:memory:` — durability needs a reopen. */
export type OpenStore = () => { readonly driver: Driver; readonly info: DriverInfo };

const sample = (id: string, name: string): NewSavedColor => ({
  id,
  name,
  xyz_x: 0.1805,
  xyz_y: 0.0722,
  xyz_z: 0.9505,
  lab_l: 32.3,
  lab_a: 79.2,
  lab_b: -107.86,
  oklch_l: 0.452,
  oklch_c: 0.313,
  oklch_h: 264.05,
  hex: '#0000FF',
  source: 'declared',
  confidence: 1,
  // null on purpose: this fixture is not a corpus entry, and the nullable branch is the one
  // a Lens capture (F-040) will take.
  corpus_slug: null,
});

/**
 * A two-member palette, the smallest one the corpus schema accepts: an anchor and one other.
 *
 * Members carry a `corpus_slug` here — unlike `sample` — because that is the only way back to
 * the entry a member names, and a palette whose members have none cannot be re-expressed as a
 * corpus record at all.
 */
const palette = (id: string): NewPalette => ({
  id,
  nameEn: 'Evening walk',
  nameJa: 'Evening walk',
  classification: 'editorial',
  category: 'contemporary',
  versionId: '2026.08.1',
  members: [
    {
      color: { ...sample(uuidv7(), 'Ai-nezumi'), corpus_slug: 'ai-nezumi' },
      role: 'anchor',
      rank: 1,
      weight: 1,
    },
    {
      color: { ...sample(uuidv7(), 'Usu-gami'), corpus_slug: 'usu-gami' },
      role: 'light',
      rank: 2,
      weight: 0.6,
    },
  ],
});

/**
 * A profile with something interesting in every part of it.
 *
 * **`temperature` is `user` and the rest are `derived` on purpose.** A fixture where every
 * origin is the same value cannot tell a round trip that preserves the column from one that
 * writes a constant — the latch is the whole of F-026's fourth criterion, and a check that
 * would pass on a hard-coded `'derived'` proves nothing about it.
 *
 * The confidences differ from each other for the same reason.
 */
const profile = (id: string): NewPersonalProfile => ({
  id,
  method: 'guided',
  lightness: { min: 0.42, max: 0.78 },
  temperatureBias: -0.5,
  chroma: { min: 0.02, max: 0.14 },
  contrast: 'high',
  confidence: {
    lightness: 0.75,
    temperature: 0.5,
    chroma: 0.5,
    contrast: 0.75,
    neutrals: 0.5,
    accents: 0.5,
    avoid: 0.5,
  },
  origin: {
    lightness: 'derived',
    temperature: 'user',
    chroma: 'derived',
    contrast: 'derived',
    neutrals: 'derived',
    accents: 'derived',
    avoid: 'derived',
  },
  neutrals: ['ai-nezumi', 'usu-gami'],
  accents: ['ai-nezumi'],
  avoid: ['usu-gami'],
});

/**
 * Run every conformance check against one driver.
 *
 * Returns findings. An empty array means it conformed — it does **not** mean anything ran, so
 * `checkStore` reports the number of checks executed and the caller asserts on that too.
 */
export function checkStore(open: OpenStore): {
  readonly findings: readonly StoreFinding[];
  readonly ran: number;
  readonly info: DriverInfo;
} {
  const findings: StoreFinding[] = [];
  let ran = 0;
  const { driver: probe, info } = open();
  probe.close();

  const at = (check: string, detail: string): void => {
    findings.push({ driver: info.name, check, detail });
  };

  const run = (check: string, fn: () => void): void => {
    ran += 1;
    const { driver } = open();
    try {
      fn.call(null);
    } catch (error) {
      at(check, `threw: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      try {
        driver.close();
      } catch {
        /* the check may already have closed it */
      }
    }
  };

  // --- a write survives a reopen -------------------------------------------------------
  run('durability', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();
    repo.saveColor(sample(id, 'Indigo'), 1000);

    // THE REOPEN IS THE TEST. Without it this asserts that an in-process object still holds
    // what was put in it, which is true of a Map.
    repo.reopen();

    const after = repo.getColor(id);
    if (after === undefined) at('durability', 'the row did not survive a reopen');
    else if (after.name !== 'Indigo')
      at('durability', `name came back as "${after.name}" after a reopen`);
    repo.close();
  });

  // --- a tombstone is not an absence ---------------------------------------------------
  run('tombstone', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();
    repo.saveColor(sample(id, 'Indigo'), 1000);
    repo.deleteColor(id, 2000);

    if (repo.listColors().some((r) => r.id === id))
      at('tombstone', 'a deleted row is still listed as live');

    const row = repo.getColor(id);
    if (row === undefined)
      at(
        'tombstone',
        'a deleted row is gone entirely — "deleted" and "never existed" must stay ' +
          'distinguishable, which is the whole reason for a tombstone rather than a DELETE',
      );
    else if (row.deleted_at === null) at('tombstone', 'the row is not tombstoned');
    repo.close();
  });

  // --- the change log records what happened, not merely that something did --------------
  run('change-log', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();
    repo.saveColor(sample(id, 'Indigo'), 1000);
    repo.saveColor({ ...sample(id, 'Ai'), id }, 1500);
    repo.deleteColor(id, 2000);

    const ops = repo.changeLog().map((r) => `${r.table_name}:${r.op}:${r.row_id}`);
    const want = [
      `saved_color:insert:${id}`,
      `saved_color:update:${id}`,
      `saved_color:delete:${id}`,
    ];
    // WHICH rows, in order — not how many. A count passes on a log that recorded the wrong
    // operation against the wrong id, which is the only way a log can mislead a reconciler.
    if (ops.join(' | ') !== want.join(' | '))
      at('change-log', `got [${ops.join(', ')}], want [${want.join(', ')}]`);
    repo.close();
  });

  // --- foreign keys are ENFORCED, not merely declared ------------------------------------
  run('foreign-keys', () => {
    const { driver, info: i } = open();
    createRepository(driver, i);
    let rejected = false;
    try {
      driver.run(
        `INSERT INTO palette_member
           (id, created_at, updated_at, deleted_at, palette_id, color_id, position, role)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`,
        [uuidv7(), 1000, 1000, 'no-such-palette', 'no-such-colour', 0, 'anchor'],
      );
    } catch {
      rejected = true;
    }
    if (!rejected)
      at(
        'foreign-keys',
        'a row referencing a non-existent palette and colour was ACCEPTED. SQLite defaults ' +
          'foreign_keys OFF and it is per-connection, so every REFERENCES clause in the ' +
          'schema is enforcing nothing on this connection',
      );
    driver.close();
  });

  // --- a CHECK constraint is enforced ----------------------------------------------------
  run('check-constraints', () => {
    const { driver, info: i } = open();
    createRepository(driver, i);
    let rejected = false;
    try {
      // confidence must be within [0,1]; provenance is not decorative (ADR-0005).
      driver.run(
        `INSERT INTO saved_color (id, created_at, updated_at, deleted_at, name,
           xyz_x, xyz_y, xyz_z, lab_l, lab_a, lab_b, oklch_l, oklch_c, oklch_h, hex,
           source, confidence)
         VALUES (?, ?, ?, NULL, ?, 0,0,0, 0,0,0, 0,0,0, '#000000', 'declared', ?)`,
        [uuidv7(), 1000, 1000, 'bad', 4.2],
      );
    } catch {
      rejected = true;
    }
    if (!rejected) at('check-constraints', 'a confidence of 4.2 was accepted');
    driver.close();
  });

  // --- a rolled-back write leaves no change-log row ---------------------------------------
  run('transaction-atomicity', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    try {
      driver.transaction(() => {
        driver.run('INSERT INTO change_log (table_name, row_id, op, at) VALUES (?,?,?,?)', [
          'saved_color',
          'phantom',
          'insert',
          1000,
        ]);
        throw new Error('deliberate');
      });
    } catch {
      /* expected */
    }
    // A change-log row that survives a rolled-back write describes something that did not
    // happen, and a future reconciliation would apply it confidently.
    if (repo.changeLog().some((r) => r.row_id === 'phantom'))
      at('transaction-atomicity', 'a change-log row survived a rolled-back transaction');
    repo.close();
  });

  // --- ids are time-ordered, including within one millisecond ----------------------------
  run('id-ordering', () => {
    const ids = Array.from({ length: 50 }, () => uuidv7(1_700_000_000_000));
    const sorted = [...ids].sort();
    if (ids.join() !== sorted.join())
      at(
        'id-ordering',
        'ids generated within a single millisecond do not sort by creation order — ' +
          'insert locality and "insert order is meaningful" both depend on it',
      );
    if (new Set(ids).size !== ids.length) at('id-ordering', 'ids collided within a millisecond');
  });

  // --- a palette survives a reopen, with its members --------------------------------------
  run('palette-durability', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();
    repo.savePalette(palette(id), 1000);

    // The reopen again. A palette is written across THREE tables, so this is a stronger
    // statement than the single-row case: it says the whole write committed, not that an
    // object still holds what was put into it.
    repo.reopen();

    const after = repo.getPalette(id);
    if (after === undefined) at('palette-durability', 'the palette did not survive a reopen');
    else if (after.members.length !== 2)
      at(
        'palette-durability',
        `${String(after.members.length)} member(s) survived the reopen; 2 were written`,
      );
    else if (after.members[0]?.slug !== 'ai-nezumi')
      at('palette-durability', 'members did not come back in rank order');
    repo.close();
  });

  // --- a palette write is atomic ACROSS TABLES --------------------------------------------
  run('palette-atomicity', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();

    /*
     * A palette row and a member that cannot exist, in one transaction. The member violates
     * the foreign key, so the statement fails — and the palette row must go with it.
     *
     * This is the multi-table half of `transaction-atomicity`, and it is worth its own check
     * because the two drivers implement `transaction` separately. A palette left behind with
     * no members is a palette the schema forbids and no read path would report: it simply
     * renders as empty.
     */
    try {
      driver.transaction(() => {
        driver.run(
          `INSERT INTO palette (id, created_at, updated_at, deleted_at, name, name_ja,
             classification, category, version_id)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
          [
            id,
            1000,
            1000,
            'Half a palette',
            'Half a palette',
            'editorial',
            'contemporary',
            '2026.08.1',
          ],
        );
        driver.run(
          `INSERT INTO palette_member (id, created_at, updated_at, deleted_at, palette_id,
             color_id, position, role, weight)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
          [uuidv7(), 1000, 1000, id, 'no-such-colour', 1, 'anchor', 1],
        );
      });
    } catch {
      /* expected: the member's colour does not exist */
    }

    if (repo.getPalette(id) !== undefined)
      at(
        'palette-atomicity',
        'a palette row survived a transaction whose member insert failed — it now has no ' +
          'members, which is a state the corpus schema rejects and a screen renders as empty',
      );
    repo.close();
  });

  // --- a profile survives a reopen, with its three lists ----------------------------------
  run('profile-durability', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();
    repo.saveProfile(profile(id), 1000);

    // The reopen, for the same reason as everywhere above: a profile is written across two
    // tables and 24 columns, and an in-process object would satisfy a read without it.
    repo.reopen();

    const after = repo.getProfile(id);
    if (after === undefined) at('profile-durability', 'the profile did not survive a reopen');
    else if (after.neutrals.join() !== 'ai-nezumi,usu-gami')
      at(
        'profile-durability',
        `neutrals came back as [${after.neutrals.join(', ')}]; a list that loses its ORDER ` +
          'loses the ranking the derivation put in it',
      );
    else if (after.origin.temperature !== 'user')
      at(
        'profile-durability',
        'origin_temperature came back as "derived" — the latch that stops a re-derivation ' +
          'overwriting a correction did not survive the round trip, which would silently ' +
          'undo the correction on the next run',
      );
    else if (after.confidence.chroma !== 0.5)
      at('profile-durability', `confidence_chroma came back as ${String(after.confidence.chroma)}`);
    repo.close();
  });

  // --- a list entry removed from a profile is tombstoned, not deleted ----------------------
  run('profile-list-tombstone', () => {
    const { driver, info: i } = open();
    const repo = createRepository(driver, i);
    const id = uuidv7();
    repo.saveProfile(profile(id), 1000);
    repo.saveProfile({ ...profile(id), neutrals: ['ai-nezumi'] }, 2000);

    const after = repo.getProfile(id);
    if (after?.neutrals.join() !== 'ai-nezumi')
      at('profile-list-tombstone', `neutrals is [${after?.neutrals.join(', ') ?? 'missing'}]`);

    const ops = repo
      .changeLog()
      .filter((r) => r.table_name === 'profile_dimension_color' && r.op === 'delete');
    if (ops.length !== 1)
      at(
        'profile-list-tombstone',
        `${String(ops.length)} delete(s) logged for one removal — a removed slug must be ` +
          'tombstoned exactly once, or a reconciler cannot tell one removal from several',
      );
    repo.close();
  });

  // --- the seven-dimension CHECK constraints are real --------------------------------------
  run('profile-check-constraints', () => {
    const { driver, info: i } = open();
    createRepository(driver, i);
    let rejected = false;
    try {
      /*
       * An INVERTED RANGE. `lightness_min > lightness_max` is not an unusual profile — it is
       * not a profile, and every reader would otherwise have to decide separately what to do
       * with it. The table-level CHECK is the one constraint here that no column CHECK could
       * express, so it is the one worth watching fail.
       */
      driver.run(
        `INSERT INTO personal_color_profile (id, created_at, updated_at, deleted_at, method,
           lightness_min, lightness_max, temperature_bias, chroma_min, chroma_max,
           contrast_preference, confidence_lightness, confidence_temperature,
           confidence_chroma, confidence_contrast, confidence_neutrals, confidence_accents,
           confidence_avoid, origin_lightness, origin_temperature, origin_chroma,
           origin_contrast, origin_neutrals, origin_accents, origin_avoid)
         VALUES (?, ?, ?, NULL, 'guided', 0.8, 0.2, 0, 0.05, 0.2, 'medium',
           0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
           'derived','derived','derived','derived','derived','derived','derived')`,
        [uuidv7(), 1000, 1000],
      );
    } catch {
      rejected = true;
    }
    if (!rejected) at('profile-check-constraints', 'a lightness range of 0.8 … 0.2 was accepted');
    driver.close();
  });

  return { findings, ran, info };
}

/** Human-readable, for a failing assertion's message. */
export function formatStoreFindings(findings: readonly StoreFinding[]): string {
  return findings.map((f) => `  [${f.driver}] ${f.check}: ${f.detail}`).join('\n');
}
