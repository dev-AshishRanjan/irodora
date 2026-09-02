/**
 * Just enough TrueType to embed a font in a PDF (F-129, ADR-0083).
 *
 * ## What this reads, and what it deliberately does not
 *
 * Five tables, and nothing else:
 *
 * | table | for |
 * |---|---|
 * | `head` | `unitsPerEm` — the scale every width is expressed in, and `indexToLocFormat` |
 * | `maxp` | `numGlyphs`, which bounds every glyph id |
 * | `hhea` | `numberOfHMetrics`, without which `hmtx` cannot be read |
 * | `hmtx` | advance widths, for the PDF's `/W` array |
 * | `cmap` | Unicode → glyph id |
 *
 * **No `glyf`, no `loca`, no outlines.** The font is embedded whole rather than subset again
 * (ADR-0083), so nothing here needs to understand a glyph's shape — which is the difference
 * between a parser and a font pipeline, and the reason this is a few hundred lines instead of a
 * project.
 *
 * ## Every read is bounds-checked, and that is not defensive habit
 *
 * A font is **untrusted input**: it arrives as bytes from a caller, and a truncated or hostile
 * one must produce a named error rather than a silently wrong offset. A `DataView` throws on an
 * out-of-range read, which is why every read goes through one — an index into a `Uint8Array`
 * returns `undefined` and arithmetic on it produces `NaN`, which travels a long way before
 * anything notices.
 *
 * ## The ground truth is a constructed font
 *
 * Testing this against the shipped subset would mean asking the parser for the expected values,
 * which is asserting that the parser agrees with itself. `test/truetype-fixture.ts` builds a
 * minimal valid font with metrics chosen by hand — ADR-0081's argument, in a second domain.
 */

/** A font this package can describe to a PDF. */
export interface TrueTypeFont {
  /** The bytes, exactly as supplied. Embedded whole; never rewritten. */
  readonly bytes: Uint8Array;
  /** Design units per em. Every width below is in these, and PDF wants thousandths. */
  readonly unitsPerEm: number;
  readonly numGlyphs: number;
  /** Advance width per glyph id, in design units. Length is `numGlyphs`. */
  readonly advanceWidths: readonly number[];
  /** Unicode code point → glyph id. Only the code points the font actually covers. */
  readonly cmap: ReadonlyMap<number, number>;
  /** `head`'s bounding box and flags, for the PDF `/FontDescriptor`. */
  readonly bbox: readonly [number, number, number, number];
}

export class FontError extends Error {
  constructor(detail: string) {
    super(`font: ${detail}`);
    this.name = 'FontError';
  }
}

/** A table's offset and length, from the directory. */
interface TableRecord {
  readonly offset: number;
  readonly length: number;
}

const TAG_TRUETYPE = 0x00010000;
const TAG_TRUE = 0x74727565;

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** A bounds-checked read that names the field rather than throwing a RangeError from nowhere. */
function u16(view: DataView, at: number, field: string): number {
  try {
    return view.getUint16(at, false);
  } catch {
    throw new FontError(`${field}: no 16-bit value at ${String(at)} — the font is truncated`);
  }
}

function i16(view: DataView, at: number, field: string): number {
  try {
    return view.getInt16(at, false);
  } catch {
    throw new FontError(
      `${field}: no signed 16-bit value at ${String(at)} — the font is truncated`,
    );
  }
}

function u32(view: DataView, at: number, field: string): number {
  try {
    return view.getUint32(at, false);
  } catch {
    throw new FontError(`${field}: no 32-bit value at ${String(at)} — the font is truncated`);
  }
}

/** The four-character tag at an offset, as ASCII. */
function tagAt(view: DataView, at: number): string {
  let tag = '';
  for (let i = 0; i < 4; i += 1) {
    try {
      tag += String.fromCharCode(view.getUint8(at + i));
    } catch {
      throw new FontError(`the table directory is truncated at ${String(at)}`);
    }
  }
  return tag;
}

/**
 * The table directory.
 *
 * A TrueType collection (`ttcf`) and an OpenType/CFF font (`OTTO`) are both refused **by name**:
 * neither is a thing this can embed, and a parser that read the first font of a collection would
 * silently produce a document with the wrong typeface in it.
 */
function tables(view: DataView): Map<string, TableRecord> {
  const version = u32(view, 0, 'the version tag');
  if (version !== TAG_TRUETYPE && version !== TAG_TRUE) {
    const tag = tagAt(view, 0);
    throw new FontError(
      `this is not a TrueType font — its version tag is ${JSON.stringify(tag)}. ` +
        (tag === 'OTTO'
          ? 'An OpenType/CFF font has no glyf table and cannot be embedded as a CIDFontType2.'
          : tag === 'ttcf'
            ? 'A TrueType collection holds several fonts; supply one of them.'
            : 'Only TrueType outlines are supported.'),
    );
  }

  const count = u16(view, 4, 'the table count');
  const found = new Map<string, TableRecord>();
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    found.set(tagAt(view, at), {
      offset: u32(view, at + 8, 'a table offset'),
      length: u32(view, at + 12, 'a table length'),
    });
  }
  return found;
}

function require_(found: Map<string, TableRecord>, tag: string): TableRecord {
  const record = found.get(tag);
  if (record === undefined)
    throw new FontError(`the font has no ${JSON.stringify(tag)} table, which is required`);
  return record;
}

/**
 * `cmap` subtable format 4 — the Basic Multilingual Plane.
 *
 * The format every font has for BMP characters, and the one whose segment arithmetic is easy to
 * get subtly wrong: `idRangeOffset` is a byte offset **from its own position in the array**,
 * which is why the read below is expressed relative to that address rather than to the table.
 */
function readFormat4(view: DataView, at: number, into: Map<number, number>): void {
  const segCountX2 = u16(view, at + 6, 'cmap4 segCountX2');
  const segCount = segCountX2 / 2;
  const endCodes = at + 14;
  const startCodes = endCodes + segCountX2 + 2;
  const idDeltas = startCodes + segCountX2;
  const idRangeOffsets = idDeltas + segCountX2;

  for (let s = 0; s < segCount; s += 1) {
    const end = u16(view, endCodes + s * 2, 'cmap4 endCode');
    const start = u16(view, startCodes + s * 2, 'cmap4 startCode');
    if (start > end) continue;
    // 0xFFFF is the required terminating segment, not a character.
    if (start === 0xffff) continue;
    const delta = u16(view, idDeltas + s * 2, 'cmap4 idDelta');
    const rangeOffsetAt = idRangeOffsets + s * 2;
    const rangeOffset = u16(view, rangeOffsetAt, 'cmap4 idRangeOffset');

    for (let code = start; code <= end && code !== 0x10000; code += 1) {
      let glyph: number;
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff;
      } else {
        // FROM THE OFFSET'S OWN ADDRESS. Measuring from the table start instead is the classic
        // way to read a font that then maps every character to a plausible wrong glyph.
        const glyphAt = rangeOffsetAt + rangeOffset + (code - start) * 2;
        const raw = u16(view, glyphAt, 'cmap4 glyphIdArray');
        glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
      }
      if (glyph !== 0) into.set(code, glyph);
    }
  }
}

/** `cmap` subtable format 12 — everything above the BMP, and the one a CJK font needs. */
function readFormat12(view: DataView, at: number, into: Map<number, number>): void {
  const groups = u32(view, at + 12, 'cmap12 nGroups');
  for (let g = 0; g < groups; g += 1) {
    const base = at + 16 + g * 12;
    const start = u32(view, base, 'cmap12 startCharCode');
    const end = u32(view, base + 4, 'cmap12 endCharCode');
    const glyph = u32(view, base + 8, 'cmap12 startGlyphID');
    if (end < start) continue;
    for (let code = start; code <= end; code += 1) into.set(code, glyph + (code - start));
  }
}

/**
 * Every Unicode mapping the font declares.
 *
 * Format 4 is read first and format 12 second, so a font carrying both ends with the wider
 * table's answer where they disagree — which is the direction that cannot lose a character.
 */
function readCmap(view: DataView, record: TableRecord): Map<number, number> {
  const at = record.offset;
  const count = u16(view, at + 2, 'cmap numTables');
  const mapping = new Map<number, number>();

  const subtables: { format: number; offset: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const entry = at + 4 + i * 8;
    const platform = u16(view, entry, 'cmap platformID');
    const encoding = u16(view, entry + 2, 'cmap encodingID');
    const offset = at + u32(view, entry + 4, 'cmap subtable offset');
    // Unicode (0, any) and Windows Unicode (3, 1) and (3, 10). A Macintosh Roman subtable is
    // NOT read: it is single-byte and would map a byte to a glyph as if it were a code point.
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    subtables.push({ format: u16(view, offset, 'cmap subtable format'), offset });
  }

  if (subtables.length === 0)
    throw new FontError('the font declares no Unicode cmap subtable, so nothing can be mapped');

  for (const sub of subtables.filter((s) => s.format === 4)) readFormat4(view, sub.offset, mapping);
  for (const sub of subtables.filter((s) => s.format === 12))
    readFormat12(view, sub.offset, mapping);

  if (mapping.size === 0) throw new FontError('the font has a Unicode cmap that maps nothing');
  return mapping;
}

/**
 * Advance widths, one per glyph.
 *
 * `hmtx` carries `numberOfHMetrics` pairs and then, for a monospaced tail, **only** left side
 * bearings — every glyph past that point repeats the last advance. A parser that read a width
 * per glyph would run off the end of the table and, in a font whose tail is short, produce
 * widths from whatever followed it.
 */
function readWidths(view: DataView, hmtx: TableRecord, count: number, numGlyphs: number): number[] {
  if (count === 0) throw new FontError('hhea declares no horizontal metrics');
  const widths: number[] = [];
  let last = 0;
  for (let g = 0; g < numGlyphs; g += 1) {
    if (g < count) last = u16(view, hmtx.offset + g * 4, `hmtx advance for glyph ${String(g)}`);
    widths.push(last);
  }
  return widths;
}

/** Read a font. Throws `FontError`, naming what was wrong, for anything this cannot use. */
export function parseTrueType(bytes: Uint8Array): TrueTypeFont {
  if (bytes.length < 12) throw new FontError('too short to hold a table directory');
  const view = viewOf(bytes);
  const found = tables(view);

  const head = require_(found, 'head');
  const unitsPerEm = u16(view, head.offset + 18, 'head unitsPerEm');
  if (unitsPerEm === 0) throw new FontError('head declares unitsPerEm of 0');

  const bbox: [number, number, number, number] = [
    i16(view, head.offset + 36, 'head xMin'),
    i16(view, head.offset + 38, 'head yMin'),
    i16(view, head.offset + 40, 'head xMax'),
    i16(view, head.offset + 42, 'head yMax'),
  ];

  const maxp = require_(found, 'maxp');
  const numGlyphs = u16(view, maxp.offset + 4, 'maxp numGlyphs');
  if (numGlyphs === 0) throw new FontError('maxp declares no glyphs');

  const hhea = require_(found, 'hhea');
  const numberOfHMetrics = u16(view, hhea.offset + 34, 'hhea numberOfHMetrics');

  const advanceWidths = readWidths(view, require_(found, 'hmtx'), numberOfHMetrics, numGlyphs);
  const cmap = readCmap(view, require_(found, 'cmap'));

  for (const [code, glyph] of cmap)
    if (glyph >= numGlyphs)
      throw new FontError(
        `cmap maps U+${code.toString(16).toUpperCase()} to glyph ${String(glyph)}, but the font ` +
          `declares only ${String(numGlyphs)}`,
      );

  return { bytes, unitsPerEm, numGlyphs, advanceWidths, cmap, bbox };
}

/**
 * The glyph for a code point, or `null`.
 *
 * `null` rather than glyph 0. `.notdef` is a real glyph that draws a box, and returning it would
 * put a box in a report — the silent loss ADR-0080 refused and ADR-0083 keeps refusing. The
 * caller turns this into a named refusal.
 */
export function glyphFor(font: TrueTypeFont, codePoint: number): number | null {
  return font.cmap.get(codePoint) ?? null;
}

/** A width in PDF glyph space — thousandths of an em, which is what `/W` and `/MissingWidth` use. */
export function pdfWidth(font: TrueTypeFont, glyph: number): number {
  const raw = font.advanceWidths[glyph] ?? 0;
  return Math.round((raw * 1000) / font.unitsPerEm);
}
