/**
 * A captured colour and the four facts it owes (F-108).
 *
 * ## The defect this file exists because of
 *
 * F-042 wrote `source: 'estimated'` onto a `saved_color` row and stored nothing else about the
 * capture. `'estimated'` is a `CapturedSource`, and ADR-0005's `CapturedProvenance` **requires**
 * `conditions` — illuminant, quality, sampleCount, variance — so the row could not be read back
 * as a `Color` at all.
 *
 * **F-042's tests were green throughout, and they were not weak tests.** They wrote rows and
 * asserted columns. What none of them did was read a colour back out *as a `Color`*, and a
 * column holding the string `'estimated'` looks perfectly correct until the type is asked for a
 * provenance. That is
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]] on a read path rather than a
 * module: the write side was covered end to end and the other side did not exist yet.
 *
 * The assertion that would have caught it is the **round trip**, and it is the first one here.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import { captureConditionsOf, createRepository, StoreError, uuidv7 } from '../src/index.js';
import type { NewSavedColor, Repository, StoredCaptureConditions } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-capture-'));
let n = 0;
const open = (): { repo: Repository; driver: ReturnType<typeof nodeDriver>['driver'] } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

const CONDITIONS: StoredCaptureConditions = {
  illuminant: 'daylight',
  quality: 'good',
  sampleCount: 4096,
  variance: 0.004,
};

const colour = (over: Partial<NewSavedColor> = {}): NewSavedColor => ({
  id: uuidv7(),
  name: '#4A6B8C',
  xyz_x: 0.1805,
  xyz_y: 0.0722,
  xyz_z: 0.9505,
  lab_l: 32.3,
  lab_a: 79.2,
  lab_b: -107.86,
  oklch_l: 0.452,
  oklch_c: 0.313,
  oklch_h: 264.05,
  hex: '#4A6B8C',
  source: 'reference',
  confidence: 1,
  corpus_slug: null,
  ...over,
});

describe('a captured colour', () => {
  it('ROUND-TRIPS its conditions — the assertion F-042 never made', () => {
    const { repo } = open();
    const row = colour({ source: 'estimated', confidence: 0.82, conditions: CONDITIONS });
    repo.saveColor(row, NOW);

    const back = repo.getColor(row.id);
    expect(back).toBeDefined();
    // The columns are there…
    expect(back?.capture_illuminant).toBe('daylight');
    expect(back?.capture_samples).toBe(4096);
    // …and they assemble back into exactly what went in. This is the shape ADR-0005 needs to
    // build a CapturedProvenance, and without it the row is unreadable as a Color.
    expect(captureConditionsOf(back!)).toEqual(CONDITIONS);
    repo.close();
  });

  it('keeps the estimate labelled as an estimate', () => {
    const { repo } = open();
    const row = colour({ source: 'estimated', confidence: 0.82, conditions: CONDITIONS });
    repo.saveColor(row, NOW);
    // Provenance is part of the value. A capture that came back as `reference` would be
    // indistinguishable downstream from a colour an editor verified.
    expect(repo.getColor(row.id)?.source).toBe('estimated');
    expect(repo.getColor(row.id)?.confidence).toBe(0.82);
    repo.close();
  });
});

describe('a reference colour', () => {
  it('owes no conditions, and is not refused for lacking them', () => {
    /*
     * THE DECOY FOR THE REFUSAL BELOW. A `captureConditionsOf` that threw on any null column
     * would pass every test in the next block and break the path every corpus-picked garment
     * takes — which is most of them. The working case has to be asserted or the fix is a
     * regression wearing a check.
     */
    const { repo } = open();
    const row = colour();
    repo.saveColor(row, NOW);

    const back = repo.getColor(row.id);
    expect(back?.capture_illuminant).toBeNull();
    expect(captureConditionsOf(back!)).toBeNull();
    repo.close();
  });
});

describe('a captured row written before migration 5', () => {
  /**
   * Planted by writing the row DIRECTLY, because the writer can no longer produce one: the
   * conditions are a single optional object on `NewSavedColor`, so "estimated with three of
   * four columns" is not expressible through the repository. The database can still hold it —
   * an older build wrote rows this way — so the reader is what has to refuse.
   */
  const plant = (over: Record<string, unknown>): { repo: Repository; id: string } => {
    const { repo, driver } = open();
    const id = uuidv7();
    driver.run(
      `INSERT INTO saved_color (id, created_at, updated_at, deleted_at, name, xyz_x, xyz_y,
         xyz_z, lab_l, lab_a, lab_b, oklch_l, oklch_c, oklch_h, hex, source, confidence,
         corpus_slug, capture_illuminant, capture_quality, capture_samples, capture_variance)
       VALUES (?, ?, ?, NULL, ?, 0.1, 0.1, 0.1, 1, 1, 1, 0.5, 0.1, 200, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      [
        id,
        NOW,
        NOW,
        '#4A6B8C',
        '#4A6B8C',
        'estimated',
        0.82,
        over['illuminant'] ?? null,
        over['quality'] ?? null,
        over['samples'] ?? null,
        over['variance'] ?? null,
      ],
    );
    return { repo, id };
  };

  it('is REFUSED BY NAME rather than reconstructed', () => {
    const { repo, id } = plant({});
    const back = repo.getColor(id);
    expect(back).toBeDefined();
    expect(() => captureConditionsOf(back!)).toThrow(StoreError);
    // The message names the row and says why there is no honest substitute.
    expect(() => captureConditionsOf(back!)).toThrow(new RegExp(id));
    repo.close();
  });

  it('is NEVER downgraded to a reference colour', () => {
    /*
     * THE ASSERTION THAT MATTERS MOST, and the one a "make it work" fix would fail. Returning
     * null here — treating the row as though it owed no conditions — relabels a camera estimate
     * as a published value, and every reader downstream would believe it. That is the back door
     * into the type ADR-0005 exists to close, and it would make every other test in this file
     * pass.
     */
    const { repo, id } = plant({});
    const back = repo.getColor(id);
    expect(() => captureConditionsOf(back!)).toThrow();
    expect(back?.source).toBe('estimated');
    repo.close();
  });

  it('is refused when THREE of the four are present', () => {
    // All four or none. A row carrying an illuminant, a quality and a sample count but no
    // variance is not "mostly readable" — CaptureConditions requires all four, and a partial
    // set is the state that would tempt somebody to fill in the gap.
    const { repo, id } = plant({ illuminant: 'daylight', quality: 'good', samples: 4096 });
    const back = repo.getColor(id);
    expect(() => captureConditionsOf(back!)).toThrow(StoreError);
    repo.close();
  });
});
