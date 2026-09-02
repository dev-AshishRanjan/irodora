/**
 * The four text formats: CSV, JSON, CSS custom properties, design tokens (FR-51, F-056).
 *
 * ## Every one of them embeds the envelope, in the shape its own readers expect
 *
 * Criterion 2 is *"every export embeds the engine and corpus versions"*, and the shape differs
 * per format because a consumer differs per format: a CSV reader tolerates a leading comment
 * line, a JSON consumer walks keys, a stylesheet has custom properties of its own, and a
 * design-token tool walks a tree it expects to contain only tokens.
 *
 * `envelopeFields` is the one definition of *what* is embedded, so four writers cannot drift
 * about which versions count.
 *
 * ## The CSV quoting rule is RFC 4180's, and it is the half that gets skipped
 *
 * A field containing a comma, a quote or a newline must be quoted, and an embedded quote is
 * doubled. A writer that quotes everything is also valid and is worse to read; a writer that
 * quotes nothing works until the first colour called `Red, deep` and then silently shifts every
 * column after it. The test contains exactly that name.
 */

import {
  envelopeFields,
  filenameFor,
  utf8,
  assertSubject,
  type ExportFile,
  type ExportSubject,
} from './subject.js';

/** RFC 4180: quote when the value contains a delimiter, a quote or a line break. */
function csvField(value: string): string {
  if (!/[",\r\n]/u.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

const row = (fields: readonly string[]): string => fields.map(csvField).join(',');

/** Six decimals everywhere a coordinate is written. Enough for Lab; short enough to read. */
const num = (n: number): string => n.toFixed(6);

/**
 * CSV (FR-51).
 *
 * The envelope is a **leading comment line** rather than extra columns: a column per version
 * repeated on every row is the shape that makes somebody delete it before opening the file,
 * and then the versions are gone. `#` is what spreadsheet importers and `csv` libraries treat
 * as a comment, and a reader that does not is one line away from being told to skip a row.
 */
export function toCsv(subject: ExportSubject): ExportFile {
  assertSubject(subject);
  const versions = envelopeFields(subject.envelope)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  const lines = [
    `# irodora ${versions}`,
    `# title=${subject.title.replaceAll(/[\r\n]+/gu, ' ')}`,
    row([
      'id',
      'name',
      'hex',
      'lab_l',
      'lab_a',
      'lab_b',
      'lch_l',
      'lch_c',
      'lch_h',
      'oklch_l',
      'oklch_c',
      'oklch_h',
      'source',
    ]),
    ...subject.colours.map((c) =>
      row([
        c.id,
        c.name,
        c.hex,
        ...c.lab.map(num),
        ...c.lch.map(num),
        ...c.oklch.map(num),
        c.source,
      ]),
    ),
  ];

  if (subject.deltas !== undefined && subject.deltas.length > 0) {
    lines.push('', row(['from_id', 'to_id', 'delta_e00_cielab_d65']));
    for (const d of subject.deltas) lines.push(row([d.fromId, d.toId, num(d.deltaE00)]));
  }

  return {
    filename: filenameFor(subject.title, 'csv'),
    mediaType: 'text/csv;charset=utf-8',
    // A trailing newline: a file whose last line has no terminator is the one that concatenates
    // wrongly, and every tool that appends to a CSV assumes it.
    bytes: utf8(`${lines.join('\r\n')}\r\n`),
  };
}

/**
 * JSON (FR-51).
 *
 * **Key order is written explicitly**, not left to object literal order, for the reason
 * `serialiseEnvelope` gives: this string is compared byte for byte, and two code paths building
 * the same object can trivially disagree about insertion order.
 */
export function toJson(subject: ExportSubject): ExportFile {
  assertSubject(subject);
  const document = {
    $irodora: Object.fromEntries(envelopeFields(subject.envelope)),
    title: subject.title,
    colours: subject.colours.map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      lab: c.lab,
      lch: c.lch,
      oklch: c.oklch,
      source: c.source,
      space: 'CIELAB (D65) for lab and lch; OKLCh for oklch',
    })),
    ...(subject.deltas === undefined || subject.deltas.length === 0
      ? {}
      : {
          deltas: subject.deltas.map((d) => ({
            fromId: d.fromId,
            toId: d.toId,
            deltaE00: d.deltaE00,
            space: 'CIELAB (D65)',
          })),
        }),
  };

  return {
    filename: filenameFor(subject.title, 'json'),
    mediaType: 'application/json;charset=utf-8',
    bytes: utf8(`${JSON.stringify(document, null, 2)}\n`),
  };
}

/**
 * A CSS custom property name from an id.
 *
 * Idents may not start with a digit and may not contain arbitrary punctuation. A slug that
 * reduces to nothing gets its index instead of an empty name — `--irodora-` is a property no
 * stylesheet can use and no error would say why.
 */
function cssIdent(id: string, index: number): string {
  const cleaned = id
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase();
  const safe =
    cleaned === '' || /^\d/u.test(cleaned) ? `c${String(index + 1)}-${cleaned}` : cleaned;
  return `--irodora-${safe.replace(/-+$/u, '')}`;
}

/**
 * CSS custom properties (FR-51).
 *
 * **Hex, not `lab()` or `oklch()`.** [ADR-0063](../../../docs/adr/0063-culori-ships-in-the-app-bundle-and-the-generated-stylesheet-emits-hex-only.md)
 * settled that for the generated stylesheet and the reason carries: a browser that does not
 * support the function renders nothing, and a colour that fails to render is worse than one
 * rendered in the gamut everything supports. The Lab values are in the comment beside each
 * property, so nothing is lost to a reader — only to the cascade.
 *
 * The versions are **both** a comment and custom properties: a comment survives being read by a
 * person and a property survives being read by a build step, and neither survives both.
 */
export function toCss(subject: ExportSubject): ExportFile {
  assertSubject(subject);
  const versions = envelopeFields(subject.envelope);

  const lines = [
    '/*',
    ` * ${subject.title.replaceAll('*/', '* /')}`,
    ' *',
    ' * Generated by Irodora. Every value below is the published rendering of a colour whose',
    ' * Lab is in the comment beside it; the versions that produced them are properties too, so',
    ' * a build step can read what a person can.',
    ...versions.map(([key, value]) => ` * ${key}: ${value}`),
    ' */',
    ':root {',
    ...versions.map(([key, value]) => `  --irodora-version-${key}: '${value}';`),
    ...subject.colours.map(
      (c, i) =>
        `  ${cssIdent(c.id, i)}: ${c.hex}; /* ${c.name} — CIELAB (D65) ${c.lab.map(num).join(' ')} */`,
    ),
    '}',
  ];

  return {
    filename: filenameFor(subject.title, 'css'),
    mediaType: 'text/css;charset=utf-8',
    bytes: utf8(`${lines.join('\n')}\n`),
  };
}

/**
 * Design tokens (FR-51), in the W3C draft shape.
 *
 * `{ "$value": "#RRGGBB", "$type": "color" }` is what the tools that consume this read. The
 * version block sits under `$irodora` at the top level, **outside the token tree** — a consumer
 * walking tokens must not find a version string where it expects a `$value`, which is exactly
 * the kind of thing that produces a colour called "engine".
 */
export function toDesignTokens(subject: ExportSubject): ExportFile {
  assertSubject(subject);

  const tokens: Record<string, unknown> = {};
  for (const colour of subject.colours) {
    tokens[colour.id] = {
      $value: colour.hex,
      $type: 'color',
      $description: `${colour.name} — CIELAB (D65) ${colour.lab.map(num).join(' ')} · source ${colour.source}`,
    };
  }

  const document = {
    $irodora: Object.fromEntries(envelopeFields(subject.envelope)),
    [tokenGroup(subject.title)]: tokens,
  };

  return {
    filename: filenameFor(subject.title, 'tokens.json'),
    mediaType: 'application/json;charset=utf-8',
    bytes: utf8(`${JSON.stringify(document, null, 2)}\n`),
  };
}

/**
 * The group the tokens sit under.
 *
 * A `$`-prefixed name is reserved by the specification for metadata, so a title beginning with
 * one would make the whole group invisible to a conforming consumer.
 */
function tokenGroup(title: string): string {
  const name = title.trim().replace(/^\$+/u, '');
  return name === '' ? 'irodora' : name;
}
