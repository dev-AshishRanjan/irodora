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
  parseAse,
  slugify,
  toAse,
  toCsv,
  toCss,
  toDesignTokens,
  toJson,
  toPdf,
  WRITERS,
  type ExportSubject,
} from '../src/index.js';

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
