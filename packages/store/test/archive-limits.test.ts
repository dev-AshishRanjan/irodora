/**
 * What an archive may be before it is refused unread (F-288).
 *
 * ## The control the threat model described for a year
 *
 * Boundary ③'s import-bomb row said *"hard limits on bytes and record count before parsing"*.
 * There were none — `F-286`'s review found the row describing a check nobody had written. This
 * file is the test that row now names.
 *
 * ## Both halves are asserted, and the second is the one that matters
 *
 * A limit is easy to write and easy to get wrong in the direction nobody notices: **firing on a
 * real file.** So every bound here is tested twice — refusing a hostile file BY NAME, and leaving
 * a realistic archive alone with the actual distance to the limit asserted rather than a bare
 * "does not throw".
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  ArchiveError,
  createRepository,
  DEFAULT_ARCHIVE_LIMITS,
  deserialiseArchive,
  exportArchive,
  importArchive,
  ingestImage,
  parseArchive,
  serialiseArchive,
  uuidv7,
  type Driver,
  type NewSavedColor,
  type Repository,
} from '../src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'irodora-archive-limits-'));
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
      /* a test closed it to import into a fresh database, which is what a restore is */
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
const png = (): Uint8Array =>
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk('IHDR', [...be32(640), ...be32(480), 0x08, 0x02, 0x00, 0x00, 0x00]),
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

/** Twelve garments, one with a photograph — something like a real, small wardrobe. */
function realistic() {
  const { repo, driver } = open();
  for (let i = 0; i < 12; i += 1) {
    const id = uuidv7();
    repo.createGarment({ id, type: 'jumper', color: colour(uuidv7()) }, 1000 + i);
    if (i === 0) repo.putGarmentImage(id, ingestImage(png()), 1100);
  }
  return { repo, driver };
}

describe('a realistic archive is nowhere near any limit', () => {
  /*
   * THE HALF THAT MATTERS. A cap that refuses a legitimate backup is worse than no cap, and
   * "does not throw" would not notice one set an order of magnitude too low. These assert the
   * DISTANCE, so a future edit that tightens a limit toward real data fails here.
   */
  const { driver } = realistic();
  const text = serialiseArchive(exportArchive(driver, 3000));

  it('is far inside the byte limit', () => {
    expect(text.length).toBeLessThan(DEFAULT_ARCHIVE_LIMITS.maxBytes / 100);
  });

  it('is far inside the row limit', () => {
    const rows = Object.values(deserialiseArchive(text).tables).reduce((n, t) => n + t.length, 0);
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThan(DEFAULT_ARCHIVE_LIMITS.maxRows / 100);
  });

  it('is far inside the depth limit — an archive is six levels, not thirty-two', () => {
    // Counted the way the implementation counts, on the real thing rather than on a fixture.
    let depth = 0;
    let deepest = 0;
    let inString = false;
    let escaped = false;
    for (const ch of text) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (inString) {
        if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{' || ch === '[') deepest = Math.max(deepest, (depth += 1));
      else if (ch === '}' || ch === ']') depth -= 1;
    }
    expect(deepest).toBeLessThanOrEqual(6);
    expect(deepest * 4).toBeLessThan(DEFAULT_ARCHIVE_LIMITS.maxDepth);
  });

  it('round-trips through the new door, image and all', () => {
    // `deserialiseArchive` is `serialiseArchive`'s missing half; if they drift, a backup written
    // by one cannot be read by the other and nothing else would say so.
    const archive = deserialiseArchive(text);
    const { driver: fresh } = open();
    expect(() => {
      importArchive(fresh, archive);
    }).not.toThrow();
  });
});

describe('parsing twice is parsing once', () => {
  /*
   * THE ORDINARY RESTORE PATH PARSES TWICE. `deserialiseArchive` parses the file, and
   * `importArchive` takes `unknown` and parses again — so `parseArchive` has to be idempotent,
   * and it was not: a decoded `Uint8Array` IS an object whose keys are decimal indices and whose
   * values are bytes, which is exactly the pre-F-286 broken shape, so the second pass refused a
   * perfectly good file with a message about a build that could not encode it.
   *
   * F-288's own tests found it the first time the two doors were composed, which is the argument
   * for composing them in a test rather than only in a caller nobody has written yet.
   */
  it('accepts an already-decoded archive, image and all', () => {
    const { repo, driver } = open();
    const id = uuidv7();
    repo.createGarment({ id, type: 'jumper', color: colour(uuidv7()) }, 1000);
    repo.putGarmentImage(id, ingestImage(png()), 1100);
    const once = deserialiseArchive(serialiseArchive(exportArchive(driver, 3000)));

    // The bytes survive the second pass as bytes, rather than being refused as a legacy shape.
    const row = once.tables['garment_image']?.[0];
    expect(row?.['bytes']).toBeInstanceOf(Uint8Array);
    expect(() => parseArchive(once)).not.toThrow();
    expect((parseArchive(once).tables['garment_image']?.[0]?.['bytes'] as Uint8Array).length).toBe(
      (row?.['bytes'] as Uint8Array).length,
    );
  });

  it('DECOY — the legacy byte-index shape is still refused', () => {
    // Without this, "a Uint8Array passes through" could be a parser that stopped checking.
    const bad = {
      format: 'irodora.archive',
      schemaVersion: 1,
      exportedAt: 1,
      tables: { garment_image: [{ id: 'a', bytes: { 0: 137, 1: 80 } }] },
    };
    expect(() => parseArchive(bad)).toThrow(/build that could not encode it/u);
  });
});

describe('each bound refuses, and says which', () => {
  it('refuses a file past the byte limit before parsing it', () => {
    // Not valid JSON either — which is the point: it is refused before anything tries to parse
    // it, so the failure cannot be the parser's.
    const huge = 'x'.repeat(DEFAULT_ARCHIVE_LIMITS.maxBytes + 1);
    expect(() => deserialiseArchive(huge)).toThrow(ArchiveError);
    expect(() => deserialiseArchive(huge)).toThrow(/past the .* -byte limit|byte limit/u);
  });

  it('refuses nesting past the depth limit, which JSON.parse answers with a stack overflow', () => {
    const deep = '['.repeat(500) + ']'.repeat(500);
    expect(() => deserialiseArchive(deep)).toThrow(/nests 500 deep/u);
  });

  it('refuses an archive past the row limit', () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ id: `row-${String(i)}` }));
    const archive = {
      format: 'irodora.archive',
      schemaVersion: 1,
      exportedAt: 1,
      tables: { saved_color: rows },
    };
    expect(() =>
      deserialiseArchive(JSON.stringify(archive), { ...DEFAULT_ARCHIVE_LIMITS, maxRows: 10 }),
    ).toThrow(/11 rows, past the 10 limit/u);
  });

  it('refuses too many rows even when handed a parsed object', () => {
    /*
     * `importArchive` takes `unknown` and can be called without ever touching a file, so the
     * string bound cannot help it. A control that holds on one of two doors is one somebody
     * routes around without meaning to.
     */
    const { driver } = open();
    const rows = Array.from({ length: 3 }, () => ({ id: uuidv7() }));
    expect(() => {
      importArchive(
        driver,
        {
          format: 'irodora.archive',
          schemaVersion: 1,
          exportedAt: 1,
          tables: { saved_color: rows },
        },
        { ...DEFAULT_ARCHIVE_LIMITS, maxRows: 2 },
      );
    }).toThrow(ArchiveError);
  });

  it('turns malformed JSON into an ArchiveError rather than a SyntaxError', () => {
    // The whole point of this module's error type: one kind of failure from one function.
    expect(() => deserialiseArchive('{ not json')).toThrow(ArchiveError);
    expect(() => deserialiseArchive('{ not json')).toThrow(/not JSON/u);
  });
});

describe('the depth scan counts brackets, not characters', () => {
  /*
   * A SECOND PARSER IS A SHAPE THIS REPOSITORY DISTRUSTS, so the one loop it does have is
   * planted both ways: a bracket inside a string is not nesting, and an escaped quote does not
   * end the string it is in.
   */
  const archive = (extra: Record<string, unknown>) =>
    JSON.stringify({
      format: 'irodora.archive',
      schemaVersion: 1,
      exportedAt: 1,
      tables: { saved_color: [{ id: 'a', ...extra }] },
    });

  it('does not count brackets inside a string', () => {
    // Depth 4 in structure; the value holds 200 open brackets and must not raise it.
    expect(() =>
      deserialiseArchive(archive({ name: '['.repeat(200) }), {
        ...DEFAULT_ARCHIVE_LIMITS,
        maxDepth: 8,
      }),
    ).not.toThrow(/nests/u);
  });

  it('is not fooled by an escaped quote', () => {
    expect(() =>
      deserialiseArchive(archive({ name: 'a\\"[[[[' }), {
        ...DEFAULT_ARCHIVE_LIMITS,
        maxDepth: 8,
      }),
    ).not.toThrow(/nests/u);
  });

  it('DECOY — real nesting IS counted at the same limit', () => {
    // Without this, "not fooled by a string" would also pass for a scan that counted nothing.
    expect(() =>
      deserialiseArchive(archive({ nested: [[[[[[1]]]]]] }), {
        ...DEFAULT_ARCHIVE_LIMITS,
        maxDepth: 8,
      }),
    ).toThrow(/nests/u);
  });
});
