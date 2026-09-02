/**
 * A minimal, valid TrueType font, built here so its metrics are known (ADR-0083, F-129).
 *
 * ## Why not the font we ship
 *
 * `apps/mobile/assets/fonts/NotoSansJP-Subset.ttf` is real and available. Testing the parser
 * against it means obtaining the expected values **from the parser** — which asserts that the
 * parser agrees with itself, and would pass with a `cmap` walk that mapped every character to a
 * plausible wrong glyph. It is also a cross-package read (E-025).
 *
 * This font's `unitsPerEm`, glyph count, advance widths and character mapping are chosen here,
 * in this file, and the tests assert those numbers. That is ADR-0081's argument — *constructed,
 * so its ground truth is exact* — applied to a second domain.
 *
 * ## What it contains
 *
 * Four glyphs and no outlines: `.notdef`, and one each for `A`, `藍` and `ā`. The three
 * characters are deliberate — one ASCII, one CJK ideograph, one Latin with a macron — because
 * those are exactly the three classes ADR-0080 said a PDF could not draw.
 *
 * `glyf` and `loca` are present but empty: the parser does not read them (the font is embedded
 * whole, never subset), and a font directory that omitted them entirely would be describing a
 * shape no real font has.
 */

/**
 * The characters this font covers.
 *
 * **Printable ASCII, an em dash, and the two ADR-0080 named** — a CJK ideograph and a macron
 * romaji. ASCII is here because a report draws its own furniture: "irodora", the column
 * headings, the hex values. A fixture with three glyphs could not draw a whole document, and
 * the first version of it did not — which is how the `.notdef` fallback above was found.
 */
const COVERED: readonly number[] = [
  ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i),
  0x2014, // — the em dash our own headings use
  0x101, // ā
  0x85cd, // 藍
];

/**
 * An advance width for a glyph id, chosen by a rule rather than a table.
 *
 * Known by construction and different per glyph, so a parser that returned the FIRST width for
 * every glyph — the shape of an `hmtx` bug — produces different numbers from these.
 */
const widthOf = (glyph: number): number => 400 + ((glyph * 37) % 600);

/** The metrics this fixture declares. **The tests assert these**, so they are the contract. */
export const FIXTURE = {
  unitsPerEm: 1000,
  numGlyphs: COVERED.length + 1,
  /** By glyph id. Glyph 0 is `.notdef`. */
  advanceWidths: Array.from({ length: COVERED.length + 1 }, (_, g) => widthOf(g)),
  bbox: [-100, -200, 1100, 900] as const,
  /** Code point → glyph id, in ascending code-point order from glyph 1. */
  characters: COVERED.map((codePoint, i) => ({
    codePoint,
    glyph: i + 1,
    label: String.fromCodePoint(codePoint),
  })),
} as const;

/** The three the tests name, looked up rather than hard-coded beside the table. */
export const GLYPH = {
  A: FIXTURE.characters.find((c) => c.codePoint === 0x41)?.glyph ?? 0,
  ai: FIXTURE.characters.find((c) => c.codePoint === 0x85cd)?.glyph ?? 0,
  macron: FIXTURE.characters.find((c) => c.codePoint === 0x101)?.glyph ?? 0,
} as const;

const be16 = (n: number): number[] => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];

/**
 * A `cmap` with a format 4 subtable and a format 12 subtable.
 *
 * Both, on purpose. Format 4 covers the BMP and format 12 is what a font needs above it; a
 * fixture with only one would let a parser that ignored the other pass.
 *
 * Format 4 is built with **one segment per character plus the required 0xFFFF terminator**, and
 * uses `idDelta` (not `idRangeOffset`), because a segment-per-character font is the simplest
 * thing that is still a real format-4 table.
 */
function cmapTable(): number[] {
  const chars = [...FIXTURE.characters].sort((a, b) => a.codePoint - b.codePoint);

  // --- format 4 -------------------------------------------------------------------------
  const segments = [
    ...chars.map((c) => ({ start: c.codePoint, end: c.codePoint, glyph: c.glyph })),
    { start: 0xffff, end: 0xffff, glyph: 0 },
  ];
  const segCount = segments.length;
  const format4: number[] = [
    ...be16(4),
    ...be16(16 + segCount * 8), // length
    ...be16(0), // language
    ...be16(segCount * 2),
    ...be16(2 ** Math.floor(Math.log2(segCount)) * 2), // searchRange
    ...be16(Math.floor(Math.log2(segCount))), // entrySelector
    ...be16(segCount * 2 - 2 ** Math.floor(Math.log2(segCount)) * 2), // rangeShift
    ...segments.flatMap((s) => be16(s.end)),
    ...be16(0), // reservedPad
    ...segments.flatMap((s) => be16(s.start)),
    // idDelta: glyph = (code + delta) & 0xFFFF, so delta = glyph - code.
    ...segments.flatMap((s) => be16((s.glyph - s.start) & 0xffff)),
    ...segments.flatMap(() => be16(0)), // idRangeOffset — all zero, so idDelta decides
  ];

  // --- format 12 ------------------------------------------------------------------------
  const groups = chars.map((c) => [...be32(c.codePoint), ...be32(c.codePoint), ...be32(c.glyph)]);
  const format12: number[] = [
    ...be16(12),
    ...be16(0), // reserved
    ...be32(16 + groups.length * 12), // length
    ...be32(0), // language
    ...be32(groups.length),
    ...groups.flat(),
  ];

  // --- the subtable directory -----------------------------------------------------------
  const headerLength = 4 + 2 * 8;
  return [
    ...be16(0), // version
    ...be16(2), // numTables
    ...be16(3), // platform 3, Windows
    ...be16(1), // encoding 1, BMP
    ...be32(headerLength),
    ...be16(3),
    ...be16(10), // encoding 10, full repertoire
    ...be32(headerLength + format4.length),
    ...format4,
    ...format12,
  ];
}

function headTable(): number[] {
  const table = new Array<number>(54).fill(0);
  const put = (at: number, bytes: number[]): void => {
    for (const [i, b] of bytes.entries()) table[at + i] = b;
  };
  put(0, be32(0x00010000)); // version
  put(4, be32(0x00010000)); // fontRevision
  put(12, be32(0x5f0f3cf5)); // magicNumber
  put(18, be16(FIXTURE.unitsPerEm));
  put(36, be16(FIXTURE.bbox[0] & 0xffff));
  put(38, be16(FIXTURE.bbox[1] & 0xffff));
  put(40, be16(FIXTURE.bbox[2] & 0xffff));
  put(42, be16(FIXTURE.bbox[3] & 0xffff));
  put(50, be16(0)); // indexToLocFormat — short
  return table;
}

/** `hmtx` with a metric for every glyph, so `numberOfHMetrics` equals `numGlyphs`. */
function hmtxTable(): number[] {
  return FIXTURE.advanceWidths.flatMap((w) => [...be16(w), ...be16(0)]);
}

/**
 * A font file with the tables the parser reads.
 *
 * `checkSumAdjustment` is left zero: nothing here verifies checksums, and a fixture that
 * computed one would be testing arithmetic this parser never performs.
 */
export function buildFixtureFont(
  overrides: { readonly version?: number; readonly omit?: string } = {},
): Uint8Array {
  const entries: { tag: string; data: number[] }[] = [
    { tag: 'cmap', data: cmapTable() },
    { tag: 'glyf', data: [] },
    { tag: 'head', data: headTable() },
    { tag: 'hhea', data: [...new Array<number>(34).fill(0), ...be16(FIXTURE.numGlyphs)] },
    { tag: 'hmtx', data: hmtxTable() },
    { tag: 'loca', data: new Array<number>((FIXTURE.numGlyphs + 1) * 2).fill(0) },
    {
      tag: 'maxp',
      data: [...be32(0x00010000), ...be16(FIXTURE.numGlyphs), ...new Array<number>(26).fill(0)],
    },
  ].filter((t) => t.tag !== overrides.omit);

  const count = entries.length;
  const directoryLength = 12 + count * 16;

  let offset = directoryLength;
  const placed = entries.map((entry) => {
    const at = offset;
    // Tables are four-byte aligned, which is what the specification requires and what an
    // offset-by-one bug in a reader would trip over.
    offset += entry.data.length + ((4 - (entry.data.length % 4)) % 4);
    return { ...entry, at };
  });

  const out: number[] = [
    ...be32(overrides.version ?? 0x00010000),
    ...be16(count),
    ...be16(0), // searchRange, unread
    ...be16(0), // entrySelector, unread
    ...be16(0), // rangeShift, unread
  ];
  for (const t of placed) {
    for (const c of t.tag) out.push(c.charCodeAt(0));
    out.push(...be32(0)); // checkSum
    out.push(...be32(t.at));
    out.push(...be32(t.data.length));
  }
  for (const t of placed) {
    out.push(...t.data);
    while (out.length % 4 !== 0) out.push(0);
  }

  return Uint8Array.from(out);
}
