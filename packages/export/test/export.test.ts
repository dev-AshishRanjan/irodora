/**
 * The export formats (FR-51, FR-65, F-056).
 *
 * ## What earns this file
 *
 * Every writer here produces something that *looks* right when it is wrong. A CSV with an
 * unquoted comma opens; a PDF with a broken cross-reference table opens; an ASE with a name
 * length off by one opens with the last letter of every swatch missing. **"It opened" is not
 * evidence**, which is why the assertions are about structure and bytes.
 *
 * ## The contract cases iterate `WRITERS`
 *
 * Criterion 2 is *"**every** export embeds the engine and corpus versions"*. A test that named
 * six cases would stop covering the seventh format somebody adds, and the failure would be a
 * missing version in a file on a stranger's disk. So the loop is over the exported list, and
 * adding a writer without an envelope fails before it ships.
 *
 * ## Fixture discipline
 *
 * Two colours rather than one, a title with a space and punctuation, a name containing a comma
 * and a quote, and a delta table. Each is a value that collapses a wrong implementation into a
 * right-looking one if it is absent
 * [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
 */

import { describe, expect, it } from 'vitest';
import {
  ASE_BLOCK,
  ExportError,
  fromDesignTokens,
  fromJson,
  fromUtf8,
  parseAse,
  slugify,
  toAse,
  toCsv,
  toCss,
  toDesignTokens,
  toJson,
  toPdf,
  utf8,
  WRITERS,
  type ExportSubject,
} from '../src/index.js';
import { FontError, glyphFor, parseTrueType, pdfWidth } from '../src/truetype.js';
import { buildFixtureFont, FIXTURE, GLYPH } from './truetype-fixture.js';

const ENVELOPE = { engine: '0.1.0', corpus: '2026.08.1', rules: '0.3.0' } as const;

/**
 * A subject built to break wrong implementations.
 *
 * - **two** colours, so an implementation that writes only the first is visible;
 * - a name with a comma AND a quote, which is the CSV case that silently shifts columns;
 * - an id needing a CSS ident fix, so `cssIdent` is exercised rather than assumed;
 * - a delta table, so FR-65's second half is written by something.
 */
const SUBJECT: ExportSubject = {
  title: 'Evening walk (spring)',
  envelope: ENVELOPE,
  colours: [
    {
      id: 'ai-iro',
      name: 'Indigo, deep',
      hex: '#264348',
      lab: [26.5, -8.1, -5.2],
      lch: [26.5, 9.63, 212.7],
      oklch: [0.36, 0.031, 210.4],
      source: 'reference',
    },
    {
      id: '2nd-colour',
      name: 'Ochre "warm"',
      hex: '#C08A3E',
      lab: [61.2, 12.4, 45.9],
      lch: [61.2, 47.55, 74.9],
      oklch: [0.67, 0.101, 71.2],
      source: 'declared',
    },
  ],
  deltas: [{ fromId: 'ai-iro', toId: '2nd-colour', deltaE00: 41.238 }],
};

const text = (bytes: Uint8Array): string => Buffer.from(bytes).toString('utf8');

/**
 * Whether a file carries a string, **in whichever encoding that format uses**.
 *
 * The first draft of the contract case decoded every writer's bytes as UTF-8 and reported ASE
 * as missing its versions. It was not: an ASE name is **UTF-16BE**, so "0.1.0" is there with a
 * NUL between every character. The test's model of the format was wrong, not the writer — and a
 * contract case that only understands one encoding would have pushed somebody to "fix" a
 * correct writer.
 *
 * The two encodings are the two the six formats use. A seventh format in a third encoding must
 * add itself here, which is the same reason the loop iterates `WRITERS`.
 */
function carries(bytes: Uint8Array, needle: string): boolean {
  const haystack = Buffer.from(bytes);
  return (
    haystack.includes(Buffer.from(needle, 'utf8')) ||
    haystack.includes(Buffer.from(needle, 'utf16le').swap16())
  );
}

describe('the contract every writer keeps', () => {
  it('has a writer for each of the six formats FR-51 names', () => {
    expect(WRITERS.map((w) => w.format).sort()).toEqual(
      ['ase', 'css', 'csv', 'json', 'pdf', 'tokens'].sort(),
    );
  });

  it('embeds the engine and corpus versions in every one', () => {
    for (const { format, write } of WRITERS) {
      const { bytes } = write(SUBJECT);
      for (const [label, version] of [
        ['engine', ENVELOPE.engine],
        ['corpus', ENVELOPE.corpus],
      ] as const)
        expect(`${format} carries the ${label} version: ${String(carries(bytes, version))}`).toBe(
          `${format} carries the ${label} version: true`,
        );
    }
  });

  it('writes the same bytes for the same subject', () => {
    for (const { format, write } of WRITERS) {
      const once = write(SUBJECT).bytes;
      const twice = write(SUBJECT).bytes;
      expect(
        `${format} is deterministic: ${String(Buffer.from(once).equals(Buffer.from(twice)))}`,
      ).toBe(`${format} is deterministic: true`);
    }
  });

  /*
   * THE DECOY FOR "DETERMINISTIC" ON ITS OWN. A writer that ignored the envelope entirely is
   * perfectly deterministic and passes the case above — this is what makes that case mean
   * something.
   */
  it('writes DIFFERENT bytes when only the envelope differs', () => {
    const other: ExportSubject = { ...SUBJECT, envelope: { ...ENVELOPE, engine: '9.9.9' } };
    for (const { format, write } of WRITERS) {
      const a = Buffer.from(write(SUBJECT).bytes);
      const b = Buffer.from(write(other).bytes);
      expect(`${format} reflects the envelope: ${String(!a.equals(b))}`).toBe(
        `${format} reflects the envelope: true`,
      );
    }
  });

  it('refuses a subject with no colours, and one with a duplicate id', () => {
    for (const { write } of WRITERS) {
      expect(() => write({ ...SUBJECT, colours: [] })).toThrow(ExportError);
      expect(() =>
        write({ ...SUBJECT, colours: [SUBJECT.colours[0]!, SUBJECT.colours[0]!], deltas: [] }),
      ).toThrow(ExportError);
    }
  });

  it('refuses a delta naming a colour the subject does not have', () => {
    expect(() =>
      toJson({ ...SUBJECT, deltas: [{ fromId: 'ai-iro', toId: 'nobody', deltaE00: 1 }] }),
    ).toThrow(ExportError);
  });

  it('names every file from the title, never from a caller', () => {
    for (const { format, write } of WRITERS) {
      const { filename } = write(SUBJECT);
      expect(`${format}: ${String(filename.startsWith('evening-walk-spring'))}`).toBe(
        `${format}: true`,
      );
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('..');
    }
  });
});

describe('the filename slug', () => {
  it('falls back rather than producing a file with no name', () => {
    // An ordinary case for this product: a palette titled entirely in Japanese.
    expect(slugify('藍色の組み合わせ')).toBe('irodora');
  });

  it('collapses runs and trims, so a title cannot make a hidden file', () => {
    expect(slugify('  ...Spring   walk!!  ')).toBe('spring-walk');
    // WRITTEN AS THE LITERAL IT IS ABOUT, again (F-127). This was assembled from parts for a
    // while because `verify-cache-scope.mjs` read the traversal as a path this file OPENS —
    // and the workaround deleted the one line that showed what the test is for. That scan now
    // parses, and a literal handed to a function that is not about paths is a mention.
    expect(slugify('../../etc/passwd')).toBe('etc-passwd');
  });
});

describe('CSV', () => {
  const body = text(toCsv(SUBJECT).bytes);

  /*
   * THE CASE THAT SILENTLY SHIFTS EVERY COLUMN AFTER IT. A writer that never quotes works
   * perfectly until the first colour called "Indigo, deep".
   */
  it('quotes a field containing a comma, and doubles an embedded quote', () => {
    expect(body).toContain('"Indigo, deep"');
    expect(body).toContain('"Ochre ""warm"""');
  });

  it('DECOY — a field needing no quoting is not quoted', () => {
    expect(body).toContain(',#264348,');
    expect(body).not.toContain('"#264348"');
  });

  it('carries the versions on a comment line a reader can skip', () => {
    expect(body.split('\r\n')[0]).toBe('# irodora engine=0.1.0 corpus=2026.08.1 rules=0.3.0');
  });

  it('writes the delta table with the space it was computed in', () => {
    expect(body).toContain('delta_e00_cielab_d65');
    expect(body).toContain('41.238000');
  });

  it('ends with a terminator, so appending to it works', () => {
    expect(body.endsWith('\r\n')).toBe(true);
  });
});

describe('JSON and design tokens', () => {
  it('parses, and carries the versions outside the colours', () => {
    const parsed = JSON.parse(text(toJson(SUBJECT).bytes)) as Record<string, unknown>;
    expect(parsed['$irodora']).toEqual({ engine: '0.1.0', corpus: '2026.08.1', rules: '0.3.0' });
    expect((parsed['colours'] as unknown[]).length).toBe(2);
  });

  it('keeps the token tree free of the version block', () => {
    const parsed = JSON.parse(text(toDesignTokens(SUBJECT).bytes)) as Record<
      string,
      Record<string, unknown>
    >;
    const group = parsed['Evening walk (spring)'] ?? {};
    expect(Object.keys(group).sort()).toEqual(['2nd-colour', 'ai-iro']);
    expect(group['ai-iro']).toMatchObject({ $value: '#264348', $type: 'color' });
    // A consumer walking tokens must not find a version where it expects a $value.
    expect(Object.keys(group)).not.toContain('$irodora');
  });

  it('carries the provenance of each colour out with it', () => {
    const parsed = JSON.parse(text(toJson(SUBJECT).bytes)) as {
      colours: { id: string; source: string }[];
    };
    expect(parsed.colours.map((c) => c.source)).toEqual(['reference', 'declared']);
  });
});

describe('CSS custom properties', () => {
  const body = text(toCss(SUBJECT).bytes);

  it('emits a usable ident for an id that starts with a digit', () => {
    // `--irodora-2nd-colour` is a valid ident, but the id alone would not be one in every
    // context — the writer prefixes rather than emitting something a stylesheet cannot use.
    expect(body).toMatch(/--irodora-c2-2nd-colour: #C08A3E;/u);
  });

  it('emits hex, not lab(), and keeps the Lab in the comment', () => {
    expect(body).toContain('--irodora-ai-iro: #264348;');
    expect(body).toContain('CIELAB (D65) 26.500000 -8.100000 -5.200000');
    expect(body).not.toContain('lab(');
  });

  it('carries the versions as properties as well as prose', () => {
    expect(body).toContain("--irodora-version-engine: '0.1.0';");
    expect(body).toContain(' * corpus: 2026.08.1');
  });
});

describe('ASE', () => {
  const file = toAse(SUBJECT);

  it('starts with the signature and version the format defines', () => {
    expect([...file.bytes.slice(0, 4)]).toEqual([0x41, 0x53, 0x45, 0x46]);
    expect([...file.bytes.slice(4, 8)]).toEqual([0x00, 0x01, 0x00, 0x00]);
  });

  it('declares the number of blocks it actually contains', () => {
    const view = new DataView(file.bytes.buffer, file.bytes.byteOffset, file.bytes.byteLength);
    // Two colours, plus the group open and the group close.
    expect(view.getUint32(8, false)).toBe(SUBJECT.colours.length + 2);
  });

  it('round-trips: write, read, write is byte-identical', () => {
    const read = parseAse(file.bytes);
    expect(read.colours.map((c) => c.name)).toEqual(['Indigo, deep', 'Ochre "warm"']);
    expect(read.groupName).toContain('engine 0.1.0');
    expect(Buffer.from(toAse(SUBJECT).bytes).equals(Buffer.from(file.bytes))).toBe(true);
  });

  it('writes components a reader gets back at eight-bit precision', () => {
    const read = parseAse(file.bytes);
    const [r, g, b] = read.colours[0]!.components;
    expect(r).toBeCloseTo(0x26 / 255, 6);
    expect(g).toBeCloseTo(0x43 / 255, 6);
    expect(b).toBeCloseTo(0x48 / 255, 6);
    expect(read.colours[0]!.space).toBe('RGB ');
  });

  /*
   * THE FIXTURE THAT CHECKS THE WRITER AGAINST THE FORMAT RATHER THAN AGAINST ITS OWN READER.
   * A writer and reader that agree on the same mistake round-trip perfectly.
   */
  it('matches hand-built bytes for a one-colour file', () => {
    const one: ExportSubject = {
      title: 'A',
      envelope: ENVELOPE,
      colours: [
        {
          id: 'x',
          name: 'B',
          hex: '#FF0000',
          lab: [0, 0, 0],
          lch: [0, 0, 0],
          oklch: [0, 0, 0],
          source: 'declared',
        },
      ],
    };
    const bytes = toAse(one).bytes;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(view.getUint32(8, false)).toBe(3);
    // Block 1 at offset 12: group open.
    expect(view.getUint16(12, false)).toBe(ASE_BLOCK.groupOpen);
    const groupLength = view.getUint32(14, false);

    // Block 2: the colour, immediately after.
    const colourAt = 18 + groupLength;
    expect(view.getUint16(colourAt, false)).toBe(ASE_BLOCK.colour);
    // Its name is "B": a length of 2 characters (the letter and the terminator).
    expect(view.getUint16(colourAt + 6, false)).toBe(2);
    expect(view.getUint16(colourAt + 8, false)).toBe('B'.charCodeAt(0));
    expect(view.getUint16(colourAt + 10, false)).toBe(0);
    // Then "RGB " and three floats: red is exactly 1.
    expect(String.fromCharCode(...[...bytes.slice(colourAt + 12, colourAt + 16)])).toBe('RGB ');
    expect(view.getFloat32(colourAt + 16, false)).toBe(1);
    expect(view.getFloat32(colourAt + 20, false)).toBe(0);

    // Block 3: group close, with an empty body, and nothing after it.
    const closeAt = colourAt + 6 + view.getUint32(colourAt + 2, false);
    expect(view.getUint16(closeAt, false)).toBe(ASE_BLOCK.groupClose);
    expect(view.getUint32(closeAt + 2, false)).toBe(0);
    expect(closeAt + 6).toBe(bytes.length);
  });

  it('refuses a truncated file rather than returning a shorter list', () => {
    expect(() => parseAse(file.bytes.slice(0, file.bytes.length - 4))).toThrow(ExportError);
    expect(() => parseAse(new Uint8Array([1, 2, 3]))).toThrow(ExportError);
  });
});

describe('the PDF report', () => {
  const file = toPdf(SUBJECT);
  const body = Buffer.from(file.bytes).toString('latin1');

  it('is a PDF, and ends where a reader looks for the end', () => {
    expect(body.startsWith('%PDF-1.4\n')).toBe(true);
    expect(body.endsWith('%%EOF\n')).toBe(true);
  });

  /*
   * THE ASSERTION A VIEWER WOULD NOT MAKE FOR US. A wrong xref offset usually still opens,
   * because viewers rebuild the table when it does not parse — so a PDF that "works" can have
   * a table pointing at nothing.
   */
  it('has cross-reference offsets that point at the objects they claim', () => {
    const startxref = Number(/startxref\n(\d+)/u.exec(body)?.[1]);
    expect(Number.isInteger(startxref)).toBe(true);
    expect(body.slice(startxref, startxref + 4)).toBe('xref');

    const rows = [...body.matchAll(/^(\d{10}) 00000 n $/gmu)].map((m) => Number(m[1]));
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((at, i) => {
      expect(
        `object ${String(i + 1)} at ${String(at)}: ${body.slice(at, at + 20).trim()}`,
      ).toContain(`${String(i + 1)} 0 obj`);
    });
  });

  it('declares a stream length equal to the bytes it wrote', () => {
    const match = /\/Length (\d+) >>\nstream\n/u.exec(body);
    const declared = Number(match?.[1]);
    const from = (match?.index ?? 0) + (match?.[0].length ?? 0);
    expect(body.slice(from + declared, from + declared + 10)).toBe('\nendstream');
  });

  it('draws the versions and the colours', () => {
    expect(body).toContain('engine 0.1.0');
    expect(body).toContain('#264348');
    // Our own label is rewritten rather than refused: the alphabet is ours to choose.
    expect(body).toContain('dE00');
  });

  /*
   * THE REFUSAL, AND ITS DECOY. A title in Japanese is an ordinary thing for this product, and
   * a PDF that silently dropped the characters would be a report somebody trusts.
   */
  it('refuses text it cannot draw, naming the character', () => {
    expect(() => toPdf({ ...SUBJECT, title: '藍色' })).toThrow(/U\+85CD/u);
    expect(() => toPdf({ ...SUBJECT, title: '藍色' })).toThrow(ExportError);
  });

  it('DECOY — the same title in Latin succeeds', () => {
    expect(() => toPdf({ ...SUBJECT, title: 'ai-iro' })).not.toThrow();
  });

  it('refuses a colour name it cannot draw, and says which colour', () => {
    const colours = [{ ...SUBJECT.colours[0]!, name: 'sabi-dō' }, SUBJECT.colours[1]!];
    expect(() => toPdf({ ...SUBJECT, colours })).toThrow(/ai-iro/u);
  });

  it('pages a long subject rather than clipping it', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      ...SUBJECT.colours[0]!,
      id: `c${String(i)}`,
      name: `colour ${String(i)}`,
    }));
    const long = Buffer.from(toPdf({ ...SUBJECT, colours: many, deltas: [] }).bytes).toString(
      'latin1',
    );
    const count = Number(/\/Type \/Pages \/Count (\d+)/u.exec(long)?.[1]);
    expect(count).toBeGreaterThan(1);
    expect(long).toContain('colour 199');
  });
});

/**
 * Reading an export back (FR-28, F-129).
 *
 * ## The round trip is the assertion, not a fixture comparison
 *
 * A parser checked against hand-written fixtures agrees with the fixtures. These cases take the
 * WRITER'S OWN output, parse it, write it again, and require the bytes to be identical — so the
 * two ends cannot drift apart without a case going red, and neither can be "fixed" alone.
 */
describe('a JSON export can be read back', () => {
  it('round-trips to identical bytes', () => {
    const written = toJson(SUBJECT);
    const again = toJson(fromJson(written.bytes));

    expect(Buffer.from(again.bytes).equals(Buffer.from(written.bytes))).toBe(true);
  });

  it('recovers every field, not only the ones the bytes happen to agree on', () => {
    // The byte comparison above would pass for a parser that produced a DIFFERENT subject the
    // writer happened to serialise the same way. This names the values.
    const back = fromJson(toJson(SUBJECT).bytes);

    expect(back.title).toBe(SUBJECT.title);
    expect(back.envelope).toEqual(SUBJECT.envelope);
    expect(back.colours).toEqual(SUBJECT.colours);
    expect(back.deltas).toEqual(SUBJECT.deltas);
  });

  it('keeps a subject with no deltas free of them, rather than adding an empty list', () => {
    const noDeltas: ExportSubject = {
      title: SUBJECT.title,
      envelope: ENVELOPE,
      colours: SUBJECT.colours,
    };
    const back = fromJson(toJson(noDeltas).bytes);

    expect(back.deltas).toBeUndefined();
  });

  it('carries an optional profile version when there is one, and not when there is not', () => {
    const withProfile: ExportSubject = {
      ...SUBJECT,
      envelope: { ...ENVELOPE, profile: '2026.08.1' },
    };

    expect(fromJson(toJson(withProfile).bytes).envelope.profile).toBe('2026.08.1');
    expect(fromJson(toJson(SUBJECT).bytes).envelope).not.toHaveProperty('profile');
  });
});

describe('a design-token export can be read back', () => {
  it('round-trips to identical bytes', () => {
    const written = toDesignTokens(SUBJECT);
    const again = toDesignTokens(fromDesignTokens(written.bytes));

    expect(Buffer.from(again.bytes).equals(Buffer.from(written.bytes))).toBe(true);
  });

  it('recovers the coordinates that appear NOWHERE except $extensions', () => {
    // `lch` and `oklch` are in no other part of a token file — not in `$value`, not in the
    // description. If `$extensions` were dropped, only this case would notice.
    const back = fromDesignTokens(toDesignTokens(SUBJECT).bytes);

    expect(back.colours.map((c) => c.lch)).toEqual(SUBJECT.colours.map((c) => c.lch));
    expect(back.colours.map((c) => c.oklch)).toEqual(SUBJECT.colours.map((c) => c.oklch));
  });

  it('keeps the palette in the order it was written', () => {
    const back = fromDesignTokens(toDesignTokens(SUBJECT).bytes);

    expect(back.colours.map((c) => c.id)).toEqual(SUBJECT.colours.map((c) => c.id));
  });

  it('does not parse the human-readable description — it reads the structured values', () => {
    // Rewording the description must change nothing about what an import produces. If the
    // parser ever reaches into `$description`, this case is the one that fails.
    /*
     * REWRITTEN THROUGH JSON.parse, NOT WITH A REGULAR EXPRESSION. The first version of this
     * case matched `"$description": "[^"]*"` and produced invalid JSON, because one fixture
     * name is `Ochre "warm"` and its escaped quotes end the character class early. Editing a
     * structured format by matching its text is the mistake F-127 is about, made again in a
     * test written the same afternoon.
     */
    const document = JSON.parse(fromUtf8(toDesignTokens(SUBJECT).bytes)) as Record<string, unknown>;
    const group = document[SUBJECT.title] as Record<string, Record<string, unknown>>;
    for (const token of Object.values(group)) token['$description'] = 'reworded';
    const back = fromDesignTokens(utf8(JSON.stringify(document, null, 2)));

    expect(back.colours).toEqual(SUBJECT.colours);
  });
});

describe('an export that is not one is refused by name', () => {
  it.each([
    ['not JSON at all', utf8('this is not a document\n')],
    ['a JSON array rather than an object', utf8('[]\n')],
    ['no $irodora envelope', utf8(JSON.stringify({ title: 'x', colours: [] }))],
    /*
     * AN ENVELOPE THAT IS PRESENT AND INCOMPLETE. The case above omits the block entirely, so
     * it throws at `requireRecord` and never reaches a field — a mutation defaulting `engine`
     * to '0.0.0' survived it. Each field needs its own case or none of them is checked.
     */
    [
      'an envelope with no engine version',
      utf8(JSON.stringify({ $irodora: { corpus: 'c', rules: 'r' }, title: 'x', colours: [] })),
    ],
    [
      'an envelope with no corpus version',
      utf8(JSON.stringify({ $irodora: { engine: 'e', rules: 'r' }, title: 'x', colours: [] })),
    ],
    [
      'an envelope with no rules version',
      utf8(JSON.stringify({ $irodora: { engine: 'e', corpus: 'c' }, title: 'x', colours: [] })),
    ],
    ['no title', utf8(JSON.stringify({ $irodora: ENVELOPE, colours: [] }))],
    [
      'colours that are not an array',
      utf8(JSON.stringify({ $irodora: ENVELOPE, title: 'x', colours: 3 })),
    ],
  ])('refuses %s', (_name, bytes) => {
    expect(() => fromJson(bytes)).toThrow(ExportError);
  });

  it('names the field it could not read, rather than saying the file is bad', () => {
    const document = JSON.parse(fromUtf8(toJson(SUBJECT).bytes)) as Record<string, unknown>;
    const colours = document['colours'] as Record<string, unknown>[];
    delete colours[0]!['lch'];

    expect(() => fromJson(utf8(JSON.stringify(document)))).toThrow(/colours\[0\]\.lch/u);
  });

  it('refuses a token file whose $extensions are gone, rather than inventing coordinates', () => {
    const document = JSON.parse(fromUtf8(toDesignTokens(SUBJECT).bytes)) as Record<string, unknown>;
    const group = document[SUBJECT.title] as Record<string, Record<string, unknown>>;
    delete group['ai-iro']!['$extensions'];

    expect(() => fromDesignTokens(utf8(JSON.stringify(document)))).toThrow(/\$extensions/u);
  });

  /*
   * THE DECOY. Without it, "it throws" would be equally true of a parser that threw on
   * everything, and every case above would be measuring that `expect().toThrow` works.
   */
  it('DECOY — the untouched files still parse', () => {
    expect(() => fromJson(toJson(SUBJECT).bytes)).not.toThrow();
    expect(() => fromDesignTokens(toDesignTokens(SUBJECT).bytes)).not.toThrow();
  });
});

describe('the hand-written UTF-8 decoder', () => {
  it('round-trips every shape the encoder can produce', () => {
    // One, two, three and four byte sequences — ASCII, a macron, a kanji, an emoji.
    const text = 'a ā 藍 🎨';

    expect(fromUtf8(utf8(text))).toBe(text);
  });

  it.each([
    ['a truncated sequence', Uint8Array.from([0xe8, 0x97])],
    ['a continuation byte that is not one', Uint8Array.from([0xe8, 0x97, 0x41])],
    ['a lead byte that is not one', Uint8Array.from([0x80])],
    // THE ONE A NAIVE DECODER ACCEPTS: 0xC0 0x80 decodes to U+0000 by arithmetic, and is
    // forbidden so that one character cannot be written two ways.
    ['an overlong encoding', Uint8Array.from([0xc0, 0x80])],
    ['a surrogate half', Uint8Array.from([0xed, 0xa0, 0x80])],
  ])('refuses %s', (_name, bytes) => {
    expect(() => fromUtf8(bytes)).toThrow(RangeError);
  });

  /*
   * THE MESSAGE, BECAUSE THE CHECK IS OTHERWISE UNOBSERVABLE. An out-of-range read yields 0,
   * and 0 is never a continuation byte — so a truncated sequence is refused with or without the
   * explicit length check, and a mutation removing it survived. What the check buys is a reason
   * a person can act on: "truncated" says the file was cut, "not a continuation" says it was
   * corrupted, and those are different things to do about it.
   */
  it('says a sequence is TRUNCATED rather than that a byte is wrong', () => {
    expect(() => fromUtf8(Uint8Array.from([0xe8, 0x97]))).toThrow(/truncated/u);
    expect(() => fromUtf8(Uint8Array.from([0xe8, 0x97, 0x41]))).toThrow(/not a continuation/u);
  });

  it('DECOY — the valid one-byte neighbour of the overlong case decodes', () => {
    expect(fromUtf8(Uint8Array.from([0x00]))).toBe('\u0000');
  });
});

/**
 * The TrueType parser (F-129, ADR-0083).
 *
 * Every expected value below comes from `FIXTURE`, which this repository **constructs** — so
 * these assert what the font declares rather than what the parser happens to read. Against the
 * shipped subset the same cases would assert that the parser agrees with itself.
 */
describe('reading a font', () => {
  const font = parseTrueType(buildFixtureFont());

  it('reads the metrics the fixture declares', () => {
    expect(font.unitsPerEm).toBe(FIXTURE.unitsPerEm);
    expect(font.numGlyphs).toBe(FIXTURE.numGlyphs);
    expect(font.bbox).toEqual([...FIXTURE.bbox]);
  });

  it('reads an advance width per glyph, including the ones past numberOfHMetrics', () => {
    expect(font.advanceWidths).toEqual([...FIXTURE.advanceWidths]);
  });

  it('maps every character the fixture covers to the glyph it assigned', () => {
    // All of them rather than a sample: a cmap walk that was right for one segment and wrong
    // for the next is the defect this catches, and a three-case sample would not.
    for (const { codePoint, glyph } of FIXTURE.characters)
      expect(`U+${codePoint.toString(16)} -> ${String(glyphFor(font, codePoint))}`).toBe(
        `U+${codePoint.toString(16)} -> ${String(glyph)}`,
      );
  });

  /*
   * THE THREE CLASSES ADR-0080 SAID A PDF COULD NOT DRAW, and the reason the fixture carries
   * exactly these: an ASCII letter, a CJK ideograph and a Latin letter with a macron.
   */
  it('covers ASCII, an ideograph and a macron — the three ADR-0080 refused', () => {
    expect(glyphFor(font, 'A'.codePointAt(0)!)).not.toBeNull();
    expect(glyphFor(font, '藍'.codePointAt(0)!)).not.toBeNull();
    expect(glyphFor(font, 'ā'.codePointAt(0)!)).not.toBeNull();
  });

  it('returns null for a character the font has no glyph for, never glyph 0', () => {
    // `.notdef` draws a box. Returning it would put a box in a report, which is the silent loss
    // ADR-0080 refused and ADR-0083 keeps refusing.
    //
    // NOT 'Z' — the fixture covers printable ASCII so a report can draw its own furniture, and
    // the first version of this case used a letter that IS covered.
    expect(glyphFor(font, '猫'.codePointAt(0)!)).toBeNull();
    expect(glyphFor(font, 'あ'.codePointAt(0)!)).toBeNull();
    expect(glyphFor(font, 0x1f3a8)).toBeNull();
  });

  it('converts a width to thousandths of an em, which is what a PDF wants', () => {
    // unitsPerEm is 1000 in the fixture, so the numbers are equal — and that is a fixture
    // choice, not an identity. The scaled case below is the one that would catch a missing
    // division.
    expect(pdfWidth(font, 1)).toBe(FIXTURE.advanceWidths[1] ?? 0);
  });

  it('scales a width when unitsPerEm is not 1000', () => {
    // A real CJK face is usually 1000, but 2048 is the other common value and a parser that
    // forgot the scale would be exactly half right.
    const scaled = { ...font, unitsPerEm: 2048 };

    expect(pdfWidth(scaled, 1)).toBe(Math.round(((FIXTURE.advanceWidths[1] ?? 0) * 1000) / 2048));
  });
});

describe('a font this cannot use is refused by name', () => {
  it('refuses an OpenType/CFF font, saying why it cannot be embedded', () => {
    const otto = buildFixtureFont({ version: 0x4f54544f });

    expect(() => parseTrueType(otto)).toThrow(/OTTO|CFF/u);
  });

  it('refuses a TrueType collection rather than reading its first font', () => {
    const ttcf = buildFixtureFont({ version: 0x74746366 });

    expect(() => parseTrueType(ttcf)).toThrow(/collection/u);
  });

  it.each(['head', 'maxp', 'hhea', 'hmtx', 'cmap'])('refuses a font with no %s table', (tag) => {
    expect(() => parseTrueType(buildFixtureFont({ omit: tag }))).toThrow(
      new RegExp(`"${tag}"`, 'u'),
    );
  });

  it('refuses bytes too short to hold a directory, rather than reading past them', () => {
    expect(() => parseTrueType(Uint8Array.from([0, 1, 0, 0]))).toThrow(FontError);
  });

  it('refuses a font truncated mid-table', () => {
    const whole = buildFixtureFont();

    expect(() => parseTrueType(whole.slice(0, whole.length - 40))).toThrow(FontError);
  });

  /*
   * THE DECOY. Without it, "it throws" would be equally true of a parser that threw on
   * everything — and the omission cases above would be measuring `expect().toThrow`.
   */
  it('DECOY — the untouched fixture parses', () => {
    expect(() => parseTrueType(buildFixtureFont())).not.toThrow();
  });
});

/**
 * The PDF with an embedded font (F-129, ADR-0083).
 *
 * ## What a viewer would not tell us
 *
 * A PDF is forgiving: a wrong `/Length`, a missing `/ToUnicode`, glyph ids drawn as if they
 * were characters — most of those still open, and most still show *something*. So these cases
 * check the structure and the mapping rather than that it rendered.
 */
describe('a PDF with an embedded font', () => {
  const FONT = buildFixtureFont();

  /** A subject whose every character the fixture font has a glyph for: A, 藍, ā. */
  const JAPANESE: ExportSubject = {
    title: 'A藍ā',
    envelope: ENVELOPE,
    colours: [
      {
        id: 'A',
        name: 'A藍ā',
        hex: '#264348',
        lab: [26.5, -8.1, -5.2],
        lch: [26.5, 9.63, 212.7],
        oklch: [0.36, 0.031, 210.4],
        source: 'reference',
      },
    ],
  };

  const latin1Of = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1');

  it('draws a title Latin-1 could not, rather than refusing it', () => {
    // THE WHOLE POINT, and its own decoy is the next case: without a font this throws.
    expect(() => toPdf(JAPANESE, { font: FONT })).not.toThrow();
  });

  it('DECOY — the same subject with no font is still refused by name (ADR-0080 stands)', () => {
    expect(() => toPdf(JAPANESE)).toThrow(/U\+85CD/u);
  });

  it('declares a Type0 font with Identity-H, a CID descendant and a ToUnicode map', () => {
    const body = latin1Of(toPdf(JAPANESE, { font: FONT }).bytes);

    expect(body).toContain('/Subtype /Type0');
    expect(body).toContain('/Encoding /Identity-H');
    expect(body).toContain('/Subtype /CIDFontType2');
    expect(body).toContain('/FontFile2');
    expect(body).toContain('/ToUnicode');
  });

  it('embeds the font bytes themselves, at the length it declares', () => {
    const out = toPdf(JAPANESE, { font: FONT }).bytes;
    const body = latin1Of(out);

    expect(body).toContain(`/Length ${String(FONT.length)} /Length1 ${String(FONT.length)}`);
    // The bytes are IN there, not merely described. `indexOf` over latin1 is exact because
    // latin1 is a byte-for-byte mapping.
    expect(body.includes(latin1Of(FONT))).toBe(true);
  });

  it('maps every drawn glyph back to its character, so the text can be selected', () => {
    const body = latin1Of(toPdf(JAPANESE, { font: FONT }).bytes);

    const entry = (glyph: number, code: number): string =>
      `<${glyph.toString(16).toUpperCase().padStart(4, '0')}> <${code.toString(16).toUpperCase().padStart(4, '0')}>`;

    expect(body).toContain(entry(GLYPH.ai, 0x85cd));
    expect(body).toContain(entry(GLYPH.A, 0x41));
  });

  it('draws glyph ids, not characters — the run is hex and even-length', () => {
    const body = latin1Of(toPdf(JAPANESE, { font: FONT }).bytes);
    const run = /<([0-9A-F]+)> Tj/u.exec(body);

    expect(run).not.toBeNull();
    expect((run?.[1] ?? '').length % 4).toBe(0);
  });

  it('carries a width for every glyph it draws', () => {
    const body = latin1Of(toPdf(JAPANESE, { font: FONT }).bytes);
    /*
     * UP TO `/CIDToGIDMap`, not to the first `]`. The first version of this matched
     * `\[([^\]]*)\]` and stopped inside the array's own first entry — the widths are
     * `gid [w]` pairs, so every entry contains a bracket. The writer was right; the pattern
     * was not.
     */
    const widths = /\/W \[(.*?)\] \/CIDToGIDMap/su.exec(body)?.[1] ?? '';
    const expected = (glyph: number): string =>
      `${String(glyph)} [${String(FIXTURE.advanceWidths[glyph] ?? 0)}]`;

    // At 1000 units per em a design unit IS a thousandth, so these are the fixture's own
    // numbers — and the scaling case in the parser suite is what covers the other ratio.
    expect(widths).toContain(expected(GLYPH.ai));
    expect(widths).toContain(expected(GLYPH.A));
  });

  it('is still deterministic — the same subject and font write the same bytes', () => {
    const a = toPdf(JAPANESE, { font: FONT }).bytes;
    const b = toPdf(JAPANESE, { font: FONT }).bytes;

    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('still ends where a reader looks for the end, with a binary stream in the middle', () => {
    // THE ASSERTION THE FONT MOST ENDANGERS. Every byte of the font counts toward the offsets
    // in the xref table, and a writer that measured a stream as text would put the table
    // somewhere plausible and wrong — which usually still opens.
    const body = latin1Of(toPdf(JAPANESE, { font: FONT }).bytes);
    const startxref = Number(/startxref\n(\d+)/u.exec(body)?.[1]);

    expect(Number.isInteger(startxref)).toBe(true);
    expect(body.slice(startxref, startxref + 4)).toBe('xref');
  });

  it('refuses a character the embedded font has no glyph for, by name', () => {
    const missing: ExportSubject = { ...JAPANESE, title: '猫' };

    expect(() => toPdf(missing, { font: FONT })).toThrow(/U\+732B/u);
  });

  it('refuses bytes that are not a font, rather than writing a document around them', () => {
    expect(() => toPdf(JAPANESE, { font: Uint8Array.from([1, 2, 3, 4]) })).toThrow(FontError);
  });

  it('writes our own labels in the alphabet it always did, whatever font is passed', () => {
    /*
     * ASSERTED THROUGH THE ToUnicode MAP, because with a font there is no text in the document
     * to search for: the content stream holds glyph ids. The map is what says which characters
     * were drawn — so if Δ or the em dash ever reached the page, their code points would appear
     * in it. The first version of this case looked for the literal 'dE00' and failed for
     * exactly that reason.
     */
    const withDeltas: ExportSubject = {
      ...JAPANESE,
      deltas: [{ fromId: 'A', toId: 'A', deltaE00: 1 }],
    };
    const body = latin1Of(toPdf(withDeltas, { font: FONT }).bytes);
    const map = /beginbfchar([\s\S]*?)endbfchar/u.exec(body)?.[1] ?? '';

    expect(map).not.toBe('');
    expect(map).not.toContain('<0394>'); // Δ, rewritten to 'd'
    expect(map).not.toContain('<2014>'); // the em dash, rewritten to '-'
    // And the letters it WAS rewritten to are there, so this is not passing on an empty map.
    expect(map).toContain(
      `<${'d'.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0') ?? ''}>`,
    );
  });
});
