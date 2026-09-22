/**
 * The archive, with a photograph in it (F-286).
 *
 * ## Why this is a second file rather than four more cases in `archive.test.ts`
 *
 * That file's fixture writes colours, and its round trip hands `importArchive` the in-memory
 * `Archive` object — where a `Uint8Array` is still a `Uint8Array`. **Both choices are why it was
 * green while every archive holding an image was unrestorable**: nothing in it ever crossed the
 * serialised string, which is the only place the defect lives.
 *
 * So the rule this file is built on: **an export is a STRING**. Every test here goes
 * `exportArchive` → `serialiseArchive` → `JSON.parse` → `importArchive`, because that is what a
 * person's backup actually is. A test that skips the string is testing a function, not a backup.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  ArchiveError,
  createRepository,
  digest,
  exportArchive,
  importArchive,
  ingestImage,
  serialiseArchive,
  uuidv7,
  type Driver,
  type NewSavedColor,
  type Repository,
} from '../src/index.js';
import { ARCHIVE_TABLES } from '../src/archive.js';
import { MIGRATIONS } from '../src/schema.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-archive-images-'));
let n = 0;
const opened: Repository[] = [];
const open = (): { repo: Repository; driver: Driver } => {
  const { driver, info } = nodeDriver(join(dir, `db-${String(n++)}.sqlite`));
  const repo = createRepository(driver, info);
  opened.push(repo);
  return { repo, driver };
};

afterAll(() => {
  for (const repo of opened)
    try {
      repo.close();
    } catch {
      // Already closed by a test that had to: several of these close the SOURCE database before
      // importing into a fresh one, because a restore is a thing you do after losing a phone.
      // Windows will not delete a file SQLite still holds, so the sweep still has to run.
    }
  rmSync(dir, { recursive: true, force: true });
});

const be32 = (v: number): number[] => [
  (v >>> 24) & 0xff,
  (v >>> 16) & 0xff,
  (v >>> 8) & 0xff,
  v & 0xff,
];
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
/** Carries an `eXIf` chunk, so "sanitised on the way in" is an assertion that can fail. */
const png = (width = 640, height = 480): Uint8Array =>
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

const colour = (id: string): NewSavedColor => ({
  id,
  name: 'Ai-nezumi',
  xyz_x: 0.2,
  xyz_y: 0.2,
  xyz_z: 0.2,
  lab_l: 51.8,
  lab_a: 0,
  lab_b: 0,
  oklch_l: 0.6,
  oklch_c: 0,
  oklch_h: 0,
  hex: '#808080',
  source: 'reference',
  confidence: 1,
  corpus_slug: null,
});

/** A database with a garment and a photograph — the case that could not be restored. */
function withPhotograph() {
  const { repo, driver } = open();
  const id = uuidv7();
  repo.createGarment({ id, type: 'jumper', color: colour(uuidv7()) }, 1000);
  repo.putGarmentImage(id, ingestImage(png()), 1100);
  return { repo, driver, id };
}

/** What a person's backup actually is: a file, read back. */
const throughAFile = (driver: Driver, now = 3000): unknown =>
  JSON.parse(serialiseArchive(exportArchive(driver, now)));

describe('a backup with a photograph in it', () => {
  it('restores to an identical digest, ACROSS THE SERIALISED STRING', () => {
    /*
     * THE TEST THAT WAS MISSING. Before F-286 this threw `TypeError: Provided value cannot be
     * bound to SQLite parameter` — a `Uint8Array` serialises as `{"0":137,"1":80,…}` and comes
     * back as a plain object — and the existing suite could not see it, because it imported the
     * in-memory object where the bytes are still bytes.
     */
    const source = withPhotograph();
    const before = digest(source.driver);
    const file = throughAFile(source.driver);
    source.repo.close();

    const { driver: fresh } = open();
    importArchive(fresh, file);

    expect(digest(fresh)).toBe(before);
  });

  it('brings the bytes back, not a description of them', () => {
    const source = withPhotograph();
    const original = source.repo.getGarmentImage(source.id);
    const file = throughAFile(source.driver);
    source.repo.close();

    const { repo: restored, driver: fresh } = open();
    importArchive(fresh, file);

    expect(Array.from(restored.getGarmentImage(source.id) ?? [])).toStrictEqual(
      Array.from(original ?? []),
    );
    expect(restored.getGarmentImageInfo(source.id)).toStrictEqual({
      byteLength: (original ?? []).length,
      width: 640,
      height: 480,
      format: 'png',
    });
  });

  it('writes the bytes as base64 rather than as an object of numeric keys', () => {
    // The size argument, made checkable: at indent 2 the old form cost 20-25 bytes per image
    // byte. This asserts the SHAPE, which is what makes the size follow.
    const source = withPhotograph();
    const text = serialiseArchive(exportArchive(source.driver, 3000));
    expect(text).toContain('"$bytes"');
    expect(text).not.toMatch(/"bytes":\s*\{\s*"0":/u);
  });

  it('DECOY — an archive with no images still round-trips, so the change is about images', () => {
    const { repo, driver } = open();
    repo.saveColor(colour(uuidv7()), 1000);
    const before = digest(driver);
    const file = throughAFile(driver);
    repo.close();

    const { driver: fresh } = open();
    importArchive(fresh, file);
    expect(digest(fresh)).toBe(before);
  });
});

describe('an archive that cannot be restored says so', () => {
  /** The shape a build before F-286 wrote: a byte array through `JSON.stringify`. */
  const asIndexObject = (bytes: Uint8Array): Record<string, number> =>
    Object.fromEntries([...bytes].map((b, i) => [String(i), b]));

  it('refuses the old byte-index form by name, not with a TypeError', () => {
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    // Rewrite the tagged value back into what the old exporter produced.
    const row = file.tables['garment_image']?.[0];
    if (row === undefined) throw new Error('fixture has no image row');
    row['bytes'] = asIndexObject(png());

    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(ArchiveError);
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(/build that could not encode it/u);
  });

  it('refuses a $bytes value that is not base64', () => {
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    const row = file.tables['garment_image']?.[0];
    if (row === undefined) throw new Error('fixture has no image row');
    row['bytes'] = { $bytes: 'not base64 at all !!!' };

    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(ArchiveError);
  });

  it('refuses any other object, because no column holds one', () => {
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    const row = file.tables['garment_image']?.[0];
    if (row === undefined) throw new Error('fixture has no image row');
    row['bytes'] = { looks: 'structured' };

    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(/holds an object, which no column can/u);
  });
});

describe('an imported image goes through the same door a chosen one does', () => {
  const hostile = (payload: Uint8Array) => {
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    const row = file.tables['garment_image']?.[0];
    if (row === undefined) throw new Error('fixture has no image row');
    row['bytes'] = { $bytes: Buffer.from(payload).toString('base64') };
    return file;
  };

  it('refuses bytes that are not an image at all', () => {
    /*
     * THE SECOND HALF OF THIS FEATURE, and the reason it could not be split. `putGarmentImage`
     * takes a `SanitisedImage`, so "every stored photograph passed `ingestImage`" is a type fact
     * at that call site — and `importArchive` was not one. Fixing the encoding alone would have
     * put arbitrary bytes in front of the platform decoder in the same commit.
     */
    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, hostile(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8])));
    }).toThrow(ArchiveError);
  });

  it('refuses an image past the pixel cap, which is the decoder-bomb shape', () => {
    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, hostile(png(40000, 40000)));
    }).toThrow(ArchiveError);
  });

  it('takes the metadata from the bytes, so a row cannot lie about what it holds', () => {
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    const row = file.tables['garment_image']?.[0];
    if (row === undefined) throw new Error('fixture has no image row');
    // A hand-edited file claiming a 1 x 1 image over 640 x 480 of PNG.
    row['width'] = 1;
    row['height'] = 1;
    row['byte_length'] = 1;

    const { repo: restored, driver: fresh } = open();
    importArchive(fresh, file);
    expect(restored.getGarmentImageInfo(String(row['garment_id']))?.width).toBe(640);
  });

  it('is idempotent, which is what lets the round trip stay identical', () => {
    // If sanitising sanitised bytes changed them, every restore would differ from its source
    // and the digest comparison above would be asserting the wrong thing.
    const once = ingestImage(png());
    const twice = ingestImage(once.bytes);
    expect(Array.from(twice.bytes)).toStrictEqual(Array.from(once.bytes));
  });
});

describe('the declared image map stays complete', () => {
  it('names every archived table that has a BLOB column', () => {
    /*
     * READ FROM THE SCHEMA, not restated. A table that grows a BLOB column and forgets
     * `IMAGE_COLUMNS` would store its bytes unchecked — so this is the assertion that catches
     * the NEXT feature rather than this one.
     */
    const sql = MIGRATIONS.map((m) => m.up).join('\n');
    const withBlobs = new Set<string>();
    for (const match of sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\) STRICT;/gu)) {
      const [, table, body] = match;
      if (table !== undefined && body !== undefined && /\bBLOB\b/u.test(body)) withBlobs.add(table);
    }
    expect(withBlobs.size).toBeGreaterThan(0);

    const archived = [...withBlobs].filter((t) =>
      (ARCHIVE_TABLES as readonly string[]).includes(t),
    );
    // Every archived table with bytes must be covered. `profile_avatar` has a BLOB and is NOT
    // archived (ADR-0105), which is why the filter is here rather than an exemption list.
    expect(archived.sort()).toStrictEqual(['garment_image']);
  });
});
