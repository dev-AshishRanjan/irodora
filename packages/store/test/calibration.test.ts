/**
 * Migration 7 — the audit record for a calibrated reading (F-053, FR-16).
 *
 * ## What earns this file
 *
 * A migration with no test is the failure mode: it runs once on a device somebody already has
 * data on, and if it is wrong there is no second chance. What is asserted here is that the
 * table exists after migrating, that the constraints on it actually bite, and that
 * `saved_color` gained its link **without** inventing a value for rows that predate it.
 *
 * The constraints are the point. `STRICT` plus `CHECK` is what stops a correction being stored
 * with a max residual below its mean, or in a colour space nobody can apply it in — both of
 * which are silently meaningless rather than loudly broken, and both of which would only be
 * discovered when F-063 tried to read the numbers back.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { nodeDriver } from '../src/drivers/node.js';
import { createRepository } from '../src/index.js';
import { SCHEMA_VERSION, SYNC_TABLES } from '../src/schema.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-calibration-'));
let n = 0;

/*
 * Every handle is kept and closed. On Windows an open SQLite file cannot be deleted, so a
 * suite that opens a database per case and forgets them fails its own teardown with EPERM —
 * which reads as a broken test rather than as the leak it is.
 */
const opened: { close: () => void }[] = [];
const open = () => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  createRepository(driver, info);
  opened.push(driver);
  return driver;
};

afterAll(() => {
  for (const driver of opened) driver.close();
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

const INSERT = `
  INSERT INTO calibration (
    id, created_at, updated_at, deleted_at,
    card_id, card_source, space, patch_count, degrees_of_freedom,
    m00, m01, m02, m10, m11, m12, m20, m21, m22,
    residual_before_mean, residual_before_max, residual_after_mean, residual_after_max
  ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const row = (overrides: Partial<Record<string, unknown>> = {}) => {
  const base: Record<string, unknown> = {
    id: `cal-${String(n)}`,
    card_id: 'constructed-24',
    card_source: 'Constructed for tests. NOT a published card.',
    space: 'srgb',
    patch_count: 24,
    degrees_of_freedom: 63,
    residual_before_mean: 4.2,
    residual_before_max: 9.1,
    residual_after_mean: 0.4,
    residual_after_max: 1.2,
    ...overrides,
  };
  return [
    base['id'],
    NOW,
    NOW,
    base['card_id'],
    base['card_source'],
    base['space'],
    base['patch_count'],
    base['degrees_of_freedom'],
    0.9,
    0.05,
    0.02,
    0.03,
    0.94,
    0.03,
    0.01,
    0.06,
    1.1,
    base['residual_before_mean'],
    base['residual_before_max'],
    base['residual_after_mean'],
    base['residual_after_max'],
  ];
};

describe('migration 7', () => {
  it('brings the schema to 7 and creates the table', () => {
    expect(SCHEMA_VERSION).toBe(7);
    const driver = open();

    const tables = driver.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'calibration'",
    );
    expect(tables).toHaveLength(1);
  });

  it('stores a correction and reads back the nine coefficients', () => {
    const driver = open();
    driver.run(INSERT, row({ id: 'cal-a' }));

    const found = driver.query<{ m00: number; m22: number; residual_after_mean: number }>(
      'SELECT m00, m22, residual_after_mean FROM calibration WHERE id = ?',
      ['cal-a'],
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.m00).toBeCloseTo(0.9, 12);
    expect(found[0]?.m22).toBeCloseTo(1.1, 12);
    expect(found[0]?.residual_after_mean).toBeCloseTo(0.4, 12);
  });

  it('refuses a colour space no correction can be applied in', () => {
    const driver = open();
    // `unknown` is a real CaptureSpace in the app and deliberately NOT a storable one: a
    // correction whose input space nobody knows cannot be applied to anything later.
    expect(() => {
      driver.run(INSERT, row({ id: 'cal-b', space: 'unknown' }));
    }).toThrow();
  });

  it('refuses a max residual below its own mean', () => {
    const driver = open();
    expect(() => {
      driver.run(INSERT, row({ id: 'cal-c', residual_after_mean: 3, residual_after_max: 1 }));
    }).toThrow();
  });

  it('refuses a negative residual', () => {
    const driver = open();
    expect(() => {
      driver.run(INSERT, row({ id: 'cal-d', residual_before_mean: -1 }));
    }).toThrow();
  });

  it('refuses fewer patches than can determine a 3x3', () => {
    const driver = open();
    expect(() => {
      driver.run(INSERT, row({ id: 'cal-e', patch_count: 2, degrees_of_freedom: 0 }));
    }).toThrow();
  });

  it('stores the degrees of freedom, so a residual of zero can be read for what it is', () => {
    /*
     * A 3-patch fit reproduces its own three patches exactly: measured `after.mean` = 1.5e-14
     * for a matrix that is 0.482 ΔE00 out on a fourth colour. Without this column an audit
     * surface renders "0.00 ΔE00 after correction" and means nothing by it.
     */
    const driver = open();
    driver.run(
      INSERT,
      row({
        id: 'cal-df',
        patch_count: 3,
        degrees_of_freedom: 0,
        residual_after_mean: 0,
        residual_after_max: 0,
      }),
    );

    const found = driver.query<{ degrees_of_freedom: number }>(
      'SELECT degrees_of_freedom FROM calibration WHERE id = ?',
      ['cal-df'],
    );
    expect(found[0]?.degrees_of_freedom).toBe(0);
  });

  it('refuses negative degrees of freedom', () => {
    const driver = open();
    expect(() => {
      driver.run(INSERT, row({ id: 'cal-f', degrees_of_freedom: -3 }));
    }).toThrow();
  });

  it('accepts the row the constraints are meant to allow — the decoy for all of the above', () => {
    /*
     * Without this, every refusal above could be passing because the INSERT is malformed
     * rather than because a CHECK fired [[a-decoy-that-is-not-broken-proves-nothing]].
     */
    const driver = open();
    expect(() => {
      driver.run(INSERT, row({ id: 'cal-ok' }));
    }).not.toThrow();
  });
});

describe('saved_color and its correction', () => {
  it('gains a nullable link, so a capture with no correction has none', () => {
    const driver = open();
    const columns = driver.query<{ name: string; notnull: number; dflt_value: unknown }>(
      'SELECT name, "notnull", dflt_value FROM pragma_table_info(\'saved_color\')',
    );
    const link = columns.find((column) => column.name === 'calibration_id');

    expect(link).toBeDefined();
    // Nullable and undefaulted, deliberately: an uncorrected capture has no correction, and a
    // default would invent one for every row written before this migration existed.
    expect(link?.notnull).toBe(0);
    expect(link?.dflt_value).toBeNull();
  });

  it('refuses a link to a correction that does not exist', () => {
    const driver = open();
    expect(() => {
      driver.run(
        `INSERT INTO saved_color (
           id, created_at, updated_at, deleted_at, name,
           xyz_x, xyz_y, xyz_z, lab_l, lab_a, lab_b, oklch_l, oklch_c, oklch_h,
           hex, source, confidence, calibration_id
         ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'col-a',
          NOW,
          NOW,
          'Rust',
          0.2,
          0.15,
          0.05,
          45.6,
          30.1,
          28.4,
          0.55,
          0.12,
          40.2,
          '#8a4b32',
          'calibrated',
          0.7,
          'no-such-correction',
        ],
      );
    }).toThrow();
  });
});

describe('the archive', () => {
  it('carries corrections, because a new sync table joins the backup format (E-023)', () => {
    /*
     * `archive.ts` reads `SELECT *` over `SYNC_TABLES`, so listing `calibration` there is what
     * puts it into every export and its canonical digest — with nobody editing `archive.ts`.
     * Asserted deliberately: a restored database that came back without its corrections would
     * turn every `calibrated` colour into an unfalsifiable claim, silently.
     */
    expect(SYNC_TABLES).toContain('calibration');
  });
});
