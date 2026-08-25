/**
 * Palettes in SQLite, and the claim FR-49 actually makes about them.
 *
 * > *Palettes validate against the same schema as corpus palettes.*
 *
 * The assertion that earns this file is the **round trip**: a palette is written, read back
 * out of a real database, re-expressed as a corpus record and handed to `parsePalette` — the
 * same function `content/palettes/*.json` goes through. If the columns cannot carry what the
 * schema requires, that fails here rather than on a device.
 *
 * `@irodora/corpus` is a **devDependency** and appears in no `src/` file. This package has no
 * runtime dependencies and keeps none; what it borrows is an oracle for a test.
 *
 * ## Why this is not in `apps/mobile`
 *
 * The app cannot open a database in CI — `expo-sqlite` needs a device. So the SQL is proven
 * here against `node:sqlite`, with real transactions and real foreign keys, and the app's own
 * tests prove the conversion. Neither half is a substitute for the other, and what remains
 * unproven off-device is SQLCipher, which is F-041's standing attestation.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parsePalette } from '@irodora/corpus';
import { nodeDriver } from '../src/drivers/node.js';
import { createRepository, uuidv7, StoreError } from '../src/index.js';
import type { NewPalette, NewSavedColor, Repository, StoredPalette } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-palette-'));
let n = 0;
const open = (): { repo: Repository; driver: ReturnType<typeof nodeDriver>['driver'] } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const colour = (slug: string, name: string): NewSavedColor => ({
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
  // A corpus entry is a reference value with a recorded origin (ADR-0005).
  source: 'reference',
  confidence: 1,
  corpus_slug: slug,
});

/** Three members, three roles, ranks 1..3 — the smallest palette that is not degenerate. */
const draft = (id: string): NewPalette => ({
  id,
  nameEn: 'Evening walk',
  nameJa: 'Evening walk',
  classification: 'editorial',
  category: 'contemporary',
  versionId: '2026.08.1',
  members: [
    { color: colour('ai-nezumi', 'Ai-nezumi'), role: 'anchor', rank: 1, weight: 1 },
    { color: colour('soko-zumi', 'Soko-zumi'), role: 'neutral', rank: 2, weight: 0.8 },
    { color: colour('usu-gami', 'Usu-gami'), role: 'light', rank: 3, weight: 0.6 },
  ],
});

/**
 * The stored palette, as a corpus record.
 *
 * Deliberately written here rather than imported from the app: what this proves is that the
 * COLUMNS carry enough, so the conversion must be visible in the test that makes the claim.
 * The app has its own converter and its own tests; if the two ever disagree, that is a real
 * disagreement about what the columns mean and it should surface as two failures, not one.
 */
const asCorpusRecord = (p: StoredPalette): unknown => ({
  slug: p.id,
  name: { en: p.nameEn, ja: p.nameJa },
  classification: p.classification,
  category: p.category,
  colors: p.members.map((m) => ({
    slug: m.slug,
    role: m.role,
    rank: m.rank,
    weight: m.weight,
  })),
  provenance: {
    source: 'Built in Palette Studio on this device',
    sourceId: 'USER-LOCAL',
    sourceType: 'editorial',
    publisher: null,
    publishedYear: null,
    rightsHolder: null,
    sourceLicence: 'Not licensed for distribution — private to this device',
    sourceUrl: null,
    derivation:
      'Assembled by hand in Palette Studio from published corpus entries; no colour ' +
      'value was measured, converted or altered.',
    authoredBy: 'user-local',
    authoredAt: '2026-08-25',
    verifiedBy: null,
    verifiedAt: null,
    reviewIndependence: null,
    editorialNotes: 'A palette built on a device by the person using the app.',
  },
  unknowns: {
    'provenance.publisher': 'built on a device, so there is no publisher',
    'provenance.publishedYear': 'built on a device, so there is no publication date',
    'provenance.rightsHolder': 'the person who built it; we hold no rights in it',
    'provenance.sourceUrl': 'never published anywhere',
  },
  status: 'draft',
  versionId: p.versionId,
});

describe('a palette round-trips through the corpus schema (FR-49)', () => {
  it('saves, reads back, and PARSES as a corpus palette', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.savePalette(draft(id), 1000);

    const stored = repo.getPalette(id);
    expect(stored).toBeDefined();

    // The assertion the criterion names. `parsePalette` throws on anything it does not like,
    // so reaching the next line at all is the proof.
    const parsed = parsePalette(asCorpusRecord(stored!), 'stored palette');
    expect(parsed.slug).toBe(id);
    expect(parsed.colors.map((c) => `${c.slug}:${c.role}:${String(c.rank)}`)).toEqual([
      'ai-nezumi:anchor:1',
      'soko-zumi:neutral:2',
      'usu-gami:light:3',
    ]);
    repo.close();
  });

  it('survives a reopen, which is the only thing that makes "saved" mean anything', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.savePalette(draft(id), 1000);

    // THE REOPEN IS THE TEST. Without it this asserts that an in-process object still holds
    // what was put into it, which is true of a Map.
    repo.reopen();

    const stored = repo.getPalette(id);
    expect(stored?.members).toHaveLength(3);
    expect(stored?.nameEn).toBe('Evening walk');
    expect(stored?.versionId).toBe('2026.08.1');
    repo.close();
  });

  /*
   * The corpus rank rule, enforced from the other end. A palette whose ranks have a gap is
   * exactly what a delete-without-renumber produces, and it is the schema — not this package
   * — that says so.
   */
  it('DECOY — a stored palette with a rank gap is REJECTED by the same parser', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.savePalette(draft(id), 1000);
    const stored = repo.getPalette(id)!;

    const record = asCorpusRecord(stored) as { colors: { rank: number }[] };
    record.colors[2]!.rank = 4;

    expect(() => parsePalette(record, 'mutated')).toThrow(/ranks are/u);
    repo.close();
  });
});

describe('editing a palette', () => {
  it('reorders members without creating or destroying rows', () => {
    const { repo } = open();
    const id = uuidv7();
    const first = draft(id);
    repo.savePalette(first, 1000);

    const before = repo.getPalette(id)!.members.map((m) => m.colorId);

    // The same three colours, in the opposite order, with the roles moving with them.
    repo.savePalette(
      {
        ...first,
        members: [
          { ...first.members[2]!, role: 'anchor', rank: 1, weight: 1 },
          { ...first.members[1]!, role: 'neutral', rank: 2, weight: 0.8 },
          { ...first.members[0]!, role: 'light', rank: 3, weight: 0.6 },
        ],
      },
      2000,
    );

    const after = repo.getPalette(id)!;
    expect(after.members.map((m) => m.slug)).toEqual(['usu-gami', 'soko-zumi', 'ai-nezumi']);
    // The SAME rows, reordered — not three new ones. A reorder that churned rows would make
    // every drag a fresh identity and a future reconciliation would see three deletes and
    // three inserts instead of a move.
    expect([...after.members.map((m) => m.colorId)].sort()).toEqual([...before].sort());
    repo.close();
  });

  it('tombstones a removed member rather than deleting it', () => {
    const { repo, driver } = open();
    const id = uuidv7();
    const first = draft(id);
    repo.savePalette(first, 1000);

    repo.savePalette({ ...first, members: first.members.slice(0, 2) }, 2000);

    expect(repo.getPalette(id)!.members).toHaveLength(2);

    // "Removed from the palette" and "never in it" are different facts. Only the tombstone
    // keeps them apart, and a future reconciliation needs the difference.
    const rows = driver.query<{ deleted_at: number | null }>(
      'SELECT deleted_at FROM palette_member WHERE palette_id = ?',
      [id],
    );
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.deleted_at !== null)).toHaveLength(1);

    const ops = repo
      .changeLog()
      .filter((r) => r.table_name === 'palette_member')
      .map((r) => r.op);
    expect(ops).toContain('delete');
    repo.close();
  });

  it('reuses a colour already saved under the same corpus slug', () => {
    const { repo } = open();
    const a = uuidv7();
    const b = uuidv7();
    repo.savePalette(draft(a), 1000);
    repo.savePalette(draft(b), 2000);

    // Two palettes over the same three entries is three colours, not six. Otherwise "which
    // palettes hold this colour" is a question with two right answers, and the row count
    // grows with edits rather than with what the person actually saved.
    expect(repo.listColors()).toHaveLength(3);
    expect(repo.getPalette(a)!.members.map((m) => m.colorId)).toEqual(
      repo.getPalette(b)!.members.map((m) => m.colorId),
    );
    repo.close();
  });

  it('tombstones a palette and its members, and leaves the colours alone', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.savePalette(draft(id), 1000);
    repo.deletePalette(id, 2000);

    expect(repo.listPalettes()).toEqual([]);
    // Still retrievable by id — "you deleted this" and "this was never here" differ.
    expect(repo.getPalette(id)?.deletedAt).toBe(2000);
    expect(repo.getPalette(id)?.members).toEqual([]);
    // The colours survive: one saved once may be in another palette.
    expect(repo.listColors()).toHaveLength(3);
    repo.close();
  });

  it('does not resurrect a member that a later save left out', () => {
    const { repo } = open();
    const id = uuidv7();
    const first = draft(id);
    repo.savePalette(first, 1000);
    repo.savePalette({ ...first, members: first.members.slice(0, 2) }, 2000);
    // Adding it back is an update of the tombstoned row, not a duplicate.
    repo.savePalette(first, 3000);

    const after = repo.getPalette(id)!;
    expect(after.members).toHaveLength(3);
    expect(new Set(after.members.map((m) => m.colorId)).size).toBe(3);
    repo.close();
  });
});

describe('a row this build cannot use is refused, not defaulted', () => {
  /*
   * The migration-2 columns are nullable, because a DEFAULT would be a value nobody chose
   * standing in for one somebody must. `NULL` means "written before this column existed", and
   * the read path has to say which column rather than surfacing a TypeError three frames on.
   *
   * The row is PLANTED through the driver, because the write path cannot produce one — which
   * is exactly why the branch would otherwise be unreachable and untested.
   */
  it('names the column when a palette row predates schema version 2', () => {
    const { repo, driver } = open();
    const id = uuidv7();
    driver.run(
      `INSERT INTO palette (id, created_at, updated_at, deleted_at, name)
       VALUES (?, ?, ?, NULL, ?)`,
      [id, 1000, 1000, 'Written by an older build'],
    );

    expect(() => repo.getPalette(id)).toThrow(StoreError);
    expect(() => repo.getPalette(id)).toThrow(/name_ja/u);
    repo.close();
  });

  it('names the member column too', () => {
    const { repo, driver } = open();
    const id = uuidv7();
    repo.savePalette(draft(id), 1000);
    driver.run('UPDATE palette_member SET weight = NULL WHERE palette_id = ?', [id]);

    expect(() => repo.getPalette(id)).toThrow(/weight/u);
    repo.close();
  });

  /*
   * THE DECOY for the two above. Without it, "throws" would be equally true of a read path
   * that threw on every palette — and both assertions would be measuring nothing.
   */
  it('DECOY — a complete row is read without complaint', () => {
    const { repo } = open();
    const id = uuidv7();
    repo.savePalette(draft(id), 1000);
    expect(() => repo.getPalette(id)).not.toThrow();
    repo.close();
  });
});
