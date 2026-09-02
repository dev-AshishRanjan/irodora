/**
 * The PDF report (FR-65, F-056).
 *
 * > *PDF reports carrying colour values, ΔE tables and version envelope. The report is
 * > reproducible from its envelope, and is generated on the device.*
 *
 * ## Three things make a PDF non-deterministic, and none of them is here
 *
 * `/CreationDate`, a `/ID` built from a clock or a random source, and compressed streams whose
 * output depends on the compressor's version. This writer has no dates, no ids, and no
 * compression — so the same subject writes the same bytes, and *"reproducible from its
 * envelope"* is a thing a test asserts rather than a sentence in a document.
 *
 * That is [ADR-0070](../../../docs/adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md)'s
 * argument, applied to the format where it matters most: **a viewer is forgiving.** A broken
 * cross-reference table, a wrong `/Length`, an object numbered twice — a PDF with any of those
 * usually still opens. So "it opened" is not evidence, and the test checks the structure.
 *
 * ## Latin-1, and what that costs
 *
 * Text is drawn with base-14 Helvetica, which needs no embedded font — and an embedded font is
 * what would make this writer need a TrueType parser, a `cmap` walk and a subsetter. The cost
 * is that **no kanji, no kana, and none of the nine corpus romaji carrying macrons can appear
 * in a PDF**, because WinAnsi has no code for them. See ADR-0080.
 *
 * A character this cannot encode is **refused by name**, never dropped and never replaced with
 * a box: a report that silently loses a character is a report somebody trusts. The five text
 * formats carry every one of them, so nothing is lost from the export *set*.
 *
 * ## And with a font, it draws them (F-129, ADR-0083)
 *
 * `toPdf(subject, { font })` takes TrueType bytes and embeds them whole — a `/Type0` font with
 * `/Encoding /Identity-H`, a `/CIDFontType2` descendant, the file itself as `/FontFile2`, and a
 * **`/ToUnicode` CMap** so the text stays selectable rather than becoming a picture of itself.
 *
 * **With no font, every line above still holds.** That is deliberate: ADR-0080's refusal tests
 * keep their meaning, every existing caller keeps working, and the two paths differ only in
 * which characters reach the refusal — never in whether there is one.
 *
 * The bytes are the app's existing subset (ADR-0057), embedded rather than subset again. That
 * costs a large document and buys a coverage question already answered by a gate that runs
 * today. ADR-0083 records both halves.
 */

import { concat, latin1, utf8 } from './utf8.js';
import { glyphFor, parseTrueType, pdfWidth, type TrueTypeFont } from './truetype.js';
interface Line {
  readonly text: string;
  readonly indent: number;
  readonly swatch?: string | undefined;
}

import {
  assertSubject,
  envelopeFields,
  ExportError,
  filenameFor,
  type ExportFile,
  type ExportSubject,
} from './subject.js';

/** A4 at 72 dpi, which is the PDF unit. */
const PAGE = { width: 595, height: 842 } as const;
const MARGIN = 48;
const LINE = 14;

/**
 * Whether every character can be drawn by a base-14 font under WinAnsiEncoding.
 *
 * Written as an explicit code-point test rather than a character-range regular expression:
 * the range needs U+00A0 and U+00FF as literal characters, **neither of which is visible in a
 * diff**, and a reviewer cannot tell a correct range from a typo. The gap between 0x7E and
 * 0xA0 is deliberate — the codes in it differ between WinAnsi and Latin-1, so a writer that
 * used them would draw a different glyph in a viewer that resolved the font differently.
 */
function isEncodable(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20) return false;
    if (code > 0x7e && code < 0xa0) return false;
    if (code > 0xff) return false;
  }
  return true;
}

/**
 * Refuse text this encoding cannot represent, naming the first character that fails.
 *
 * Naming it is the difference between a person changing a palette title and a person filing a
 * bug called "PDF export is broken".
 */
function encodable(text: string, field: string): string {
  if (isEncodable(text)) return text;
  // `Array.from` rather than a spread: both iterate code points, and the lint prefers the
  // form that cannot be confused with `.split('')`, which does not.
  const bad = Array.from(text).find((c) => !isEncodable(c)) ?? '';
  const codePoint = bad.codePointAt(0) ?? 0;
  throw new ExportError(
    `the PDF report is Latin-1 and cannot draw ${JSON.stringify(bad)} (U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}) in ${field}. The CSV, JSON, CSS and design-token exports carry it; see ADR-0080.`,
  );
}

/** How to draw the report. Absent `font` is ADR-0080's Latin-1 path, unchanged. */
export interface PdfOptions {
  /**
   * TrueType bytes to embed.
   *
   * Bytes rather than a parsed font, because this package reads no files and the caller has to
   * obtain them anyway — and bytes are what `/FontFile2` carries, so nothing is re-serialised.
   */
  readonly font?: Uint8Array | undefined;
}

/**
 * Refuse text the embedded font has no glyph for, naming the first character that fails.
 *
 * The same contract as `encodable`, one alphabet wider. `glyphFor` returns `null` rather than
 * glyph 0 precisely so this can refuse: `.notdef` draws a box, and a box in a report is the
 * silent loss ADR-0080 refused and ADR-0083 keeps refusing.
 */
function drawable(text: string, field: string, font: TrueTypeFont): string {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (glyphFor(font, code) === null)
      throw new ExportError(
        `the embedded font has no glyph for ${JSON.stringify(character)} ` +
          `(U+${code.toString(16).toUpperCase().padStart(4, '0')}) in ${field}. The CSV, JSON, ` +
          'CSS and design-token exports carry it; see ADR-0083.',
      );
  }
  return text;
}

/**
 * Text as glyph ids, hex, two bytes each — what `/Identity-H` means.
 *
 * A `Tj` operand under Identity-H is **not text**: it is a run of 16-bit glyph indices, and a
 * viewer that finds a string there draws whatever glyph each byte pair happens to number. The
 * `/ToUnicode` CMap is what puts the characters back for selection and search.
 */
function glyphRun(text: string, font: TrueTypeFont): string {
  let hex = '';
  for (const character of text) {
    const glyph = glyphFor(font, character.codePointAt(0) ?? 0) ?? 0;
    hex += glyph.toString(16).toUpperCase().padStart(4, '0');
  }
  return `<${hex}>`;
}

/** A PDF string literal: backslash-escape the three characters that end one early. */
const pdfString = (text: string): string =>
  `(${text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')})`;

const num = (n: number): string => n.toFixed(2);

/** `#RRGGBB` to a PDF `rg` fill operator's three operands. */
function fill(hex: string): string {
  const raw = hex.trim().replace(/^#/u, '');
  if (!/^[0-9a-fA-F]{6}$/u.test(raw))
    throw new ExportError(`the PDF report needs a #RRGGBB hex; got ${JSON.stringify(hex)}`);
  const channel = (at: number): string => (parseInt(raw.slice(at, at + 2), 16) / 255).toFixed(4);
  return `${channel(0)} ${channel(2)} ${channel(4)}`;
}

/**
 * One PDF object: a dictionary, and optionally a stream of bytes after it.
 *
 * `stream` is `Uint8Array` rather than a string because a font file is binary and `latin1`
 * would truncate every byte above 0xFF — producing a document with a correct structure and a
 * corrupt typeface, which opens.
 */
interface PdfObject {
  readonly body: string;
  readonly stream?: Uint8Array | undefined;
}

/** ADR-0080's font: base-14, no embedding, one object. */
function latin1Font(): PdfObject[] {
  return [
    { body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' },
  ];
}

/**
 * Every glyph the document actually draws, in ascending order.
 *
 * Ascending because `/W` and the `/ToUnicode` map are both emitted from it, and a set iterated
 * in insertion order would make the same subject produce different bytes when a colour moved —
 * which is exactly the determinism ADR-0070 exists to protect.
 */
function usedGlyphs(
  font: TrueTypeFont,
  lines: readonly Line[],
): readonly { readonly glyph: number; readonly codePoint: number }[] {
  const used = new Map<number, number>();
  for (const line of lines)
    for (const character of line.text) {
      const code = character.codePointAt(0) ?? 0;
      const glyph = glyphFor(font, code);
      // `null` cannot happen — every line has been through `drawable` — and is skipped rather
      // than asserted away, because a `!` here would be the one this repository forbids.
      if (glyph !== null) used.set(glyph, code);
    }
  return [...used.entries()]
    .map(([glyph, codePoint]) => ({ glyph, codePoint }))
    .sort((a, b) => a.glyph - b.glyph);
}

/**
 * A `/ToUnicode` CMap — what makes the text selectable rather than a picture of itself.
 *
 * Without it a viewer knows which glyph to draw and nothing about what it *means*: copying from
 * the document yields the glyph indices, and searching finds nothing. Criterion 2 names it for
 * that reason.
 *
 * The `bfchar` operator is limited to 100 entries per block by the specification, so the
 * entries are chunked — a font subset for a Japanese corpus has far more than a hundred.
 */
function toUnicodeCMap(glyphs: readonly { glyph: number; codePoint: number }[]): string {
  const hex = (n: number, width: number): string =>
    n.toString(16).toUpperCase().padStart(width, '0');

  const blocks: string[] = [];
  for (let at = 0; at < glyphs.length; at += 100) {
    const chunk = glyphs.slice(at, at + 100);
    blocks.push(
      `${String(chunk.length)} beginbfchar\n` +
        chunk
          .map((g) => {
            // A code point above the BMP is a SURROGATE PAIR in the CMap's UTF-16BE value, and
            // writing it as one 32-bit number would map it to nothing a viewer recognises.
            const value =
              g.codePoint > 0xffff
                ? hex(0xd800 + ((g.codePoint - 0x10000) >> 10), 4) +
                  hex(0xdc00 + ((g.codePoint - 0x10000) & 0x3ff), 4)
                : hex(g.codePoint, 4);
            return `<${hex(g.glyph, 4)}> <${value}>`;
          })
          .join('\n') +
        '\nendbfchar',
    );
  }

  return [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    ...blocks,
    'endcmap',
    'CMapResource_ /CMap findresource pop',
    'end',
    'end',
  ]
    .join('\n')
    .replace(
      'CMapResource_ /CMap findresource pop',
      'CMapName currentdict /CMap defineresource pop',
    );
}

/**
 * The five objects an embedded TrueType font needs (ADR-0083).
 *
 *   3   /Type0 with /Identity-H        the font the content stream names
 *   4   /CIDFontType2                  the descendant, carrying the widths
 *   5   /FontDescriptor                the metrics a viewer substitutes from if the file is bad
 *   6   /FontFile2                     the file itself
 *   7   /ToUnicode                     what the glyphs mean
 *
 * `/Flags 4` is "symbolic", which is what a font whose encoding is Identity-H is: the viewer
 * must not apply a standard encoding to it.
 */
function embeddedFont(font: TrueTypeFont, lines: readonly Line[]): PdfObject[] {
  const glyphs = usedGlyphs(font, lines);
  const scale = (v: number): number => Math.round((v * 1000) / font.unitsPerEm);

  // /W as one [gid [w]] entry per glyph. The verbose form on purpose: the compact run form
  // depends on consecutive ids, and a subset's ids are not consecutive.
  const widths = glyphs
    .map((g) => `${String(g.glyph)} [${String(pdfWidth(font, g.glyph))}]`)
    .join(' ');
  const cmapText = toUnicodeCMap(glyphs);
  const cmapBytes = utf8(cmapText);

  return [
    {
      body:
        '<< /Type /Font /Subtype /Type0 /BaseFont /IrodoraEmbedded /Encoding /Identity-H ' +
        '/DescendantFonts [4 0 R] /ToUnicode 7 0 R >>',
    },
    {
      body:
        '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /IrodoraEmbedded ' +
        '/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ' +
        `/FontDescriptor 5 0 R /DW ${String(scale(font.advanceWidths[0] ?? 0))} /W [${widths}] ` +
        '/CIDToGIDMap /Identity >>',
    },
    {
      body:
        '<< /Type /FontDescriptor /FontName /IrodoraEmbedded /Flags 4 ' +
        `/FontBBox [${font.bbox.map((v) => String(scale(v))).join(' ')}] ` +
        '/ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 /FontFile2 6 0 R >>',
    },
    {
      // /Length1 is the uncompressed length, required for a TrueType stream, and equal to
      // /Length here because nothing is compressed (ADR-0070).
      body: `<< /Length ${String(font.bytes.length)} /Length1 ${String(font.bytes.length)} >>`,
      stream: font.bytes,
    },
    { body: `<< /Length ${String(cmapBytes.length)} >>`, stream: cmapBytes },
  ];
}

/**
 * The report.
 *
 * One page per twenty-five colours, so a palette of any size produces a document rather than a
 * clipped one. The page tree is built after the content, because a page's object number depends
 * on how many pages there are — which is the ordering bug that makes a two-page report open
 * showing one.
 */
export function toPdf(subject: ExportSubject, options: PdfOptions = {}): ExportFile {
  assertSubject(subject);

  /*
   * ONE PREDICATE, CHOSEN ONCE. Both paths refuse by name and differ only in which alphabet
   * they can draw, so the whole writer below is written against `accept` and never asks again
   * which mode it is in — a second `if (font)` somewhere would be the place the two paths
   * quietly diverged.
   */
  const font = options.font === undefined ? null : parseTrueType(options.font);
  const accept =
    font === null
      ? (text: string, field: string): string => encodable(text, field)
      : (text: string, field: string): string => drawable(text, field, font);

  const title = accept(subject.title, 'the title');
  const versions = envelopeFields(subject.envelope)
    .map(([key, value]) => `${key} ${value}`)
    .join('   ');

  const lines: Line[] = [
    { text: title, indent: 0 },
    { text: `irodora   ${versions}`, indent: 0 },
    { text: '', indent: 0 },
    { text: 'Colours — CIELAB (D65), then OKLCh', indent: 0 },
  ];

  for (const colour of subject.colours) {
    const name = accept(colour.name, `the name of ${JSON.stringify(colour.id)}`);
    lines.push({
      text: `${name}   ${colour.hex}   L*a*b* ${colour.lab.map((v) => v.toFixed(2)).join(' ')}   OKLCh ${colour.oklch.map((v) => v.toFixed(3)).join(' ')}   ${colour.source}`,
      indent: 16,
      swatch: colour.hex,
    });
  }

  if (subject.deltas !== undefined && subject.deltas.length > 0) {
    lines.push({ text: '', indent: 0 }, { text: 'Differences — ΔE00, CIELAB (D65)', indent: 0 });
    for (const delta of subject.deltas)
      lines.push({
        text: `${accept(delta.fromId, 'a delta id')} to ${accept(delta.toId, 'a delta id')}   ${delta.deltaE00.toFixed(3)}`,
        indent: 16,
      });
  }

  /*
   * OUR OWN LABELS, SPELLED IN THE ALPHABET THE DOCUMENT CAN DRAW.
   *
   * "ΔE00" is not Latin-1 — Δ is U+0394 — and it is written as "dE00" rather than refused,
   * because unlike a colour NAME it is our label and we are free to spell it. A person's text is
   * refused; our own is rewritten.
   *
   * THE EM DASH WAS A REAL DEFECT, found by the check below when it was added (F-129). The
   * headings above read "Colours — CIELAB (D65)", and U+2014 is not Latin-1 either — so
   * `latin1()` truncated it to byte 0x14, **a control character in the middle of a heading, in
   * every PDF this writer has produced**. Nothing caught it because our own labels never went
   * through `encodable`; only the person's text did. It is spelled as a hyphen now.
   *
   * UNCONDITIONAL, even when a font could draw both. Making it depend on the font would mean
   * the same subject produced two different documents according to what was passed, and our own
   * labels are the part of this report that should not move.
   */
  const OURS = [
    ['Δ', 'd'],
    ['—', '-'],
  ] as const;
  const rewritten = lines.map((line) => ({
    ...line,
    text: OURS.reduce((text, [from_, to_]) => text.replaceAll(from_, to_), line.text),
  }));

  /*
   * EVERY LINE, NOT ONLY THE PERSON'S TEXT.
   *
   * `accept` was applied to the title, the colour names and the delta ids — and the fixed
   * labels above ("irodora", "Colours — CIELAB (D65), then OKLCh") went straight into the list.
   * On the Latin-1 path that was harmless, because those labels are Latin-1 by construction. On
   * the embedded path it was not: `glyphRun` falls back to glyph 0 for a character the font
   * lacks, and glyph 0 is `.notdef` — **a row of boxes, silently**, which is precisely what
   * ADR-0080 refused and ADR-0083 keeps refusing.
   *
   * So the check runs once, here, over everything that will be drawn. A font that cannot draw
   * this report's own furniture is a font this cannot use, and saying so is the whole discipline.
   */
  const drawn = rewritten.map((line) => ({
    ...line,
    text: accept(line.text, 'a line of the report'),
  }));

  const perPage = Math.max(1, Math.floor((PAGE.height - MARGIN * 2) / LINE));
  const pages: Line[][] = [];
  for (let i = 0; i < drawn.length; i += perPage) pages.push(drawn.slice(i, i + perPage));
  if (pages.length === 0) pages.push([]);

  const contents = pages.map((page) => contentStream(page, font));

  /*
   * OBJECT NUMBERING, and it is the part a reader has to be able to follow.
   *
   *   1                  the catalogue
   *   2                  the page tree
   *   3                  the font — Type1 Helvetica, or Type0 when one is embedded
   *   4 … 3+f            the rest of the font, when embedded (f is 0 or 4)
   *   4+f … 3+f+n        the page objects
   *   4+f+n … 3+f+2n     the content streams
   *
   * `f` is what makes this readable rather than a table of magic numbers: with no font it is
   * zero and every number below is what it was before this feature.
   */
  const pageCount = pages.length;
  const fontObjects = font === null ? latin1Font() : embeddedFont(font, drawn);
  const extra = fontObjects.length - 1;
  const firstPage = 4 + extra;
  const firstContent = firstPage + pageCount;

  const objects: PdfObject[] = [
    { body: '<< /Type /Catalog /Pages 2 0 R >>' },
    {
      body: `<< /Type /Pages /Count ${String(pageCount)} /Kids [${pages
        .map((_, i) => `${String(firstPage + i)} 0 R`)
        .join(' ')}] >>`,
    },
    ...fontObjects,
    ...pages.map((_, i) => ({
      body:
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${String(PAGE.width)} ${String(PAGE.height)}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${String(firstContent + i)} 0 R >>`,
    })),
  ];

  const header = latin1('%PDF-1.4\n');
  const parts: Uint8Array[] = [header];
  const offsets: number[] = [];
  // The header's own length, named rather than indexed back out of the array it was just
  // pushed into — `parts[0]` is possibly-undefined to the compiler, and the assertion that
  // silences it is the one this repository forbids.
  let offset = header.length;

  const push = (body: Uint8Array): void => {
    parts.push(body);
    offset += body.length;
  };

  objects.forEach((object, i) => {
    offsets.push(offset);
    if (object.stream === undefined) {
      push(latin1(`${String(i + 1)} 0 obj\n${object.body}\nendobj\n`));
      return;
    }
    // A STREAM'S BYTES ARE NOT TEXT. `latin1` would truncate every byte above 0xFF — which a
    // font file is full of — and the document would open with the right structure and the
    // wrong typeface.
    push(latin1(`${String(i + 1)} 0 obj\n${object.body}\nstream\n`));
    push(object.stream);
    push(latin1('\nendstream\nendobj\n'));
  });

  contents.forEach((stream, i) => {
    offsets.push(offset);
    const bytes = latin1(stream);
    push(
      latin1(`${String(firstContent + i)} 0 obj\n<< /Length ${String(bytes.length)} >>\nstream\n`),
    );
    push(bytes);
    push(latin1('\nendstream\nendobj\n'));
  });

  const xrefAt = offset;
  const total = objects.length + contents.length + 1;
  const xref = [
    'xref',
    `0 ${String(total)}`,
    '0000000000 65535 f ',
    ...offsets.map((at) => `${String(at).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${String(total)} /Root 1 0 R >>`,
    'startxref',
    String(xrefAt),
    '%%EOF\n',
  ].join('\n');
  push(latin1(xref));

  return {
    filename: filenameFor(subject.title, 'pdf'),
    mediaType: 'application/pdf',
    bytes: concat(parts),
  };
}

/** One page's drawing operators. Swatch first, then its line of text, so text is never covered. */
function contentStream(page: readonly Line[], font: TrueTypeFont | null): string {
  const operators: string[] = [];
  let y = PAGE.height - MARGIN;

  for (const line of page) {
    if (line.swatch !== undefined)
      operators.push(
        `${fill(line.swatch)} rg`,
        `${num(MARGIN)} ${num(y - 8)} 10 10 re f`,
        '0 0 0 rg',
      );
    if (line.text !== '')
      operators.push(
        'BT',
        '/F1 9 Tf',
        `${num(MARGIN + line.indent)} ${num(y)} Td`,
        // A PDF STRING under Helvetica; a GLYPH RUN under Identity-H. They look alike and
        // are not: one is characters, the other is 16-bit indices into the embedded font.
        `${font === null ? pdfString(line.text) : glyphRun(line.text, font)} Tj`,
        'ET',
      );
    y -= LINE;
  }

  return `${operators.join('\n')}\n`;
}
