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
import { ARCHIVE_TABLES, IMAGE_COLUMNS } from '../src/archive.js';
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

const be16 = (v: number): number[] => [(v >> 8) & 0xff, v & 0xff];
const segment = (marker: number, body: number[]): number[] => [
  0xff,
  marker,
  ...be16(body.length + 2),
  ...body,
];
/** SOF0: precision, height, width, component count, then one component triple. */
const sof0 = (width: number, height: number): number[] =>
  segment(0xc0, [0x08, ...be16(height), ...be16(width), 0x01, 0x01, 0x11, 0x00]);
/** Entropy-coded data after SOS. Never scanned for markers, so it may contain marker bytes. */
const SCAN = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34, 0x56];
/**
 * A JPEG carrying EXIF, because the JPEG walk is the fragile one.
 *
 * Segment lengths, the copy-to-end at SOS, and telling a frame header from a Huffman table —
 * the PNG path has none of that, and F-286's review was right that asserting idempotence over
 * PNG alone says nothing about the format where it could plausibly fail.
 */
const jpeg = (width = 1200, height = 800): Uint8Array =>
  Uint8Array.from([
    0xff,
    0xd8,
    ...segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef]),
    ...sof0(width, height),
    ...SCAN,
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
function withPhotograph(bytes: Uint8Array = png()) {
  const { repo, driver } = open();
  const id = uuidv7();
  repo.createGarment({ id, type: 'jumper', color: colour(uuidv7()) }, 1000);
  repo.putGarmentImage(id, ingestImage(bytes), 1100);
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

  it('does the same for a JPEG, which is the fragile walk', () => {
    // Every other fixture here is a PNG. The JPEG path reads segment lengths, copies to the end
    // at SOS and has to tell a frame header from a Huffman table; a round trip that never
    // carried one would be a claim about the easy format.
    const source = withPhotograph(jpeg());
    const before = digest(source.driver);
    const file = throughAFile(source.driver);
    source.repo.close();

    const { repo: restored, driver: fresh } = open();
    importArchive(fresh, file);
    expect(digest(fresh)).toBe(before);
    expect(restored.getGarmentImageInfo(source.id)?.format).toBe('jpeg');
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
    // BY MESSAGE, not only by class: the ingest refusal below is also an `ArchiveError`, so a
    // codec that returned empty bytes instead of throwing would still satisfy the class alone.
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(/is not base64/u);
  });

  it('refuses a $bytes tag on a column that holds no binary data', () => {
    /*
     * The tag is universal and the ingest is not, so before F-286's review a tagged value in a
     * TEXT column decoded to a blob, skipped the sanitiser and died at `driver.run` as a plain
     * `Error` — which is the failure this feature exists to remove.
     */
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    const row = file.tables['saved_color']?.[0];
    if (row === undefined) throw new Error('fixture has no colour row');
    row['name'] = { $bytes: 'aGk=' };

    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(/holds no binary data/u);
  });

  it('refuses a plain string where bytes belong, which is what a hand edit looks like', () => {
    const source = withPhotograph();
    const file = throughAFile(source.driver) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    source.repo.close();
    const row = file.tables['garment_image']?.[0];
    if (row === undefined) throw new Error('fixture has no image row');
    row['bytes'] = 'a photograph, honestly';

    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, file);
    }).toThrow(/must hold binary data/u);
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

  it('refuses an image past the byte cap', () => {
    // The plan named four hostile cases and three landed; this is the fourth. A PNG whose
    // declared dimensions are fine and whose SIZE is not is a different bound from the pixels.
    const big = new Uint8Array(13 * 1024 * 1024);
    big.set(png(), 0);
    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, hostile(big));
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
    // THE WHOLE OBJECT, so dropping any one of the four from the overwrite is caught. Note that
    // `byte_length: 1` satisfies the schema's own `CHECK (byte_length > 0)`, so the database is
    // not the thing that would have noticed.
    expect(restored.getGarmentImageInfo(String(row['garment_id']))).toStrictEqual({
      byteLength: expect.any(Number) as number,
      width: 640,
      height: 480,
      format: 'png',
    });
    expect(restored.getGarmentImageInfo(String(row['garment_id']))?.byteLength).toBeGreaterThan(1);
  });

  it.each([
    ['png', png()],
    ['jpeg', jpeg()],
  ])('is idempotent for a %s, which is what lets the round trip stay identical', (_name, bytes) => {
    /*
     * If sanitising sanitised bytes changed them, every restore would differ from its source and
     * the digest comparison above would be asserting the wrong thing.
     *
     * BOTH FORMATS, because F-286's review pointed out this was asserted over PNG alone while
     * the JPEG walk is the one with segment lengths to get wrong. It is also a standing
     * requirement on `ingestImage`: F-287 proposes a DOWNSCALE inside it, and a downscale that
     * is not idempotent would silently break every restore — E-141 names that.
     */
    const once = ingestImage(bytes);
    const twice = ingestImage(once.bytes);
    expect(Array.from(twice.bytes)).toStrictEqual(Array.from(once.bytes));
  });
});

describe('the declared image map stays complete', () => {
  /**
   * Every BLOB column the schema declares, table by table — from `CREATE TABLE` **and from
   * `ALTER TABLE … ADD COLUMN`**, which this repository already uses five times.
   *
   * F-286's review found the first version of this comparing the schema against a RESTATED
   * LITERAL and never reading `IMAGE_COLUMNS` at all — a guard that agreed with itself, which is
   * the class of defect it was written to catch. It also found the regex blind to `ALTER TABLE`,
   * so a BLOB added that way would have been invisible to it.
   */
  const blobColumns = (): Map<string, string[]> => {
    const sql = MIGRATIONS.map((m) => m.up).join('\n');
    const out = new Map<string, string[]>();
    const add = (table: string, column: string): void => {
      out.set(table, [...(out.get(table) ?? []), column]);
    };

    for (const match of sql.matchAll(/CREATE TABLE (\w+) \(([\s\S]*?)\) STRICT;/gu)) {
      const [, table, body] = match;
      if (table === undefined || body === undefined) continue;
      for (const line of body.split('\n')) {
        const column = /^\s*(\w+)\s+BLOB\b/u.exec(line);
        if (column?.[1] !== undefined) add(table, column[1]);
      }
    }
    for (const match of sql.matchAll(/ALTER TABLE (\w+)\s+ADD COLUMN\s+(\w+)\s+BLOB\b/giu)) {
      const [, table, column] = match;
      if (table !== undefined && column !== undefined) add(table, column);
    }
    return out;
  };

  it('finds BLOB columns at all, so an empty result is not agreement', () => {
    expect([...blobColumns().keys()].sort()).toStrictEqual(['garment_image', 'profile_avatar']);
  });

  it('names every archived table that has one — the MAP, against the schema', () => {
    const archived = [...blobColumns().keys()].filter((t) =>
      (ARCHIVE_TABLES as readonly string[]).includes(t),
    );
    // `profile_avatar` has a BLOB and is NOT archived (ADR-0105), which is why this filters
    // rather than carrying an exemption list.
    expect(Object.keys(IMAGE_COLUMNS).sort()).toStrictEqual(archived.sort());
  });

  it('declares the right COLUMN, not just the right table', () => {
    const columns = blobColumns();
    for (const [table, column] of Object.entries(IMAGE_COLUMNS))
      expect(`${table}.${column}`).toBe(`${table}.${(columns.get(table) ?? [])[0] ?? '(none)'}`);
  });

  it('refuses a second BLOB column on an archived table, which a row cannot express', () => {
    // The metadata — width, height, format, byte_length — is written onto the ROW, so two image
    // columns would make those four ambiguous. A second one is a design question, and this is
    // where it gets asked rather than going unsanitised.
    const columns = blobColumns();
    for (const table of Object.keys(IMAGE_COLUMNS))
      expect(`${table}: ${String((columns.get(table) ?? []).length)}`).toBe(`${table}: 1`);
  });
});
