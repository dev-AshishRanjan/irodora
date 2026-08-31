/**
 * Photographs in the encrypted database, and the key that encrypts them.
 *
 * ## What CI can and cannot say here
 *
 * `node:sqlite` has no SQLCipher, so **nothing in this file is evidence about encryption**.
 * What it proves is that the bytes round-trip through a real SQLite BLOB, that the metadata
 * can be read without loading one, and that the rotation LIFECYCLE is in the order that does
 * not lose data. The encryption itself is F-041's standing attestation, and rotation against
 * real SQLCipher joins it.
 *
 * That division is not a gap being papered over: the order of operations in
 * `rotateDatabaseKey` is the part that goes wrong, and it goes wrong identically on every
 * platform. `PRAGMA rekey` either works or throws, and which it does is a property of the
 * build of SQLite, not of our code.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver, NODE_DRIVER_INFO } from '../src/drivers/node.js';
import {
  createRepository,
  DATABASE_KEY_NAME,
  getOrCreateDatabaseKey,
  exportArchive,
  ingestImage,
  rotateDatabaseKey,
  StoreError,
  uuidv7,
} from '../src/index.js';
import type {
  Driver,
  NewSavedColor,
  RekeyableDriver,
  Repository,
  SecureKeyStore,
} from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-garment-image-'));
let n = 0;
const open = (): { repo: Repository; driver: Driver } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  return { repo: createRepository(driver, info), driver };
};

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = 1_760_000_000_000;

const colour = (): NewSavedColor => ({
  id: uuidv7(),
  name: 'Navy',
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
  corpus_slug: null,
});

const be32 = (v: number): number[] => [
  (v >>> 24) & 0xff,
  (v >>> 16) & 0xff,
  (v >>> 8) & 0xff,
  v & 0xff,
];
/** PNG chunk types are ASCII by specification, so an index loop is exact — and unlike
 * spreading a string it cannot be tripped by a surrogate pair. */
const ascii = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i));
  return out;
};

const chunk = (type: string, body: number[]): number[] => [
  ...be32(body.length),
  ...ascii(type),
  ...body,
  0,
  0,
  0,
  0,
];
const pngBytes = (width = 640, height = 480): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk('IHDR', [...be32(width), ...be32(height), 0x08, 0x02, 0x00, 0x00, 0x00]),
    ...chunk('eXIf', [0xde, 0xad, 0xbe, 0xef]),
    ...chunk('IDAT', [0x78, 0x9c, 0x63, 0x00]),
    ...chunk('IEND', []),
  ]);

const withGarment = (): { repo: Repository; driver: Driver; id: string } => {
  const { repo, driver } = open();
  const id = uuidv7();
  repo.createGarment({ id, type: 'jumper', color: colour() }, NOW);
  return { repo, driver, id };
};

describe('a photograph in the database', () => {
  it('round-trips through a real BLOB, byte for byte', () => {
    const { repo, id } = withGarment();
    const image = ingestImage(pngBytes());
    repo.putGarmentImage(id, image, NOW + 1);

    const back = repo.getGarmentImage(id);
    expect(back).toBeDefined();
    // Byte-identical to what the INGEST produced — which is not what was handed to it, and
    // that difference is the EXIF. Comparing to the original file would assert the opposite.
    expect([...(back ?? [])]).toEqual([...image.bytes]);
    repo.close();
  });

  it('arrives already stripped, because the type is the only way in', () => {
    const { repo, id } = withGarment();
    const original = pngBytes();
    repo.putGarmentImage(id, ingestImage(original), NOW + 1);

    const back = repo.getGarmentImage(id) ?? new Uint8Array(0);
    const hasExif = [...back].some(
      (_, i) =>
        back[i] === 0xde && back[i + 1] === 0xad && back[i + 2] === 0xbe && back[i + 3] === 0xef,
    );
    expect(hasExif).toBe(false);
    repo.close();
  });

  it('reports its size and dimensions WITHOUT loading the blob', () => {
    const { repo, id } = withGarment();
    const image = ingestImage(pngBytes(640, 480));
    repo.putGarmentImage(id, image, NOW + 1);

    const info = repo.getGarmentImageInfo(id);
    expect(info).toEqual({
      byteLength: image.bytes.length,
      width: 640,
      height: 480,
      format: 'png',
    });
    repo.close();
  });

  it('replaces rather than accumulating', () => {
    const { repo, id } = withGarment();
    repo.putGarmentImage(id, ingestImage(pngBytes(640, 480)), NOW + 1);
    repo.putGarmentImage(id, ingestImage(pngBytes(800, 600)), NOW + 2);

    // One image per garment, enforced by the UNIQUE constraint. Two rows here would mean
    // "the photograph" is a question with two answers and a list screen picking whichever.
    expect(repo.getGarmentImageInfo(id)?.width).toBe(800);
    repo.close();
  });

  it('is nothing for a garment that has none', () => {
    const { repo, id } = withGarment();
    expect(repo.getGarmentImage(id)).toBeUndefined();
    expect(repo.getGarmentImageInfo(id)).toBeUndefined();
    repo.close();
  });

  it('goes when the garment goes', () => {
    const { repo, id } = withGarment();
    repo.putGarmentImage(id, ingestImage(pngBytes()), NOW + 1);
    repo.deleteGarment(id, NOW + 2);

    expect(repo.getGarmentImage(id)).toBeUndefined();
    expect(
      repo.changeLog().some((e) => e.table_name === 'garment_image' && e.op === 'delete'),
    ).toBe(true);
    repo.close();
  });

  it('refuses a garment that does not exist', () => {
    const { repo } = open();
    expect(() => {
      repo.putGarmentImage('not-a-garment', ingestImage(pngBytes()), NOW);
    }).toThrow(StoreError);
    repo.close();
  });
});

/* ------------------------------------------------------------------------ key rotation */

const fakeStore = (): SecureKeyStore & { readonly held: Map<string, string> } => {
  const held = new Map<string, string>();
  return {
    held,
    get: (name) => held.get(name) ?? null,
    set: (name, value) => {
      held.set(name, value);
    },
    remove: (name) => {
      held.delete(name);
    },
  };
};

/** A driver that records the rekey, or refuses it. Three lines, and it is the whole subject. */
const fakeDriver = (opts: {
  supportsRekey: boolean;
  throwOnRekey?: boolean;
}): RekeyableDriver & { readonly seen: string[] } => {
  const seen: string[] = [];
  return {
    seen,
    info: { supportsRekey: opts.supportsRekey, name: 'fake' },
    rekey(next: string) {
      if (opts.throwOnRekey === true) throw new Error('SQLCipher refused the rekey');
      seen.push(next);
    },
  };
};

describe('rotating the database key', () => {
  it('produces a new key, and stores it', () => {
    const store = fakeStore();
    const first = getOrCreateDatabaseKey(store);
    const driver = fakeDriver({ supportsRekey: true });

    const next = rotateDatabaseKey(store, driver);

    expect(next).not.toBe(first);
    expect(next).toMatch(/^[0-9a-f]{64}$/u);
    expect(store.get(DATABASE_KEY_NAME)).toBe(next);
    // The DATABASE was rekeyed to the same value the keystore now holds. A rotation that
    // stored a key it never applied is the failure this asserts against.
    expect(driver.seen).toEqual([next]);
  });

  it('leaves the OLD key in place when the database refuses', () => {
    // THE ORDERING TEST, and the reason the function exists in this shape. Storing first and
    // rekeying second works every time until the rekey fails, and then the keystore holds a
    // key that opens nothing while the data sits intact and unreachable on disk. The symptom
    // is "the app lost my photographs", reported months later, unreproducible.
    const store = fakeStore();
    const first = getOrCreateDatabaseKey(store);
    const driver = fakeDriver({ supportsRekey: true, throwOnRekey: true });

    expect(() => rotateDatabaseKey(store, driver)).toThrow(/refused the rekey/);
    expect(store.get(DATABASE_KEY_NAME)).toBe(first);
  });

  it('refuses a driver that cannot rekey, rather than reporting success', () => {
    const store = fakeStore();
    const first = getOrCreateDatabaseKey(store);

    expect(() => rotateDatabaseKey(store, fakeDriver({ supportsRekey: false }))).toThrow(
      /cannot rekey/,
    );
    expect(store.get(DATABASE_KEY_NAME)).toBe(first);
  });

  it('is what node:sqlite reports about itself, and it throws to match', () => {
    // Carried as DATA, like `encryptsAtRest`, so a green CI run cannot be read as a statement
    // about a rotation that never ran.
    expect(NODE_DRIVER_INFO.supportsRekey).toBe(false);
    expect(NODE_DRIVER_INFO.encryptsAtRest).toBe(false);

    const { driver } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
    // And it THROWS rather than no-opping. A silent success would make a rotation test green
    // against a database whose key never moved, which is worse than having no test at all.
    expect(() => {
      driver.rekey('0'.repeat(64));
    }).toThrow(/cannot rekey/);
    driver.close();
  });
});

/* -------------------------------------------------------------- the archive (E-023) */

describe('a photograph and the backup', () => {
  it('travels in the archive, asserted deliberately rather than discovered', () => {
    /*
     * E-023 predicted this mechanism before there was an image to carry: `archive.ts` reads
     * `SELECT *` over `SYNC_TABLES`, so ANY new table joins the backup format and its
     * canonical digest with nobody editing `archive.ts`. Adding `garment_image` therefore
     * changed what an export costs, by the size of the wardrobe's photographs.
     *
     * It is asserted here because the alternative is finding out from a user whose export got
     * large, or — worse — from one whose restored wardrobe came back without its pictures. A
     * backup that silently omitted them would lose them.
     */
    const { repo, driver, id } = withGarment();
    const image = ingestImage(pngBytes(320, 240));
    repo.putGarmentImage(id, image, NOW + 1);

    const archive = exportArchive(driver, NOW + 2);
    const rows = archive.tables['garment_image'] ?? [];
    expect(rows).toHaveLength(1);
    repo.close();
  });
});

describe('the brand on SanitisedImage', () => {
  it('is what stops raw bytes reaching the database', () => {
    const { repo, id } = withGarment();
    const raw = pngBytes();

    // The POSITIVE case first, so the negative below differs in exactly one thing.
    repo.putGarmentImage(id, ingestImage(raw), NOW + 1);

    /*
     * The negative cases are DECLARED AND NEVER CALLED, and that is not a shortcut.
     *
     * `@ts-expect-error` suppresses the compile error; it does not stop the statement running.
     * Written inline, these two lines type-checked as intended and then executed — passing a
     * raw buffer straight into the SQL bind, which failed the suite for a reason that had
     * nothing to do with what they assert. The assertion here is entirely about what the
     * COMPILER accepts, so the calls belong somewhere the compiler reads and the runtime does
     * not.
     *
     * The directives still do their job: an unused `@ts-expect-error` is itself a build
     * failure, so if the brand ever stopped rejecting these, `tsc` would say so.
     */
    const neverRun = (): void => {
      // @ts-expect-error — a raw buffer. THIS is the enforcement: "the EXIF was stripped" is
      // not a convention a caller has to remember, because forgetting to ingest does not
      // compile.
      repo.putGarmentImage(id, raw, NOW + 2);

      // @ts-expect-error — and a hand-made object with the right SHAPE is not a SanitisedImage
      // either. Without the unique symbol this would type-check, and the brand would be
      // decoration rather than a guard.
      repo.putGarmentImage(id, { bytes: raw, width: 1, height: 1, format: 'png' }, NOW + 3);
    };
    expect(typeof neverRun).toBe('function');

    repo.close();
  });
});
