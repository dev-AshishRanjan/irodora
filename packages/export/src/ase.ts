/**
 * Adobe Swatch Exchange (FR-51, F-056).
 *
 * ## The format, in the shape this file writes it
 *
 * Big-endian throughout. A file is a twelve-byte header and then a run of blocks:
 *
 * ```
 * "ASEF"            4 bytes, the signature
 * 0001 0000         major 1, minor 0
 * N                 uint32, the number of blocks that follow
 *
 * block:  type      uint16 — c001 group open, c002 group close, 0001 a colour
 *         length    uint32 — bytes of the block body, NOT counting these six
 *         body
 * ```
 *
 * A colour body is a UTF-16BE name with a length prefix in **characters including the
 * terminator**, then a four-character colour space, then its components as big-endian floats,
 * then a uint16 colour type. A group-open body is just the name; a group-close body is empty.
 *
 * ## Why the components are written in RGB
 *
 * `RGB ` is the space every consumer reads, and the values are the subject's own published hex
 * — the rendering, not the measurement. **Lab would be the more faithful answer and is the
 * wrong one here**: ASE's `LAB ` components are not universally agreed on (the L range differs
 * between writers), so a file that is more accurate in principle is one that opens wrong in
 * practice. The Lab values are in the CSV and the JSON, where nobody has to guess.
 *
 * ## The reader exists to check the writer, and is not the acceptance criterion
 *
 * Criterion 3 is *"ASE round-trips through Adobe tooling"* — Adobe's, which this repository
 * does not have and CI cannot install. It stays **attested** and outstanding. What the reader
 * buys is the half that can fail here: write → read → write is byte-identical, which catches a
 * length written from the wrong offset, a name terminator dropped, or a block count that
 * disagrees with the blocks. **If the two ever disagree, the writer is the one that must be
 * right** — the format is Adobe's, not ours, and the test therefore also checks the writer
 * against a hand-built fixture of known bytes rather than only against its own reader.
 */

import { concat } from './utf8.js';
import {
  assertSubject,
  ExportError,
  filenameFor,
  type ExportFile,
  type ExportSubject,
} from './subject.js';

const SIGNATURE = [0x41, 0x53, 0x45, 0x46] as const; // "ASEF"

/** Block types, from the format. */
export const ASE_BLOCK = {
  groupOpen: 0xc001,
  groupClose: 0xc002,
  colour: 0x0001,
} as const;

/** Colour types, from the format. `global` is the one a swatch panel shows as a shared colour. */
export const ASE_COLOUR_TYPE = { global: 0, spot: 1, normal: 2 } as const;

const u16 = (value: number): Uint8Array => Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);

const u32 = (value: number): Uint8Array =>
  Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);

/** IEEE-754 single precision, big-endian. `DataView` is ES, not a platform API. */
function f32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setFloat32(0, value, false);
  return out;
}

/**
 * A name as ASE writes one: UTF-16BE, NUL-terminated, length prefixed **in characters**.
 *
 * The count includes the terminator. Getting that wrong produces a file that opens with the
 * last letter of every name missing — which looks like a font problem rather than a writer bug,
 * and is the reason this is one function rather than inline in two places.
 */
function aseName(name: string): Uint8Array {
  const units: number[] = [];
  for (let i = 0; i < name.length; i += 1) {
    const code = name.charCodeAt(i);
    units.push((code >> 8) & 0xff, code & 0xff);
  }
  units.push(0, 0);
  return concat([u16(units.length / 2), Uint8Array.from(units)]);
}

const block = (type: number, body: Uint8Array): Uint8Array =>
  concat([u16(type), u32(body.length), body]);

/** `#RRGGBB` to three floats in [0,1]. The only place this file reads a hex. */
function channels(hex: string): readonly [number, number, number] {
  const raw = hex.trim().replace(/^#/u, '');
  if (!/^[0-9a-fA-F]{6}$/u.test(raw))
    throw new ExportError(`ASE needs a #RRGGBB hex; got ${JSON.stringify(hex)}`);
  return [
    parseInt(raw.slice(0, 2), 16) / 255,
    parseInt(raw.slice(2, 4), 16) / 255,
    parseInt(raw.slice(4, 6), 16) / 255,
  ];
}

/**
 * The subject as an `.ase` file.
 *
 * **The envelope is the group name**, because ASE has nowhere else to put it: there is no
 * metadata block, and a comment does not exist in the format. A group called
 * `Palette — irodora engine 0.1.0 corpus 2026.08.1` is the versions surviving the export, which
 * is criterion 2, and it is what a swatch panel shows above the colours.
 */
export function toAse(subject: ExportSubject): ExportFile {
  assertSubject(subject);

  const groupName = `${subject.title} — irodora engine ${subject.envelope.engine} corpus ${subject.envelope.corpus}`;

  const blocks: Uint8Array[] = [block(ASE_BLOCK.groupOpen, aseName(groupName))];
  for (const colour of subject.colours) {
    const [r, g, b] = channels(colour.hex);
    blocks.push(
      block(
        ASE_BLOCK.colour,
        concat([
          aseName(colour.name),
          Uint8Array.from([0x52, 0x47, 0x42, 0x20]), // "RGB "
          f32(r),
          f32(g),
          f32(b),
          u16(ASE_COLOUR_TYPE.global),
        ]),
      ),
    );
  }
  blocks.push(block(ASE_BLOCK.groupClose, new Uint8Array(0)));

  return {
    filename: filenameFor(subject.title, 'ase'),
    mediaType: 'application/octet-stream',
    bytes: concat([Uint8Array.from(SIGNATURE), u16(1), u16(0), u32(blocks.length), ...blocks]),
  };
}

/* ------------------------------------------------------------------ the reader, for the test */

export interface AseColour {
  readonly name: string;
  readonly space: string;
  readonly components: readonly number[];
  readonly colourType: number;
}

export interface AseFile {
  readonly major: number;
  readonly minor: number;
  readonly groupName: string | null;
  readonly colours: readonly AseColour[];
}

/**
 * Read an `.ase` back.
 *
 * Deliberately strict: a truncated block, a bad signature or a block count that does not match
 * the blocks is an error rather than a shorter list. A lenient reader would make the round-trip
 * test pass over a file Adobe would refuse, which is the one thing this reader must not do.
 */
export function parseAse(bytes: Uint8Array): AseFile {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 12) throw new ExportError('ASE: shorter than its own header');
  for (let i = 0; i < 4; i += 1)
    if (bytes[i] !== SIGNATURE[i]) throw new ExportError('ASE: signature is not ASEF');

  const major = view.getUint16(4, false);
  const minor = view.getUint16(6, false);
  const count = view.getUint32(8, false);

  let offset = 12;
  let groupName: string | null = null;
  const colours: AseColour[] = [];

  for (let i = 0; i < count; i += 1) {
    if (offset + 6 > bytes.length)
      throw new ExportError(`ASE: block ${String(i)} runs past the end`);
    const type = view.getUint16(offset, false);
    const length = view.getUint32(offset + 2, false);
    const body = offset + 6;
    if (body + length > bytes.length)
      throw new ExportError(
        `ASE: block ${String(i)} claims ${String(length)} bytes it does not have`,
      );

    if (type === ASE_BLOCK.groupOpen) {
      groupName = readName(view, body).name;
    } else if (type === ASE_BLOCK.colour) {
      const { name, next } = readName(view, body);
      let cursor = next;
      let space = '';
      for (let c = 0; c < 4; c += 1) space += String.fromCharCode(view.getUint8(cursor + c));
      cursor += 4;
      // The component count is the space's, and it is what a lenient reader guesses at.
      const componentCount = space === 'CMYK' ? 4 : space === 'GRAY' ? 1 : 3;
      const components: number[] = [];
      for (let c = 0; c < componentCount; c += 1) {
        components.push(view.getFloat32(cursor, false));
        cursor += 4;
      }
      colours.push({ name, space, components, colourType: view.getUint16(cursor, false) });
    }

    offset = body + length;
  }

  if (offset !== bytes.length)
    throw new ExportError(
      `ASE: ${String(bytes.length - offset)} trailing byte(s) after ${String(count)} block(s)`,
    );

  return { major, minor, groupName, colours };
}

/** A length-prefixed UTF-16BE name, and where it ends. The terminator is dropped. */
function readName(view: DataView, at: number): { readonly name: string; readonly next: number } {
  const units = view.getUint16(at, false);
  let name = '';
  // `units - 1` drops the NUL the writer appended and the count includes.
  for (let i = 0; i < units - 1; i += 1)
    name += String.fromCharCode(view.getUint16(at + 2 + i * 2, false));
  return { name, next: at + 2 + units * 2 };
}
