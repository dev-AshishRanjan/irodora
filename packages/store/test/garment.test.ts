/**
 * The wardrobe, and the sentence FR-39 actually makes about it.
 *
 * > *Only colour and type are required at creation; every other field is progressively
 * > enriched.*
 *
 * That is a claim about what somebody is **asked for**, not about which columns permit NULL.
 * A creation path accepting twelve optional fields satisfies every constraint in migration 4
 * and still puts twelve decisions in front of a person adding a jumper. So the assertions here
 * are in two halves: the runtime one — a garment created from two values reads back with every
 * other field null — and the **type** one, which is the half that cannot rot, because
 * `ts-expect-error` fails the build when the error it names stops occurring.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import { createRepository, uuidv7, StoreError } from '../src/index.js';
import type { NewGarment, NewSavedColor, Repository } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-garment-'));
let n = 0;
const open = (): Repository => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return createRepository(driver, info);
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

const colour = (name: string, slug: string | null = null): NewSavedColor => ({
  id: uuidv7(),
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
  source: 'reference',
  confidence: 1,
  corpus_slug: slug,
});

describe('creating a garment', () => {
  it('needs a colour and a type, and records nothing else', () => {
    const repo = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'jumper', color: colour('Navy') }, NOW);

    const stored = repo.getGarment(id);
    expect(stored?.type).toBe('jumper');
    expect(stored?.color.name).toBe('Navy');

    // EVERY other field. Written out rather than looped, because a loop over Object.keys would
    // pass just as well against a garment that lost half its columns.
    expect(stored?.name).toBeNull();
    expect(stored?.pattern).toBeNull();
    expect(stored?.material).toBeNull();
    expect(stored?.formality).toBeNull();
    expect(stored?.brand).toBeNull();
    expect(stored?.size).toBeNull();
    expect(stored?.purchaseDate).toBeNull();
    expect(stored?.costMinor).toBeNull();
    expect(stored?.currency).toBeNull();
    expect(stored?.seasons).toHaveLength(0);
    expect(stored?.colors).toHaveLength(0);
    // The one non-null default, and it is a count rather than a claim about the garment.
    expect(stored?.wearCount).toBe(0);
    repo.close();
  });

  it('is the only shape the type accepts', () => {
    const id = uuidv7();

    // The positive case FIRST, so the negatives below are known to differ in one thing only.
    const minimal: NewGarment = { id, type: 'jumper', color: colour('Navy') };
    expect(minimal.type).toBe('jumper');

    // @ts-expect-error — a brand at creation. THIS is the assertion the requirement is about:
    // the field exists on the garment and must not be askable for when it is created.
    const withBrand: NewGarment = { id, type: 'jumper', color: colour('Navy'), brand: 'Uniqlo' };
    // @ts-expect-error — no colour.
    const noColour: NewGarment = { id, type: 'jumper' };
    // @ts-expect-error — no type.
    const noType: NewGarment = { id, color: colour('Navy') };

    // Referenced so the bindings are not unused — an unused-var error would mask the
    // ts-expect-error above it and the test would pass for the wrong reason.
    expect([withBrand, noColour, noType]).toHaveLength(3);
  });
});

describe('enrichment', () => {
  it('fills fields afterwards, one at a time, without touching the others', () => {
    const repo = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'jumper', color: colour('Navy') }, NOW);

    repo.enrichGarment(id, { brand: 'Uniqlo' }, NOW + 1);
    expect(repo.getGarment(id)?.brand).toBe('Uniqlo');
    // Untouched by a patch that did not mention it. A builder that rewrote every column with
    // `patch.x ?? null` would clear this and pass any test that only checked `brand`.
    expect(repo.getGarment(id)?.type).toBe('jumper');

    repo.enrichGarment(id, { size: 'M', costMinor: 2990, currency: 'GBP' }, NOW + 2);
    const stored = repo.getGarment(id);
    expect(stored?.brand).toBe('Uniqlo');
    expect(stored?.size).toBe('M');
    expect(stored?.costMinor).toBe(2990);
    expect(stored?.currency).toBe('GBP');
    repo.close();
  });

  it('tells an explicit null from an absent key', () => {
    const repo = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'jumper', color: colour('Navy') }, NOW);
    repo.enrichGarment(id, { brand: 'Uniqlo', size: 'M' }, NOW + 1);

    // The distinction that makes every field re-editable rather than write-once.
    repo.enrichGarment(id, { brand: null }, NOW + 2);
    expect(repo.getGarment(id)?.brand).toBeNull();
    expect(repo.getGarment(id)?.size).toBe('M');
    repo.close();
  });

  it('replaces seasons rather than accumulating them, and de-duplicates', () => {
    const repo = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'coat', color: colour('Navy') }, NOW);

    repo.enrichGarment(id, { seasons: ['autumn', 'winter'] }, NOW + 1);
    expect(repo.getGarment(id)?.seasons).toEqual(['autumn', 'winter']);

    repo.enrichGarment(id, { seasons: ['spring'] }, NOW + 2);
    expect(repo.getGarment(id)?.seasons).toEqual(['spring']);

    // A repeated season is one season. The CHECK constrains the vocabulary and nothing
    // constrains repetition, so without the Set a coat is twice-autumnal.
    repo.enrichGarment(id, { seasons: ['autumn', 'autumn'] }, NOW + 3);
    expect(repo.getGarment(id)?.seasons).toEqual(['autumn']);

    repo.enrichGarment(id, { seasons: [] }, NOW + 4);
    expect(repo.getGarment(id)?.seasons).toHaveLength(0);
    repo.close();
  });

  it('carries secondary and accent colours', () => {
    const repo = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'scarf', color: colour('Navy') }, NOW);

    repo.enrichGarment(
      id,
      {
        colors: [
          { role: 'secondary', color: colour('Cream'), proportion: 0.3 },
          { role: 'accent', color: colour('Gold'), proportion: null },
        ],
      },
      NOW + 1,
    );

    const stored = repo.getGarment(id);
    expect(stored?.colors.map((c) => c.role)).toEqual(['accent', 'secondary']);
    expect(stored?.colors.find((c) => c.role === 'secondary')?.proportion).toBe(0.3);
    expect(stored?.colors.find((c) => c.role === 'accent')?.proportion).toBeNull();
    // The primary is NOT among them — it is a column on garment, which is why the role CHECK
    // has no 'primary' value to be inconsistent about.
    expect(stored?.color.name).toBe('Navy');
    repo.close();
  });

  it('refuses to create a garment by patching one that is not there', () => {
    const repo = open();
    // A silent insert here turns a mistyped id into a second garment holding half the edits,
    // which nothing would report and nobody could find.
    expect(() => {
      repo.enrichGarment('not-a-garment', { brand: 'Uniqlo' }, NOW);
    }).toThrow(StoreError);
    repo.close();
  });
});

describe('deleting a garment', () => {
  it('tombstones its children too, and the log says so', () => {
    const repo = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'coat', color: colour('Navy') }, NOW);
    repo.enrichGarment(
      id,
      {
        seasons: ['winter'],
        colors: [{ role: 'accent', color: colour('Gold'), proportion: null }],
      },
      NOW + 1,
    );

    repo.deleteGarment(id, NOW + 2);
    expect(repo.listGarments()).toHaveLength(0);
    // Readable by id, because a tombstoned row is deleted rather than missing.
    expect(repo.getGarment(id)?.deletedAt).toBe(NOW + 2);
    // And its children went with it. WHICH rows and WHICH op, never a count: a count passes
    // for a log that recorded the right number of the wrong things.
    const deletes = repo
      .changeLog()
      .filter((e) => e.op === 'delete')
      .map((e) => e.table_name)
      .sort();
    expect(deletes).toEqual(['garment', 'garment_color', 'garment_season']);
    repo.close();
  });
});

describe('the colour a garment is written under', () => {
  it('is reused when two garments name the same corpus entry', () => {
    const repo = open();
    const a = uuidv7();
    const b = uuidv7();
    repo.createGarment({ id: a, type: 'jumper', color: colour('Navy', 'kon') }, NOW);
    repo.createGarment({ id: b, type: 'scarf', color: colour('Navy', 'kon') }, NOW + 1);

    // One row, not two. Otherwise "how many navy things do I own" is a question about rows
    // rather than about clothes, and the count grows with edits.
    expect(repo.listColors()).toHaveLength(1);
    expect(repo.getGarment(a)?.color.id).toBe(repo.getGarment(b)?.color.id);
    repo.close();
  });

  it('is NOT reused for a capture, which has no slug and never will', () => {
    const repo = open();
    const a = uuidv7();
    const b = uuidv7();
    // The decoy for the rule above: two garments in a colour nobody published are two colours,
    // because a Lens reading (F-040) carries no corpus slug to be equal on.
    repo.createGarment({ id: a, type: 'jumper', color: colour('A navy-ish thing') }, NOW);
    repo.createGarment({ id: b, type: 'scarf', color: colour('A navy-ish thing') }, NOW + 1);

    expect(repo.listColors()).toHaveLength(2);
    expect(repo.getGarment(a)?.color.id).not.toBe(repo.getGarment(b)?.color.id);
    repo.close();
  });
});
