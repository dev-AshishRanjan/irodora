/**
 * A bookmarked colour in the database (F-237, FR-56; ADR-0135 D6).
 *
 * ## What earns this file
 *
 * A bookmark is a pointer to a corpus slug, in its own table. The tests are written against the
 * ways that table could look right and be wrong:
 *
 * - **a second row for one slug**, which every read that asks "is it bookmarked" survives;
 * - **a removal that deletes**, which a future sync could not tell from a row that never existed;
 * - **a re-bookmark that never comes back**, which is what `saved_color`'s upsert would have done;
 * - **a write into `saved_color`**, which Home would show as the person's last reading (F-337);
 * - **a backup that leaves it out**, which is the second half of criterion 2.
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
  type BookmarkRow,
  type NewPalette,
  type NewSavedColor,
  type Repository,
  type SecureKeyStore,
} from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-bookmark-'));
let n = 0;
const open = (): { repo: Repository; driver: ReturnType<typeof nodeDriver>['driver'] } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

const rows = (driver: ReturnType<typeof nodeDriver>['driver']): BookmarkRow[] =>
  driver.query<BookmarkRow>(
    'SELECT id, created_at, updated_at, deleted_at, corpus_slug FROM color_bookmark ORDER BY corpus_slug',
  );

const logged = (repo: Repository) =>
  repo.changeLog().filter((entry) => entry.table_name === 'color_bookmark');

const colour = (slug: string): NewSavedColor => ({
  id: uuidv7(),
  name: slug,
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

const palette = (id: string, slug: string): NewPalette => ({
  id,
  nameEn: 'Evening walk',
  nameJa: 'Evening walk',
  classification: 'editorial',
  category: 'contemporary',
  versionId: '2026.08.1',
  members: [
    { color: colour(slug), role: 'anchor', rank: 1, weight: 1 },
    { color: colour('soko-zumi'), role: 'neutral', rank: 2, weight: 0.8 },
    { color: colour('usu-gami'), role: 'light', rank: 3, weight: 0.6 },
  ],
});

describe('a bookmark is one row per slug', () => {
  it('bookmarks a corpus colour, lists it, and logs one insert', () => {
    const { repo, driver } = open();
    repo.bookmarkColor('ai-nezumi', NOW);

    expect(repo.listBookmarks()).toEqual(['ai-nezumi']);
    const [row] = rows(driver);
    expect(row?.created_at).toBe(NOW);
    expect(row?.deleted_at).toBeNull();
    // A UUIDv7 (data-model §2): version 7 in the third group.
    expect(row?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(logged(repo).map((e) => [e.row_id, e.op])).toEqual([[row?.id, 'insert']]);
    repo.close();
  });

  it('is idempotent: bookmarking twice writes one row and one log entry', () => {
    const { repo, driver } = open();
    repo.bookmarkColor('ai-nezumi', NOW);
    repo.bookmarkColor('ai-nezumi', NOW + 1);

    expect(rows(driver)).toHaveLength(1);
    // The first write's timestamp: the second wrote nothing.
    expect(rows(driver)[0]?.updated_at).toBe(NOW);
    expect(logged(repo)).toHaveLength(1);
    repo.close();
  });

  it('keeps different slugs apart, in slug order (the decoy for the case above)', () => {
    // A store that collapsed every bookmark into one row would pass the idempotence test.
    const { repo, driver } = open();
    repo.bookmarkColor('usu-gami', NOW);
    repo.bookmarkColor('ai-nezumi', NOW + 1);

    expect(rows(driver)).toHaveLength(2);
    expect(repo.listBookmarks()).toEqual(['ai-nezumi', 'usu-gami']);
    repo.close();
  });
});

describe('removing a bookmark', () => {
  it('tombstones, never deletes, and logs one delete', () => {
    const { repo, driver } = open();
    repo.bookmarkColor('ai-nezumi', NOW);
    repo.unbookmarkColor('ai-nezumi', NOW + 5);

    expect(repo.listBookmarks()).toHaveLength(0);
    const [row] = rows(driver);
    expect(row?.deleted_at).toBe(NOW + 5);
    expect(row?.updated_at).toBe(NOW + 5);
    expect(logged(repo).map((e) => e.op)).toEqual(['insert', 'delete']);
    repo.close();
  });

  it('writes nothing when there is nothing to remove', () => {
    const { repo, driver } = open();
    repo.unbookmarkColor('never-bookmarked', NOW);
    repo.bookmarkColor('ai-nezumi', NOW);
    repo.unbookmarkColor('ai-nezumi', NOW + 1);
    repo.unbookmarkColor('ai-nezumi', NOW + 2);

    // The second removal leaves the first one's timestamp, and logs nothing.
    expect(rows(driver)[0]?.deleted_at).toBe(NOW + 1);
    expect(logged(repo).map((e) => e.op)).toEqual(['insert', 'delete']);
    repo.close();
  });

  it('bookmarking again revives the same row: same id, live, logged as an update', () => {
    const { repo, driver } = open();
    repo.bookmarkColor('ai-nezumi', NOW);
    const id = rows(driver)[0]?.id;
    repo.unbookmarkColor('ai-nezumi', NOW + 1);
    repo.bookmarkColor('ai-nezumi', NOW + 2);

    expect(repo.listBookmarks()).toEqual(['ai-nezumi']);
    expect(rows(driver)).toEqual([
      { id, created_at: NOW, updated_at: NOW + 2, deleted_at: null, corpus_slug: 'ai-nezumi' },
    ]);
    expect(logged(repo).map((e) => [e.row_id, e.op])).toEqual([
      [id, 'insert'],
      [id, 'delete'],
      [id, 'update'],
    ]);
    repo.close();
  });
});

describe('a bookmark is not a saved colour', () => {
  const counts = (driver: ReturnType<typeof nodeDriver>['driver']) =>
    Object.fromEntries(
      ['saved_color', 'palette', 'palette_member', 'garment'].map((t) => [
        t,
        driver.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)[0]?.n,
      ]),
    );

  it('writes nothing to saved_color, palette or garment', () => {
    const { repo, driver } = open();
    const before = counts(driver);
    repo.bookmarkColor('ai-nezumi', NOW);
    repo.unbookmarkColor('ai-nezumi', NOW + 1);
    repo.bookmarkColor('ai-nezumi', NOW + 2);

    expect(counts(driver)).toEqual(before);
    expect(repo.listColors()).toHaveLength(0);
    repo.close();
  });

  it('the decoy: saving a colour DOES change saved_color, so the count above can move', () => {
    const { repo, driver } = open();
    const before = counts(driver);
    repo.saveColor(colour('ai-nezumi'), NOW);
    expect(counts(driver)).not.toEqual(before);
    repo.close();
  });

  it('leaves a palette that uses the same colour untouched, both ways', () => {
    // `reusableColorId` shares one saved_color row by slug; a bookmark stored there and removed
    // through deleteColor would have tombstoned the palette's colour.
    const { repo } = open();
    const id = uuidv7();
    repo.savePalette(palette(id, 'ai-nezumi'), NOW);
    const before = repo.getPalette(id);

    repo.bookmarkColor('ai-nezumi', NOW + 1);
    repo.unbookmarkColor('ai-nezumi', NOW + 2);

    expect(repo.getPalette(id)).toEqual(before);
    expect(repo.listColors().filter((c) => c.deleted_at !== null)).toHaveLength(0);
    repo.close();
  });
});

describe('the database, not only the writer', () => {
  it('refuses an empty slug and a second row for one slug', () => {
    const { repo, driver } = open();
    const insert = (id: string, slug: string) => {
      driver.run(
        `INSERT INTO color_bookmark (id, created_at, updated_at, deleted_at, corpus_slug)
         VALUES (?, ?, ?, NULL, ?)`,
        [id, NOW, NOW, slug],
      );
    };
    expect(() => {
      insert(uuidv7(), '');
    }).toThrow(/CHECK constraint/);
    insert(uuidv7(), 'ai-nezumi');
    expect(() => {
      insert(uuidv7(), 'ai-nezumi');
    }).toThrow(/UNIQUE constraint/);
    repo.close();
  });
});

describe('migration 10', () => {
  it('brings a version-9 database up and keeps what is in it', () => {
    const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
    driver.exec('PRAGMA foreign_keys = ON');
    for (const step of MIGRATIONS.filter((m) => m.version <= 9)) {
      driver.exec(step.up);
      driver.exec(`PRAGMA user_version = ${String(step.version)}`);
    }
    driver.run(
      `INSERT INTO pairing_preference
         (id, created_at, updated_at, deleted_at, family_a, family_b, accepted, rejected)
       VALUES ('kept', 1, 1, NULL, 'ai', 'beni', 1, 0)`,
    );

    expect(migrate(driver)).toBe(MIGRATIONS.filter((m) => m.version > 9).length);
    expect(driver.query<{ user_version: number }>('PRAGMA user_version')[0]?.user_version).toBe(
      SCHEMA_VERSION,
    );
    expect(driver.query<{ id: string }>('SELECT id FROM pairing_preference')).toEqual([
      { id: 'kept' },
    ]);
    const repo = createRepository(driver, info);
    expect(repo.listBookmarks()).toHaveLength(0);
    repo.bookmarkColor('ai-nezumi', NOW);
    expect(repo.listBookmarks()).toEqual(['ai-nezumi']);
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

  /** Live and removed bookmarks, so the round trip carries both. */
  const seeded = () => {
    const { repo, driver } = open();
    repo.bookmarkColor('ai-nezumi', NOW);
    repo.bookmarkColor('usu-gami', NOW + 1);
    repo.unbookmarkColor('usu-gami', NOW + 2);
    return { repo, driver };
  };

  it('is in the sync list and the archive', () => {
    expect(SYNC_TABLES).toContain('color_bookmark');
    expect(ARCHIVE_TABLES).toContain('color_bookmark');
  });

  it('restores to an identical digest through the serialised file, tombstones included', () => {
    const source = seeded();
    const before = digest(source.driver);
    const text = serialiseArchive(exportArchive(source.driver, NOW + 10));
    source.repo.close();

    const target = open();
    importArchive(target.driver, deserialiseArchive(text));
    expect(digest(target.driver)).toBe(before);
    expect(target.repo.listBookmarks()).toEqual(['ai-nezumi']);
    expect(rows(target.driver).find((r) => r.corpus_slug === 'usu-gami')?.deleted_at).toBe(NOW + 2);
    target.repo.close();
  });

  it('the decoy: a tampered slug changes the digest', () => {
    const source = seeded();
    const before = digest(source.driver);
    const archive = exportArchive(source.driver, NOW + 10);
    source.repo.close();
    const bookmarks = archive.tables['color_bookmark'] ?? [];
    expect(bookmarks).toHaveLength(2);
    const tampered = {
      ...archive,
      tables: {
        ...archive.tables,
        color_bookmark: bookmarks.map((row, i) =>
          i === 0 ? { ...row, corpus_slug: 'beni' } : row,
        ),
      },
    };

    const target = open();
    importArchive(target.driver, tampered);
    expect(digest(target.driver)).not.toBe(before);
    target.repo.close();
  });

  it('an archive written before bookmarks existed restores everything it holds, and no bookmark', () => {
    /*
     * The bookmark half alone cannot fail: a restore refuses a database that is not empty, so the
     * target never held a bookmark to begin with. What can fail is the rest of the archive — a
     * missing table refused, or read as corruption, would lose the person's other data — so the
     * archive carries a row from another table, and that row is what is asserted to come back.
     */
    const source = seeded();
    source.repo.recordPreference('ai', 'beni', 'accepted', NOW + 5);
    const archive = exportArchive(source.driver, NOW + 10);
    source.repo.close();
    // As a schema-9 build wrote it: no color_bookmark table at all.
    const older = { ...archive.tables };
    delete older['color_bookmark'];
    const target = open();
    importArchive(target.driver, { ...archive, schemaVersion: 9, tables: older });
    expect(target.repo.listPreferences()).toHaveLength(1);
    expect(target.repo.listBookmarks()).toHaveLength(0);
    target.repo.close();
  });

  it('erasing everything leaves no bookmark, live or removed', () => {
    const { repo, driver } = seeded();
    eraseEverything(driver, keys());
    expect(rows(driver)).toHaveLength(0);
    expect(logged(repo)).toHaveLength(0);
    repo.close();
  });
});
