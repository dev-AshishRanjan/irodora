/**
 * The lookbook in the database (F-238, FR-33; ADR-0136 D5, D6).
 *
 * ## What earns this file
 *
 * A saved outfit is a snapshot that has to re-render identically later, so the tests are written
 * against the ways a lookbook entry could look right today and be wrong tomorrow:
 *
 * - **a pointer where a copy was needed** — the garment's colour row is shared and overwritable,
 *   and the garment can be removed, and the entry must not move when either happens;
 * - **a half-written outfit** — an outfit row with no slots, or slots with no score;
 * - **a removal that leaves children live** — a cascade fires on a DELETE, and removal is an UPDATE;
 * - **a captured colour without its conditions** — which the database itself must refuse (rule 12);
 * - **a backup that leaves it out**, which is criterion 2's second half.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ARCHIVE_TABLES,
  digest,
  eraseEverything,
  exportArchive,
  importArchive,
} from '../src/archive.js';
import { deserialiseArchive, serialiseArchive } from '../src/backup.js';
import { nodeDriver } from '../src/drivers/node.js';
import { migrate } from '../src/migrate.js';
import { MIGRATIONS, SCHEMA_VERSION, SYNC_TABLES } from '../src/schema.js';
import {
  createRepository,
  uuidv7,
  type NewOutfit,
  type NewSavedColor,
  type Repository,
  type SecureKeyStore,
} from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-outfit-'));
let n = 0;
type TestDriver = ReturnType<typeof nodeDriver>['driver'];
const open = (): { repo: Repository; driver: TestDriver } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

/** A colour as an outfit's snapshot holds it: `saved_color`'s shape, without a row id of its own. */
const snapshot = (
  name: string,
  slug: string | null,
  hex = '#2F3B52',
): Omit<NewSavedColor, 'id'> => ({
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
  hex,
  source: 'reference',
  confidence: 1,
  corpus_slug: slug,
});

/** The same colour as a garment's row, with an id. */
const colour = (name: string, slug: string | null, hex = '#2F3B52'): NewSavedColor => ({
  id: uuidv7(),
  ...snapshot(name, slug, hex),
});

/** A captured colour, owing its four conditions (ADR-0005). */
const captured = (): Omit<NewSavedColor, 'id'> => ({
  ...snapshot('Lens reading', null, '#8A6E4B'),
  source: 'estimated',
  confidence: 0.62,
  conditions: { illuminant: 'D65', quality: 'good', sampleCount: 48, variance: 0.0031 },
});

/** Three garments, one per engine slot, written through the repository as the app writes them. */
function wardrobe(repo: Repository): { top: string; trouser: string; shoe: string } {
  const ids = { top: uuidv7(), trouser: uuidv7(), shoe: uuidv7() };
  repo.createGarment({ id: ids.top, type: 'top', color: colour('Ai-nezumi', 'ai-nezumi') }, NOW);
  repo.createGarment(
    { id: ids.trouser, type: 'trouser', color: colour('Soko-zumi', 'soko-zumi', '#23242A') },
    NOW,
  );
  repo.createGarment(
    { id: ids.shoe, type: 'shoe', color: colour('Usu-gami', 'usu-gami', '#E7E2D6') },
    NOW,
  );
  return ids;
}

const COMPONENTS = [
  'harmony',
  'personalFit',
  'contrast',
  'corpusAffinity',
  'versatility',
  'cvdAccessibility',
] as const;

/** An outfit as the Lab would save it: three slots, one locked, one captured colour, six components. */
function outfit(garments: { top: string; trouser: string; shoe: string }): NewOutfit {
  const topColour = snapshot('Ai-nezumi', 'ai-nezumi');
  const trouserColour = snapshot('Soko-zumi', 'soko-zumi', '#23242A');
  return {
    overall: 71,
    countsThreshold: 60,
    envelope: {
      engine: '0.9.0',
      scorer: '0.5.0',
      corpus: '2026.08.1',
      rules: '2026.08.4',
      occasion: 'default',
      profile: 'profile-1:1759999999000',
    },
    items: [
      {
        slot: 'top',
        garmentId: garments.top,
        garmentLabel: 'Linen shirt',
        locked: true,
        color: topColour,
      },
      {
        slot: 'trouser',
        garmentId: garments.trouser,
        garmentLabel: 'trouser',
        locked: false,
        color: trouserColour,
      },
      {
        slot: 'shoe',
        garmentId: garments.shoe,
        garmentLabel: 'Loafers',
        locked: false,
        color: captured(),
      },
    ],
    components: COMPONENTS.map((component, i) => ({
      component,
      score: 60 + i * 5.5,
      direction: i === 2 ? 'opposes' : i === 4 ? 'neutral' : 'supports',
      weight: 1 / 6,
      contribution: (60 + i * 5.5) / 6,
    })),
  };
}

const rows = (driver: TestDriver, table: string): number =>
  driver.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)[0]?.n ?? -1;

const logged = (repo: Repository, op?: string) =>
  repo
    .changeLog()
    .filter((e) => e.table_name.startsWith('outfit') && (op === undefined || e.op === op));

describe('saving an outfit', () => {
  it('writes the outfit, its slots and its six components, and logs every row', () => {
    const { repo, driver } = open();
    const { id, written } = repo.saveOutfit(outfit(wardrobe(repo)), NOW);

    expect(written).toBe(true);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect([
      rows(driver, 'outfit'),
      rows(driver, 'outfit_item'),
      rows(driver, 'outfit_component'),
    ]).toStrictEqual([1, 3, 6]);
    expect(logged(repo, 'insert')).toHaveLength(10);
    repo.close();
  });

  it('reads back every column exactly, items and components in stored order', () => {
    const { repo } = open();
    const saved = outfit(wardrobe(repo));
    const { id } = repo.saveOutfit(saved, NOW);
    const [stored] = repo.listOutfits();

    expect(stored?.id).toBe(id);
    expect(stored?.createdAt).toBe(NOW);
    expect(stored?.overall).toBe(71);
    expect(stored?.countsThreshold).toBe(60);
    expect(stored?.envelope).toStrictEqual(saved.envelope);
    expect(
      stored?.items.map((i) => [i.slot, i.position, i.garmentId, i.garmentLabel, i.locked]),
    ).toStrictEqual(
      saved.items.map((i, position) => [i.slot, position, i.garmentId, i.garmentLabel, i.locked]),
    );
    expect(
      stored?.components.map((c) => [
        c.component,
        c.position,
        c.score,
        c.direction,
        c.weight,
        c.contribution,
      ]),
    ).toStrictEqual(
      saved.components.map((c, position) => [
        c.component,
        position,
        c.score,
        c.direction,
        c.weight,
        c.contribution,
      ]),
    );
    /*
     * EVERY SNAPSHOT COLUMN, VALUE BY VALUE (F-238's review, S4). The app replays a saved score from
     * these values alone, so a column transposed in the INSERT or in the read — xyz_y into xyz_z, a
     * lab channel swapped — would score a different colour under the same entry. Compared to what
     * was written, field by field, for every slot.
     */
    for (const [i, item] of saved.items.entries()) {
      const back = stored?.items[i]?.color;
      const { conditions, ...values } = item.color;
      expect({ slot: item.slot, ...values }).toStrictEqual({
        slot: item.slot,
        name: back?.name,
        xyz_x: back?.xyz_x,
        xyz_y: back?.xyz_y,
        xyz_z: back?.xyz_z,
        lab_l: back?.lab_l,
        lab_a: back?.lab_a,
        lab_b: back?.lab_b,
        oklch_l: back?.oklch_l,
        oklch_c: back?.oklch_c,
        oklch_h: back?.oklch_h,
        hex: back?.hex,
        source: back?.source,
        confidence: back?.confidence,
        corpus_slug: back?.corpus_slug,
      });
      expect([
        back?.capture_illuminant,
        back?.capture_quality,
        back?.capture_samples,
        back?.capture_variance,
      ]).toStrictEqual([
        conditions?.illuminant ?? null,
        conditions?.quality ?? null,
        conditions?.sampleCount ?? null,
        conditions?.variance ?? null,
      ]);
    }
    // The captured colour's four conditions come back exactly, as four columns.
    const shoe = stored?.items[2]?.color;
    expect([
      shoe?.source,
      shoe?.capture_illuminant,
      shoe?.capture_quality,
      shoe?.capture_samples,
      shoe?.capture_variance,
    ]).toStrictEqual(['estimated', 'D65', 'good', 48, 0.0031]);
    // And a reference colour carries none.
    expect(stored?.items[0]?.color.capture_illuminant).toBeNull();
    expect(stored?.items[0]?.color.hex).toBe(saved.items[0]?.color.hex);
    repo.close();
  });

  it('lists the newest first', () => {
    const { repo } = open();
    const garments = wardrobe(repo);
    const second = { ...garments, shoe: uuidv7() };
    repo.createGarment({ id: second.shoe, type: 'shoe', color: colour('Kuro', 'kuro') }, NOW);
    const older = repo.saveOutfit(outfit(garments), NOW);
    const newer = repo.saveOutfit(outfit(second), NOW + 10);
    expect(repo.listOutfits().map((o) => o.id)).toStrictEqual([newer.id, older.id]);
    repo.close();
  });
});

describe('a composition is saved once', () => {
  it('saving the same slot→garment pairs again returns the same id and writes nothing', () => {
    const { repo, driver } = open();
    const garments = wardrobe(repo);
    const first = repo.saveOutfit(outfit(garments), NOW);
    const again = repo.saveOutfit(outfit(garments), NOW + 1);
    expect(again).toStrictEqual({ id: first.id, written: false });
    expect(rows(driver, 'outfit')).toBe(1);
    expect(logged(repo)).toHaveLength(10);
    repo.close();
  });

  it('the locks are how it was made, not what it is: different locks are the same composition', () => {
    const { repo } = open();
    const garments = wardrobe(repo);
    const first = repo.saveOutfit(outfit(garments), NOW);
    const unlocked = outfit(garments);
    const again = repo.saveOutfit(
      { ...unlocked, items: unlocked.items.map((i) => ({ ...i, locked: false })) },
      NOW + 1,
    );
    expect(again).toStrictEqual({ id: first.id, written: false });
    repo.close();
  });

  it('DECOY: one slot holding a different garment is a second outfit', () => {
    const { repo } = open();
    const garments = wardrobe(repo);
    const otherShoe = uuidv7();
    repo.createGarment({ id: otherShoe, type: 'shoe', color: colour('Kuro', 'kuro') }, NOW);
    repo.saveOutfit(outfit(garments), NOW);
    const second = repo.saveOutfit(outfit({ ...garments, shoe: otherShoe }), NOW + 1);
    expect(second.written).toBe(true);
    expect(repo.listOutfits()).toHaveLength(2);
    repo.close();
  });
});

describe('removing an outfit', () => {
  it('tombstones the outfit, its slots and its components, never deletes, and logs each once', () => {
    const { repo, driver } = open();
    const { id } = repo.saveOutfit(outfit(wardrobe(repo)), NOW);
    repo.removeOutfit(id, NOW + 5);

    expect(repo.listOutfits()).toHaveLength(0);
    for (const table of ['outfit', 'outfit_item', 'outfit_component']) {
      const live = driver.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${table} WHERE deleted_at IS NULL`,
      )[0]?.n;
      expect({ [table]: live }).toStrictEqual({ [table]: 0 });
    }
    // The rows are still there: a tombstone, not a delete.
    expect([
      rows(driver, 'outfit'),
      rows(driver, 'outfit_item'),
      rows(driver, 'outfit_component'),
    ]).toStrictEqual([1, 3, 6]);
    expect(logged(repo, 'delete')).toHaveLength(10);
    repo.close();
  });

  it('removes only the outfit asked for: another keeps its slots and its score', () => {
    const { repo, driver } = open();
    const garments = wardrobe(repo);
    const otherShoe = uuidv7();
    repo.createGarment({ id: otherShoe, type: 'shoe', color: colour('Kuro', 'kuro') }, NOW);
    const a = repo.saveOutfit(outfit(garments), NOW);
    const b = repo.saveOutfit(outfit({ ...garments, shoe: otherShoe }), NOW + 1);
    repo.removeOutfit(a.id, NOW + 2);

    expect(
      repo.listOutfits().map((o) => [o.id, o.items.length, o.components.length]),
    ).toStrictEqual([[b.id, 3, 6]]);
    for (const table of ['outfit_item', 'outfit_component']) {
      const live = driver.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${table} WHERE outfit_id = ? AND deleted_at IS NULL`,
        [b.id],
      )[0]?.n;
      expect({ [table]: live }).toStrictEqual({ [table]: table === 'outfit_item' ? 3 : 6 });
    }
    repo.close();
  });

  it('a second removal, or an unknown id, writes nothing', () => {
    const { repo } = open();
    const { id } = repo.saveOutfit(outfit(wardrobe(repo)), NOW);
    repo.removeOutfit(id, NOW + 5);
    repo.removeOutfit(id, NOW + 6);
    repo.removeOutfit('never-saved', NOW + 7);
    expect(logged(repo, 'delete')).toHaveLength(10);
    repo.close();
  });

  it('is never revived: saving the composition again is a new record, and the old stays removed', () => {
    const { repo, driver } = open();
    const garments = wardrobe(repo);
    const first = repo.saveOutfit(outfit(garments), NOW);
    repo.removeOutfit(first.id, NOW + 5);
    const second = repo.saveOutfit(outfit(garments), NOW + 10);

    expect(second.written).toBe(true);
    expect(second.id).not.toBe(first.id);
    expect(repo.listOutfits().map((o) => o.id)).toStrictEqual([second.id]);
    expect(
      driver.query<{ deleted_at: number | null }>('SELECT deleted_at FROM outfit WHERE id = ?', [
        first.id,
      ])[0]?.deleted_at,
    ).toBe(NOW + 5);
    repo.close();
  });
});

describe('a saved outfit does not move when what it was made from does', () => {
  it('survives its garment colour being overwritten and its garment being removed', () => {
    const { repo } = open();
    const garments = wardrobe(repo);
    repo.saveOutfit(outfit(garments), NOW);
    const before = repo.listOutfits();

    // A palette reusing the top's slug overwrites the garment's shared saved_color row in place.
    repo.savePalette(
      {
        id: uuidv7(),
        nameEn: 'Overwrite',
        nameJa: 'Overwrite',
        classification: 'editorial',
        category: 'contemporary',
        versionId: '2099.01.1',
        members: [
          {
            color: colour('Ai-nezumi (new)', 'ai-nezumi', '#123456'),
            role: 'anchor',
            rank: 1,
            weight: 1,
          },
          { color: colour('Soko', 'soko', '#222222'), role: 'neutral', rank: 2, weight: 0.8 },
          { color: colour('Usu', 'usu', '#EEEEEE'), role: 'light', rank: 3, weight: 0.6 },
        ],
      },
      NOW + 1,
    );
    repo.deleteGarment(garments.shoe, NOW + 2);

    expect(repo.listOutfits()).toStrictEqual(before);
    repo.close();
  });

  it('DECOY: the garment rows themselves did change, so the case above could fail', () => {
    const { repo } = open();
    const garments = wardrobe(repo);
    repo.savePalette(
      {
        id: uuidv7(),
        nameEn: 'Overwrite',
        nameJa: 'Overwrite',
        classification: 'editorial',
        category: 'contemporary',
        versionId: '2099.01.1',
        members: [
          {
            color: colour('Ai-nezumi (new)', 'ai-nezumi', '#123456'),
            role: 'anchor',
            rank: 1,
            weight: 1,
          },
          { color: colour('Soko', 'soko', '#222222'), role: 'neutral', rank: 2, weight: 0.8 },
          { color: colour('Usu', 'usu', '#EEEEEE'), role: 'light', rank: 3, weight: 0.6 },
        ],
      },
      NOW + 1,
    );
    repo.deleteGarment(garments.shoe, NOW + 2);
    expect(repo.getGarment(garments.top)?.color.hex).toBe('#123456');
    expect(repo.getGarment(garments.shoe)?.deletedAt).toBe(NOW + 2);
    repo.close();
  });

  it('writes nothing to saved_color, garment or palette', () => {
    const { repo, driver } = open();
    const garments = wardrobe(repo);
    const counts = () => ['saved_color', 'garment', 'palette'].map((t) => rows(driver, t));
    const before = counts();
    const { id } = repo.saveOutfit(outfit(garments), NOW);
    repo.removeOutfit(id, NOW + 1);
    expect(counts()).toStrictEqual(before);
    repo.close();
  });

  it('DECOY: creating a garment does write saved_color, so the count above can move', () => {
    const { repo, driver } = open();
    const before = rows(driver, 'saved_color');
    repo.createGarment({ id: uuidv7(), type: 'top', color: colour('Kuro', 'kuro') }, NOW);
    expect(rows(driver, 'saved_color')).toBe(before + 1);
    repo.close();
  });
});

describe('the database refuses what the writer should never send', () => {
  type Mutation = (o: NewOutfit) => NewOutfit;
  const at = <T>(xs: readonly T[], i: number, change: (x: T) => T): T[] =>
    xs.map((x, j) => (j === i ? change(x) : x));
  const cases: readonly (readonly [string, Mutation])[] = [
    ['an overall past 100', (o) => ({ ...o, overall: 101 })],
    [
      'a negative component score',
      (o) => ({ ...o, components: at(o.components, 0, (c) => ({ ...c, score: -1 })) }),
    ],
    [
      'a direction the engine has not got',
      (o) => ({
        ...o,
        components: at(o.components, 0, (c) => ({ ...c, direction: 'great' as never })),
      }),
    ],
    [
      'a provenance that does not exist',
      (o) => ({
        ...o,
        items: at(o.items, 0, (i) => ({ ...i, color: { ...i.color, source: 'made-up' } })),
      }),
    ],
    [
      'a confidence of 2',
      (o) => ({
        ...o,
        items: at(o.items, 0, (i) => ({ ...i, color: { ...i.color, confidence: 2 } })),
      }),
    ],
    ['an empty slot name', (o) => ({ ...o, items: at(o.items, 0, (i) => ({ ...i, slot: '' })) })],
    [
      'a garment that does not exist',
      (o) => ({ ...o, items: at(o.items, 0, (i) => ({ ...i, garmentId: 'no-such-garment' })) }),
    ],
    [
      'a captured colour without its conditions',
      (o) => ({
        ...o,
        items: at(o.items, 2, (i) => {
          const color = { ...i.color };
          delete color.conditions;
          return { ...i, color };
        }),
      }),
    ],
    [
      'a reference colour carrying capture conditions',
      (o) => ({
        ...o,
        items: at(o.items, 0, (i) => ({
          ...i,
          color: {
            ...i.color,
            conditions: { illuminant: 'D65', quality: 'good', sampleCount: 1, variance: 0 },
          },
        })),
      }),
    ],
    ['an empty envelope field', (o) => ({ ...o, envelope: { ...o.envelope, rules: '' } })],
  ];

  it.each(cases)('refuses %s, and the whole save rolls back', (_name, mutate) => {
    const { repo, driver } = open();
    const garments = wardrobe(repo);
    expect(() => repo.saveOutfit(mutate(outfit(garments)), NOW)).toThrow();
    expect([
      rows(driver, 'outfit'),
      rows(driver, 'outfit_item'),
      rows(driver, 'outfit_component'),
    ]).toStrictEqual([0, 0, 0]);
    expect(logged(repo)).toHaveLength(0);
    repo.close();
  });

  it('DECOY: the unmutated outfit saves, so each refusal above is its mutation', () => {
    const { repo } = open();
    expect(repo.saveOutfit(outfit(wardrobe(repo)), NOW).written).toBe(true);
    repo.close();
  });

  it('refuses an outfit with no items, or a slot or component twice, before touching the database', () => {
    const { repo, driver } = open();
    const o = outfit(wardrobe(repo));
    const first = o.items[0];
    const firstComponent = o.components[0];
    if (first === undefined || firstComponent === undefined) throw new Error('fixture');
    expect(() => repo.saveOutfit({ ...o, items: [] }, NOW)).toThrow(/no items/);
    expect(() => repo.saveOutfit({ ...o, items: [...o.items, first] }, NOW)).toThrow(
      /slot appears twice/,
    );
    expect(() =>
      repo.saveOutfit({ ...o, components: [...o.components, firstComponent] }, NOW),
    ).toThrow(/component appears twice/);
    expect(rows(driver, 'outfit')).toBe(0);
    repo.close();
  });
});

describe('migration 11', () => {
  it('brings a version-10 database up and keeps what is in it', () => {
    const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
    driver.exec('PRAGMA foreign_keys = ON');
    for (const step of MIGRATIONS.filter((m) => m.version <= 10)) {
      driver.exec(step.up);
      driver.exec(`PRAGMA user_version = ${String(step.version)}`);
    }
    driver.run(
      `INSERT INTO color_bookmark (id, created_at, updated_at, deleted_at, corpus_slug)
       VALUES ('kept', 1, 1, NULL, 'ai-nezumi')`,
    );
    // And a garment, as a version-10 build wrote one: its colour row, then the garment.
    driver.run(
      `INSERT INTO saved_color (id, created_at, updated_at, deleted_at, name, xyz_x, xyz_y, xyz_z,
         lab_l, lab_a, lab_b, oklch_l, oklch_c, oklch_h, hex, source, confidence, corpus_slug)
       VALUES ('kept-colour', 1, 1, NULL, 'Ai-nezumi', 0.04, 0.04, 0.09, 24.8, 1.9, -15.4,
         0.342, 0.046, 262.1, '#2F3B52', 'reference', 1, 'ai-nezumi')`,
    );
    driver.run(
      `INSERT INTO garment (id, created_at, updated_at, deleted_at, type, primary_color_id, wear_count)
       VALUES ('kept-garment', 1, 1, NULL, 'jumper', 'kept-colour', 0)`,
    );

    expect(migrate(driver)).toBe(MIGRATIONS.filter((m) => m.version > 10).length);
    expect(driver.query<{ user_version: number }>('PRAGMA user_version')[0]?.user_version).toBe(
      SCHEMA_VERSION,
    );
    const repo = createRepository(driver, info);
    expect(repo.listBookmarks()).toStrictEqual(['ai-nezumi']);
    expect(repo.listGarments().map((g) => g.id)).toStrictEqual(['kept-garment']);
    expect(repo.listOutfits()).toHaveLength(0);
    expect(repo.saveOutfit(outfit(wardrobe(repo)), NOW).written).toBe(true);
    repo.close();
  });
});

describe('backup and restore (criterion 2)', () => {
  const keys = (): SecureKeyStore => {
    const map = new Map<string, string>();
    return {
      get: (k) => map.get(k) ?? null,
      set: (k, v) => {
        map.set(k, v);
      },
      remove: (k) => {
        map.delete(k);
      },
    };
  };

  /** A live outfit and a removed one, so the round trip carries both. */
  const seeded = () => {
    const { repo, driver } = open();
    const garments = wardrobe(repo);
    const otherShoe = uuidv7();
    repo.createGarment({ id: otherShoe, type: 'shoe', color: colour('Kuro', 'kuro') }, NOW);
    repo.saveOutfit(outfit(garments), NOW);
    const removed = repo.saveOutfit(outfit({ ...garments, shoe: otherShoe }), NOW + 1);
    repo.removeOutfit(removed.id, NOW + 2);
    return { repo, driver };
  };

  it('all three tables are in the sync list and the archive', () => {
    for (const table of ['outfit', 'outfit_item', 'outfit_component']) {
      expect(SYNC_TABLES).toContain(table);
      expect(ARCHIVE_TABLES).toContain(table);
    }
  });

  it('restores to an identical digest through the serialised file, tombstones included', () => {
    const source = seeded();
    const before = digest(source.driver);
    const listed = source.repo.listOutfits();
    const text = serialiseArchive(exportArchive(source.driver, NOW + 10));
    source.repo.close();

    const target = open();
    importArchive(target.driver, deserialiseArchive(text));
    expect(digest(target.driver)).toBe(before);
    expect(target.repo.listOutfits()).toStrictEqual(listed);
    target.repo.close();
  });

  it('DECOY: a tampered component score changes the digest', () => {
    const source = seeded();
    const before = digest(source.driver);
    const archive = exportArchive(source.driver, NOW + 10);
    source.repo.close();
    const componentRows = archive.tables['outfit_component'] ?? [];
    expect(componentRows.length).toBeGreaterThan(0);
    const tampered = {
      ...archive,
      tables: {
        ...archive.tables,
        outfit_component: componentRows.map((row, i) => (i === 0 ? { ...row, score: 99 } : row)),
      },
    };
    const target = open();
    importArchive(target.driver, tampered);
    expect(digest(target.driver)).not.toBe(before);
    target.repo.close();
  });

  it('an archive written before the lookbook existed restores everything it holds, and no outfit', () => {
    const source = seeded();
    const archive = exportArchive(source.driver, NOW + 10);
    source.repo.close();
    const older = { ...archive.tables };
    delete older['outfit'];
    delete older['outfit_item'];
    delete older['outfit_component'];
    const target = open();
    importArchive(target.driver, { ...archive, schemaVersion: 10, tables: older });
    expect(target.repo.listGarments()).toHaveLength(4);
    expect(target.repo.listOutfits()).toHaveLength(0);
    target.repo.close();
  });

  it('a hand-edited archive whose slot names a missing garment rolls back whole', () => {
    const source = seeded();
    const archive = exportArchive(source.driver, NOW + 10);
    source.repo.close();
    const items = archive.tables['outfit_item'] ?? [];
    const broken = {
      ...archive,
      tables: {
        ...archive.tables,
        outfit_item: items.map((row, i) =>
          i === 0 ? { ...row, garment_id: 'no-such-garment' } : row,
        ),
      },
    };
    const target = open();
    expect(() => {
      importArchive(target.driver, broken);
    }).toThrow();
    expect(rows(target.driver, 'garment')).toBe(0);
    expect(rows(target.driver, 'outfit')).toBe(0);
    target.repo.close();
  });

  it('erasing everything empties all three tables', () => {
    const { repo, driver } = seeded();
    // Not empty before, or "empty after" would be true of an erase that did nothing.
    expect([
      rows(driver, 'outfit'),
      rows(driver, 'outfit_item'),
      rows(driver, 'outfit_component'),
    ]).toStrictEqual([2, 6, 12]);
    eraseEverything(driver, keys());
    expect([
      rows(driver, 'outfit'),
      rows(driver, 'outfit_item'),
      rows(driver, 'outfit_component'),
    ]).toStrictEqual([0, 0, 0]);
    repo.close();
  });
});
