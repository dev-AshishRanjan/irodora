/**
 * Reading an export back (FR-28, F-129).
 *
 * > *A palette exported as design tokens or JSON can be imported back, and the round-trip is
 * > asserted.*
 *
 * ## Why this waited for the writers
 *
 * An importer written before its exporter has no format to agree with — it agrees with whatever
 * fixtures somebody hand-wrote, which is a different thing and a weaker one. F-056 built the
 * writers; this reads two of them back, and **the round trip is the assertion**: every writer's
 * own output, parsed and written again, is byte-identical.
 *
 * ## Two formats, and why not the other four
 *
 * `css` and `csv` are for other tools to read, not for this one to reconstruct a subject from —
 * neither carries the envelope in a machine-readable place. `ase` carries colours and no
 * provenance at all. `pdf` is a document. FR-28's clause names design tokens and JSON, and those
 * are the two that carry everything.
 *
 * ## Nothing is inferred
 *
 * A field that is absent is an error, never a default. A subject reconstructed with a guessed
 * envelope would carry versions nobody chose into a file somebody keeps, which is the failure
 * `ExportSubject.envelope` is required-on-the-type to prevent. Every refusal names the field.
 */

import { fromUtf8 } from './utf8.js';
import {
  assertSubject,
  ExportError,
  TOKEN_EXTENSION,
  type ExportColour,
  type ExportDelta,
  type ExportSubject,
} from './subject.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new ExportError(`${field} is missing or is not an object`);
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new ExportError(`${field} is missing or is not a string`);
  return value;
}

function requireNumber(value: unknown, field: string): number {
  // `Number.isFinite` rather than `typeof`: JSON can carry no NaN or Infinity, but a hand-edited
  // file can carry a string that looks like a number, and a coordinate that is not a number is
  // not a coordinate.
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new ExportError(`${field} is missing or is not a finite number`);
  return value;
}

function requireTriple(value: unknown, field: string): readonly [number, number, number] {
  if (!Array.isArray(value) || value.length !== 3)
    throw new ExportError(`${field} must be three numbers; got ${JSON.stringify(value)}`);
  return [
    requireNumber(value[0], `${field}[0]`),
    requireNumber(value[1], `${field}[1]`),
    requireNumber(value[2], `${field}[2]`),
  ];
}

/**
 * The envelope, from the `$irodora` block both formats carry.
 *
 * `profile` is genuinely optional — `envelopeFields` omits it when it is absent — so it is read
 * when present and left off when not. Everything else is required, and a missing one is an
 * error rather than an empty string.
 */
function envelopeOf(document: Record<string, unknown>): ExportSubject['envelope'] {
  const block = requireRecord(document['$irodora'], '$irodora');
  const profile = block['profile'];
  return {
    engine: requireString(block['engine'], '$irodora.engine'),
    corpus: requireString(block['corpus'], '$irodora.corpus'),
    rules: requireString(block['rules'], '$irodora.rules'),
    ...(profile === undefined ? {} : { profile: requireString(profile, '$irodora.profile') }),
  };
}

function parseJsonBytes(bytes: Uint8Array, format: string): Record<string, unknown> {
  let decoded: string;
  try {
    // `fromUtf8`, not `TextDecoder` — this package may not assume a WHATWG global, and the
    // hand-written one is STRICT, so a malformed file is refused here rather than becoming a
    // subject nobody wrote (see utf8.ts).
    decoded = fromUtf8(bytes);
  } catch (error) {
    throw new ExportError(
      `the ${format} file is not valid UTF-8: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch (error) {
    throw new ExportError(
      `the ${format} file is not valid JSON: ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
  return requireRecord(parsed, `the ${format} document`);
}

/** One colour from the JSON writer's `colours` array. */
function colourOf(value: unknown, at: number): ExportColour {
  const c = requireRecord(value, `colours[${String(at)}]`);
  return {
    id: requireString(c['id'], `colours[${String(at)}].id`),
    name: requireString(c['name'], `colours[${String(at)}].name`),
    hex: requireString(c['hex'], `colours[${String(at)}].hex`),
    lab: requireTriple(c['lab'], `colours[${String(at)}].lab`),
    lch: requireTriple(c['lch'], `colours[${String(at)}].lch`),
    oklch: requireTriple(c['oklch'], `colours[${String(at)}].oklch`),
    source: requireString(c['source'], `colours[${String(at)}].source`),
  };
}

function deltaOf(value: unknown, at: number): ExportDelta {
  const d = requireRecord(value, `deltas[${String(at)}]`);
  return {
    fromId: requireString(d['fromId'], `deltas[${String(at)}].fromId`),
    toId: requireString(d['toId'], `deltas[${String(at)}].toId`),
    deltaE00: requireNumber(d['deltaE00'], `deltas[${String(at)}].deltaE00`),
  };
}

/**
 * A subject from `toJson`'s output.
 *
 * `assertSubject` runs at the end, so an imported subject meets exactly the same conditions a
 * constructed one does — a file that parses into a shape the writers would refuse is refused
 * here instead, where the reason can still name the file.
 */
export function fromJson(bytes: Uint8Array): ExportSubject {
  const document = parseJsonBytes(bytes, 'JSON');
  const colours = document['colours'];
  if (!Array.isArray(colours)) throw new ExportError('colours is missing or is not an array');

  const deltas = document['deltas'];
  if (deltas !== undefined && !Array.isArray(deltas))
    throw new ExportError('deltas is present but is not an array');

  const subject: ExportSubject = {
    title: requireString(document['title'], 'title'),
    envelope: envelopeOf(document),
    colours: colours.map((c, i) => colourOf(c, i)),
    ...(deltas === undefined ? {} : { deltas: deltas.map((d, i) => deltaOf(d, i)) }),
  };

  assertSubject(subject);
  return subject;
}

/**
 * A subject from `toDesignTokens`' output.
 *
 * ## The `$description` is prose, and prose is not a field
 *
 * The token document shows a person the name, the CIELAB coordinates and the provenance in a
 * `$description` — a free-text field the specification defines as being for humans. Recovering a
 * subject by **parsing that sentence** would make the format's wording load-bearing, so a
 * reworded description would silently change what an import produces. It is the same mistake as
 * reading a mention as a reference (F-127), one format along.
 *
 * So the writer carries the structured values in **`$extensions`**, which is exactly what the
 * specification reserves for data a tool needs and other tools should ignore. The description
 * stays, unchanged, for the person reading the file.
 *
 * ## Order comes from the file
 *
 * `Object.keys` on a JSON object preserves insertion order for string keys, and the writer emits
 * the colours in the subject's order — so the palette comes back in the order it went out.
 * That is a property of `JSON.parse`, not a hope: numeric-looking keys would reorder, which is
 * why an id that is all digits is refused below rather than quietly moved.
 */
export function fromDesignTokens(bytes: Uint8Array): ExportSubject {
  const document = parseJsonBytes(bytes, 'design tokens');
  const envelope = envelopeOf(document);

  const groups = Object.entries(document).filter(([key]) => !key.startsWith('$'));
  const group = groups[0];
  if (group === undefined) throw new ExportError('the document has no token group');
  if (groups.length > 1)
    throw new ExportError(
      `the document has ${String(groups.length)} token groups; this writer emits exactly one, ` +
        'so a file with more than one was not written by it',
    );

  const [title, rawTokens] = group;
  const tokens = requireRecord(rawTokens, `the token group ${JSON.stringify(title)}`);

  const colours: ExportColour[] = [];
  for (const [id, rawToken] of Object.entries(tokens)) {
    const field = `${title}.${id}`;
    if (/^\d+$/u.test(id))
      throw new ExportError(
        `${field}: an all-digit token name would be reordered by JSON.parse, so the palette ` +
          'order could not be recovered. This writer does not emit one.',
      );
    const token = requireRecord(rawToken, field);
    const extensions = requireRecord(token['$extensions'], `${field}.$extensions`);
    const mine = requireRecord(
      extensions[TOKEN_EXTENSION],
      `${field}.$extensions.${TOKEN_EXTENSION}`,
    );
    colours.push({
      id,
      name: requireString(mine['name'], `${field}.name`),
      hex: requireString(token['$value'], `${field}.$value`),
      lab: requireTriple(mine['lab'], `${field}.lab`),
      lch: requireTriple(mine['lch'], `${field}.lch`),
      oklch: requireTriple(mine['oklch'], `${field}.oklch`),
      source: requireString(mine['source'], `${field}.source`),
    });
  }

  const subject: ExportSubject = { title, envelope, colours };
  assertSubject(subject);
  return subject;
}
