/**
 * What an archive may be before it is refused unread (F-288).
 *
 * ## The control the threat model described for a year
 *
 * Boundary ③'s import-bomb row said *"hard limits on bytes and record count before parsing"*.
 * There were none — `F-286`'s review found the row describing a check nobody had written. The row
 * now names `test`, and this is where that test lives.
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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { nodeDriver } from '../src/drivers/node.js';
import {
  ArchiveError,
  createRepository,
  DEFAULT_ARCHIVE_LIMITS,
  deserialiseArchive,
  digest,
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
/**
 * A PNG with a payload the size a photograph's is.
 *
 * The byte limit's whole derivation is *"a photograph arrives at `quality: 0.8`, one to three
 * megabytes, base64 costs 4/3"* — and the first version of this file proved a
 * PHOTOGRAPH-FREE archive was clear of 256 Mi characters, which is not the claim the threat model
 * reads off it. F-288's review caught that. 300 KB each is a conservative phone photograph, and
 * twelve of them is the fixture below.
 */
const png = (payload = 0x8000): Uint8Array =>
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
    ...chunk(
      'IDAT',
      Array.from({ length: payload }, (_, i) => (i * 7) & 0xff),
    ),
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

/** Twelve garments, EVERY ONE photographed at ~300 KB — something like a real, small wardrobe. */
function realistic() {
  const { repo, driver } = open();
  const photo = ingestImage(png(300_000));
  for (let i = 0; i < 12; i += 1) {
    const id = uuidv7();
    repo.createGarment({ id, type: 'jumper', color: colour(uuidv7()) }, 1000 + i);
    repo.putGarmentImage(id, photo, 1100 + i);
  }
  return { repo, driver };
}

describe('a realistic archive is nowhere near any limit', () => {
  /*
   * THE HALF THAT MATTERS. A cap that refuses a legitimate backup is worse than no cap, and
   * "does not throw" would not notice one set an order of magnitude too low. These assert the
   * DISTANCE, so a future edit that tightens a limit toward real data fails here.
   */
  let source: ReturnType<typeof realistic>;
  let text: string;
  // BUILT IN A HOOK, not at collection time: a fixture that throws while the file is being
  // collected surfaces as "cannot collect" rather than as a failing test.
  beforeAll(() => {
    source = realistic();
    text = serialiseArchive(exportArchive(source.driver, 3000));
  });

  it('holds twelve photographs, so the distances below mean something', () => {
    // Without this the file could be photograph-free and every "far inside" would be about an
    // archive nobody has. The byte limit is derived from photographs; the fixture must have them.
    expect(text.length).toBeGreaterThan(3_000_000);
  });

  it('is far inside the character limit', () => {
    expect(text.length).toBeLessThan(DEFAULT_ARCHIVE_LIMITS.maxChars / 10);
  });

  it('is far inside the row limit', () => {
    const rows = Object.values(deserialiseArchive(text).tables).reduce((n, t) => n + t.length, 0);
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThan(DEFAULT_ARCHIVE_LIMITS.maxRows / 100);
  });

  it('is well inside the depth limit — an archive is five levels, not thirty-two', () => {
    /*
     * THROUGH THE IMPLEMENTATION, not through a copy of it. The first version pasted the scanner
     * body into the test and asserted on the copy, so `maxNestingOf` could have been deleted with
     * this still green — the same shape F-286's review had already rejected once in this package.
     *
     * Two calls instead: one at the archive's real depth, which must pass, and one below it,
     * which must not. Together they pin the number without restating the algorithm.
     */
    expect(() =>
      deserialiseArchive(text, { ...DEFAULT_ARCHIVE_LIMITS, maxDepth: 5 }),
    ).not.toThrow();
    expect(() => deserialiseArchive(text, { ...DEFAULT_ARCHIVE_LIMITS, maxDepth: 4 })).toThrow(
      /nests 5 deep/u,
    );
    // And the real limit is comfortably above it — six times, not the ten the others have.
    expect(5 * 6).toBeLessThan(DEFAULT_ARCHIVE_LIMITS.maxDepth);
  });

  it('round-trips through the new door: the same data, not merely no error', () => {
    /*
     * A DIGEST COMPARISON, which is what this module means by "identical". Asserting only that
     * `importArchive` did not throw would not notice a door that dropped every column but `id` —
     * and `serialiseArchive`/`deserialiseArchive` are halves of one thing, so a drift between
     * them is a backup written by one that the other cannot read.
     */
    const before = digest(source.driver);
    const { driver: fresh } = open();
    importArchive(fresh, deserialiseArchive(text));
    expect(digest(fresh)).toBe(before);
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

  it('refuses a Uint8Array in a column that holds no binary data', () => {
    /*
     * THE HOLE THE EARLY RETURN OPENED, found by F-288's review. `importArchive` takes
     * `unknown`, so an in-memory caller can put bytes anywhere; before the fix they sailed past
     * the declared-column check, past `sanitiseImages` (that table has no image column) and into
     * `driver.run`, where STRICT answers with a plain `Error` — the asymmetry F-286 spent a
     * feature closing. Not reachable from a file, because `JSON.parse` makes no `Uint8Array`.
     */
    const bad = {
      format: 'irodora.archive',
      schemaVersion: 1,
      exportedAt: 1,
      tables: { saved_color: [{ id: 'a', name: Uint8Array.from([1, 2, 3]) }] },
    };
    expect(() => parseArchive(bad)).toThrow(/holds binary data, and that column holds none/u);
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
  it('refuses a file past the character limit before parsing it, and names the limit', () => {
    /*
     * NOT VALID JSON EITHER, which is the point: it is refused before anything tries to parse it,
     * so the failure cannot be the parser's.
     *
     * AT A CUSTOM LIMIT, because the first version allocated 268 MB on every `pnpm test` to make
     * the same point — and its regex was `/past the .* -byte limit|byte limit/`, whose first
     * branch is dead (the message has no space before the hyphen), so it silently asserted only
     * `/byte limit/` and never checked the NUMBER. F-288's review found both.
     */
    const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxChars: 100 };
    const over = 'x'.repeat(101);
    expect(() => deserialiseArchive(over, limits)).toThrow(ArchiveError);
    expect(() => deserialiseArchive(over, limits)).toThrow(
      /archive is 101 characters, past the 100-character limit/u,
    );
  });

  it('accepts a file exactly AT each limit, so > cannot quietly become >=', () => {
    // Nothing else here would notice an off-by-one in the permissive direction.
    const rows = [{ id: 'a' }, { id: 'b' }];
    const text = JSON.stringify({
      format: 'irodora.archive',
      schemaVersion: 1,
      exportedAt: 1,
      tables: { saved_color: rows },
    });
    expect(() =>
      deserialiseArchive(text, { maxChars: text.length, maxRows: 2, maxDepth: 4 }),
    ).not.toThrow();
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
    }).toThrow(/3 rows, past the 2 limit/u);
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

  /*
   * AT maxDepth 5, WHICH IS WHAT MAKES THESE DISCRIMINATE.
   *
   * The structure is 4 deep. F-288's review measured what a scanner with the escape branch
   * DELETED would report for the escaped-quote fixture: 8. At the old limit of 8 both the good
   * and the broken scanner passed, so the only branch a hostile file could target had no test
   * that could fail. At 5, the broken one refuses and the good one does not.
   */
  const DEPTH = { ...DEFAULT_ARCHIVE_LIMITS, maxDepth: 5 };

  it('does not count brackets inside a string', () => {
    // Depth 4 in structure; the value holds 200 open brackets and must not raise it.
    expect(() => deserialiseArchive(archive({ name: '['.repeat(200) }), DEPTH)).not.toThrow();
  });

  it('is not fooled by an escaped quote', () => {
    expect(() => deserialiseArchive(archive({ name: 'a\\"[[[[' }), DEPTH)).not.toThrow();
  });

  it('is not fooled by a literal backslash before a quote', () => {
    expect(() => deserialiseArchive(archive({ name: 'a\\\\' }), DEPTH)).not.toThrow();
  });

  it('DECOY — real nesting IS counted at the same limit', () => {
    // Without this, "not fooled by a string" would also pass for a scan that counted nothing.
    expect(() => deserialiseArchive(archive({ nested: [[[[[[1]]]]]] }), DEPTH)).toThrow(/nests/u);
  });
});
