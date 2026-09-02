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
 */

import { concat, latin1 } from './utf8.js';
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
 * The report.
 *
 * One page per twenty-five colours, so a palette of any size produces a document rather than a
 * clipped one. The page tree is built after the content, because a page's object number depends
 * on how many pages there are — which is the ordering bug that makes a two-page report open
 * showing one.
 */
export function toPdf(subject: ExportSubject): ExportFile {
  assertSubject(subject);

  const title = encodable(subject.title, 'the title');
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
    const name = encodable(colour.name, `the name of ${JSON.stringify(colour.id)}`);
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
        text: `${encodable(delta.fromId, 'a delta id')} to ${encodable(delta.toId, 'a delta id')}   ${delta.deltaE00.toFixed(3)}`,
        indent: 16,
      });
  }

  /*
   * "ΔE00" is not Latin-1 either — Δ is U+0394. It is written here as "dE00" rather than
   * refused, because unlike a colour NAME it is our own label and we are free to spell it in
   * the alphabet the document can draw. A person's text is refused; our own is rewritten.
   */
  const drawable = lines.map((line) => ({ ...line, text: line.text.replaceAll('Δ', 'd') }));

  const perPage = Math.max(1, Math.floor((PAGE.height - MARGIN * 2) / LINE));
  const pages: Line[][] = [];
  for (let i = 0; i < drawable.length; i += perPage) pages.push(drawable.slice(i, i + perPage));
  if (pages.length === 0) pages.push([]);

  const contents = pages.map((page) => contentStream(page));

  /*
   * OBJECT NUMBERING, and it is the part a reader has to be able to follow.
   *
   *   1                  the catalogue
   *   2                  the page tree
   *   3                  the font
   *   4 … 3+n            the page objects
   *   4+n … 3+2n         the content streams
   */
  const pageCount = pages.length;
  const firstPage = 4;
  const firstContent = firstPage + pageCount;

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${String(pageCount)} /Kids [${pages
      .map((_, i) => `${String(firstPage + i)} 0 R`)
      .join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    ...pages.map(
      (_, i) =>
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${String(PAGE.width)} ${String(PAGE.height)}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${String(firstContent + i)} 0 R >>`,
    ),
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

  objects.forEach((body, i) => {
    offsets.push(offset);
    push(latin1(`${String(i + 1)} 0 obj\n${body}\nendobj\n`));
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
function contentStream(page: readonly Line[]): string {
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
        `${pdfString(line.text)} Tj`,
        'ET',
      );
    y -= LINE;
  }

  return `${operators.join('\n')}\n`;
}
