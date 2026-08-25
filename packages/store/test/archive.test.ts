/**
 * The durability story, tested at the claims it actually makes.
 *
 * With no server this is the whole of it, so the tests are written against the ways a backup
 * feature passes its tests and still loses data: an export compared to an export, an erasure
 * proven by a return value, and a restore that silently merges.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  ArchiveError,
  digest,
  eraseEverything,
  exportArchive,
  importArchive,
  type Archive,
} from '../src/archive.js';
import { createRepository, uuidv7, type SecureKeyStore } from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-archive-'));
let n = 0;
const open = () => nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const fakeKeys = (): SecureKeyStore & { readonly map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
    },
    remove: (k) => {
      map.delete(k);
    },
  };
};

/** A database with a live row, a tombstoned row, and boundary values — not one happy row. */
function seeded() {
  const { driver, info } = open();
  const repo = createRepository(driver, info);
  const live = uuidv7();
  const dead = uuidv7();
  const colour = (id: string, name: string, confidence: number) => ({
    id,
    name,
    xyz_x: 0,
    xyz_y: 1,
    xyz_z: 0.5,
    lab_l: 100,
    lab_a: -128,
    lab_b: 127,
    oklch_l: 1,
    oklch_c: 0,
    oklch_h: 359.999,
    hex: '#FFFFFF',
    source: 'estimated',
    confidence,
    corpus_slug: null,
  });
  repo.saveColor(colour(live, 'Ai-nezumi', 1), 1000);
  repo.saveColor(colour(dead, 'Sohi', 0), 1100);
  repo.deleteColor(dead, 2000);
  return { driver, info, repo, live, dead };
}

describe('the round trip preserves the data', () => {
  it('restores to an identical digest, tombstones included', () => {
    const source = seeded();
    const before = digest(source.driver);
    const archive = exportArchive(source.driver, 3000);
    source.repo.close();

    const { driver: fresh, info } = open();
    createRepository(fresh, info);
    importArchive(fresh, archive);

    // Compared against the ORIGINAL database, never against the archive it came from.
    // Comparing an export to an export is an echo: it would pass on an exporter that
    // dropped the same column twice.
    expect(digest(fresh)).toBe(before);
    fresh.close();
  });

  it('carries the tombstoned row rather than resurrecting the deletion', () => {
    const source = seeded();
    const archive = exportArchive(source.driver, 3000);
    source.repo.close();

    const { driver: fresh, info } = open();
    const repo = createRepository(fresh, info);
    importArchive(fresh, archive);

    // An export that dropped tombstones would silently un-delete on restore, and the user
    // would find things they deleted back again.
    expect(repo.getColor(source.dead)?.deleted_at).toBe(2000);
    expect(repo.listColors().map((r) => r.id)).toEqual([source.live]);
    repo.close();
  });

  it('changes the digest when ANY field changes — the decoy for the check above', () => {
    // Without this, `digest` could return a constant and every round-trip test would pass.
    const source = seeded();
    const before = digest(source.driver);
    const archive = exportArchive(source.driver, 3000);
    source.repo.close();

    const tampered: Archive = {
      ...archive,
      tables: {
        ...archive.tables,
        saved_color: (archive.tables['saved_color'] ?? []).map((r, i) =>
          i === 0 ? { ...r, name: 'Tampered' } : r,
        ),
      },
    };

    const { driver: fresh, info } = open();
    createRepository(fresh, info);
    importArchive(fresh, tampered);
    expect(digest(fresh)).not.toBe(before);
    fresh.close();
  });
});

describe('import refuses what a restore must never do', () => {
  it('refuses an archive from a NEWER schema rather than guessing', () => {
    const { driver, info } = open();
    createRepository(driver, info);
    const archive: Archive = {
      format: 'irodora.archive',
      schemaVersion: 999,
      exportedAt: 1,
      tables: {},
    };
    expect(() => {
      importArchive(driver, archive);
    }).toThrow(ArchiveError);
    expect(() => {
      importArchive(driver, archive);
    }).toThrow(/newer than this build/u);
    driver.close();
  });

  it('refuses to merge into a database that already holds rows', () => {
    // A silent merge duplicates everything the user owns, and it looks like it worked.
    const source = seeded();
    const archive = exportArchive(source.driver, 3000);
    expect(() => {
      importArchive(source.driver, archive);
    }).toThrow(/already holds rows/u);
    source.repo.close();
  });

  it('refuses something that is not an archive at all', () => {
    const { driver, info } = open();
    createRepository(driver, info);
    const notOne = { format: 'something-else', schemaVersion: 1, exportedAt: 1, tables: {} };
    expect(() => {
      importArchive(driver, notOne);
    }).toThrow(/not an Irodora/u);
    driver.close();
  });
});

describe('erasure is proven by re-query, never by a return value', () => {
  it('leaves nothing in any table, change_log included', () => {
    const source = seeded();
    const keys = fakeKeys();
    keys.set('irodora.db.key', 'a'.repeat(64));

    eraseEverything(source.driver, keys);

    // FR-58: "a re-query against each store returns nothing; the return value is not the
    // proof". eraseEverything returns void precisely so that test cannot be written.
    for (const table of ['saved_color', 'palette', 'palette_member', 'change_log']) {
      const [row] = source.driver.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
      expect(row?.n, table).toBe(0);
    }
    source.repo.close();
  });

  it('destroys the key, which is what makes bytes already on disk unreadable', () => {
    // A file delete leaves recoverable blocks and a row-by-row delete leaves them too.
    // Without the key those blocks are ciphertext nobody can read.
    const source = seeded();
    const keys = fakeKeys();
    keys.set('irodora.db.key', 'b'.repeat(64));
    eraseEverything(source.driver, keys);
    expect(keys.get('irodora.db.key')).toBeNull();
    source.repo.close();
  });

  it('is NOT satisfied by tombstoning — the decoy that separates delete from erase', () => {
    // Soft delete exists so a sync can tell "deleted" from "never existed". Erasure exists so
    // nothing remains to tell anything about. A "wipe" that only tombstoned would leave every
    // row on disk while every list came back empty.
    const source = seeded();
    source.repo.deleteColor(source.live, 4000);

    const [row] = source.driver.query<{ n: number }>('SELECT COUNT(*) AS n FROM saved_color');
    expect(row?.n).toBeGreaterThan(0);
    expect(source.repo.listColors()).toEqual([]);
    source.repo.close();
  });
});
