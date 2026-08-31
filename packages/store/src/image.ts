/**
 * The gate every wardrobe photograph passes through, and the type that proves it did.
 *
 * F-042 criterion 4 — *"EXIF stripped on ingest; images decoded only in the worker under hard
 * limits"*.
 *
 * ## The word "worker" names something this product does not have
 *
 * [ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
 * retired the server tier. `.harness/rules/security/security.md` still describes the old one —
 * *"never in the API process"*, *"the worker runs non-root, read-only filesystem, no network
 * egress"* — and none of that exists on a phone. The criterion was written before the rehaul.
 *
 * What survives the rehaul is the **reason** for it: hostile bytes must not reach a decoder
 * unbounded, because a decoder bomb is a few kilobytes that expands into gigabytes. On a
 * server you contain that with a process. Here there is no process to spend, so the containment
 * has to happen *before* the decode instead of around it — every limit below is enforced by
 * reading the header, and this module never decodes anything.
 *
 * ## The type is the enforcement
 *
 * `putGarmentImage` accepts only a `SanitisedImage`, and nothing outside this file can make
 * one. So "the EXIF was stripped" is not a convention a caller has to remember — an
 * un-ingested buffer does not type-check at the call site. Same move as `LensReading` in
 * F-040, where the type has no field a frame could be assigned to.
 *
 * ## What is deliberately KEPT, and it matters more here than in most products
 *
 * **The ICC profile.** JPEG `APP2` and PNG `iCCP` describe how the file's numbers map to
 * colour, and this is a product whose entire claim is about colour being handled honestly.
 * Stripping the profile would silently reinterpret every pixel as sRGB — a garment
 * photographed in Display P3 would come back more muted, with nothing anywhere to say why.
 * A "strip all metadata" implementation is the obvious one and it is wrong here.
 *
 * What goes: `APP1` (EXIF and XMP — GPS lives here, and a wardrobe photo taken at home
 * carries a home address), `APP13` (IPTC), `COM`, and PNG's `eXIf`, `tEXt`, `zTXt`, `iTXt`
 * and `tIME`.
 */

/** Refused input. Its own class so a caller can tell a hostile file from a bug. */
export class ImageRejected extends Error {}

declare const sanitised: unique symbol;

/**
 * Bytes that have passed every check in this file.
 *
 * The brand is not decoration: without it `putGarmentImage(bytes)` accepts any buffer, and
 * the one call site that forgets to ingest first is invisible to every test that only exercises
 * the call sites that remember.
 */
export interface SanitisedImage {
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly format: 'jpeg' | 'png';
  readonly [sanitised]: true;
}

export interface ImageLimits {
  /** Bytes. Checked FIRST, because every other check reads the buffer. */
  readonly maxBytes: number;
  /** Width × height, from the header. The bound that a decoder bomb is actually about. */
  readonly maxPixels: number;
}

/**
 * The defaults, with the reasoning rather than a round number.
 *
 * `maxBytes` 12 MiB: a 12-megapixel phone JPEG at high quality is 4–6 MB, and a modern
 * 48-megapixel one can reach 10. The cap is meant to refuse a file nobody's camera produced,
 * not to second-guess a good camera.
 *
 * `maxPixels` 50 million: above any phone sensor and far below the point where a decode is a
 * problem. A 30000 × 30000 PNG is 6 KB compressed and 3.6 GB decoded — that is the attack, and
 * it is why this bound is on the DIMENSIONS and not on the file size.
 */
export const DEFAULT_IMAGE_LIMITS: ImageLimits = {
  maxBytes: 12 * 1024 * 1024,
  maxPixels: 50_000_000,
};

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (bytes: Uint8Array, magic: readonly number[]): boolean =>
  magic.length <= bytes.length && magic.every((b, i) => bytes[i] === b);

/**
 * JPEG segments to drop.
 *
 * `APP2` (0xE2) is ABSENT ON PURPOSE — see the header. So is `APP0` (0xE0, JFIF), which some
 * decoders expect to lead the file.
 */
const JPEG_DROP = new Set([
  0xe1, // APP1 — EXIF and XMP. The GPS tags are here.
  0xe3, // APP3 — Meta / camera maker records.
  0xed, // APP13 — Photoshop IRB, which carries IPTC.
  0xfe, // COM — a free-text comment, which is wherever a tool decided to put anything.
]);

/** PNG chunks to drop. `iCCP`, `gAMA`, `cHRM` and `sRGB` are absent on purpose. */
const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

const u16 = (b: Uint8Array, at: number): number => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);
const u32 = (b: Uint8Array, at: number): number =>
  (((b[at] ?? 0) << 24) | ((b[at + 1] ?? 0) << 16) | ((b[at + 2] ?? 0) << 8) | (b[at + 3] ?? 0)) >>>
  0;

/**
 * Walk a JPEG's segments once: drop what should go, and read the dimensions from the SOF.
 *
 * One pass rather than two because the walk is the risky part — a length field that runs past
 * the end of the buffer is exactly what a malformed file has, and doing it twice doubles the
 * places that has to be handled correctly.
 */
function readJpeg(bytes: Uint8Array): { kept: Uint8Array; width: number; height: number } {
  const out: number[] = [0xff, 0xd8];
  let width = 0;
  let height = 0;
  let at = 2;

  while (at < bytes.length) {
    if (bytes[at] !== 0xff)
      throw new ImageRejected(
        `Malformed JPEG: expected a marker at byte ${String(at)}. A file whose segment lengths ` +
          'do not line up is not a file this can safely hand to a decoder.',
      );

    const marker = bytes[at + 1] ?? 0;

    // SOS: entropy-coded data runs to the end. Copy the remainder verbatim — scanning it for
    // markers would find them in the compressed data, which is how a naive parser corrupts an
    // image it was only supposed to inspect.
    if (marker === 0xda) {
      for (let i = at; i < bytes.length; i += 1) out.push(bytes[i] ?? 0);
      break;
    }

    // Standalone markers: no length field follows.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(0xff, marker);
      at += 2;
      continue;
    }

    const length = u16(bytes, at + 2);
    if (length < 2 || at + 2 + length > bytes.length)
      throw new ImageRejected(
        `Malformed JPEG: segment at byte ${String(at)} declares ${String(length)} bytes and the ` +
          'buffer ends first.',
      );

    // SOF0–SOF15 carry the dimensions. C4 (DHT), C8 (JPG) and CC (DAC) sit in the range and
    // are not frame headers — reading dimensions out of a Huffman table would produce a
    // plausible number rather than an error, which is the worst available outcome.
    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameHeader && width === 0) {
      height = u16(bytes, at + 5);
      width = u16(bytes, at + 7);
    }

    if (!JPEG_DROP.has(marker)) {
      for (let i = at; i < at + 2 + length; i += 1) out.push(bytes[i] ?? 0);
    }
    at += 2 + length;
  }

  if (width === 0 || height === 0)
    throw new ImageRejected('Malformed JPEG: no frame header, so the image has no dimensions.');

  return { kept: Uint8Array.from(out), width, height };
}

/** The same walk for PNG, over length-prefixed chunks. */
function readPng(bytes: Uint8Array): { kept: Uint8Array; width: number; height: number } {
  const out: number[] = [...PNG_MAGIC];
  let width = 0;
  let height = 0;
  let at = 8;

  while (at + 8 <= bytes.length) {
    const length = u32(bytes, at);
    const type = String.fromCharCode(
      bytes[at + 4] ?? 0,
      bytes[at + 5] ?? 0,
      bytes[at + 6] ?? 0,
      bytes[at + 7] ?? 0,
    );
    const end = at + 12 + length;
    if (length < 0 || end > bytes.length)
      throw new ImageRejected(
        `Malformed PNG: chunk "${type}" declares ${String(length)} bytes and the buffer ends first.`,
      );

    if (type === 'IHDR') {
      width = u32(bytes, at + 8);
      height = u32(bytes, at + 12);
    }

    if (!PNG_DROP.has(type)) {
      for (let i = at; i < end; i += 1) out.push(bytes[i] ?? 0);
    }

    at = end;
    if (type === 'IEND') break;
  }

  if (width === 0 || height === 0)
    throw new ImageRejected('Malformed PNG: no IHDR, so the image has no dimensions.');

  return { kept: Uint8Array.from(out), width, height };
}

/**
 * The only way to make a `SanitisedImage`.
 *
 * Order matters and is not incidental: **bytes, then type, then dimensions**. The size cap is
 * first because every check after it walks the buffer; the type comes from the magic bytes and
 * never from a filename, because an extension is a claim by whoever produced the file; and the
 * pixel bound is read from the header, so a decoder bomb is refused having never been decoded.
 */
export function ingestImage(
  bytes: Uint8Array,
  limits: ImageLimits = DEFAULT_IMAGE_LIMITS,
): SanitisedImage {
  if (bytes.length === 0) throw new ImageRejected('Empty file.');
  if (bytes.length > limits.maxBytes)
    throw new ImageRejected(
      `${String(bytes.length)} bytes exceeds the ${String(limits.maxBytes)}-byte limit.`,
    );

  // BY MAGIC BYTES, never by extension or a supplied content type. A PNG named .jpg is the
  // benign version; the hostile one is a file that is neither, named as though it were.
  const format = startsWith(bytes, JPEG_MAGIC)
    ? 'jpeg'
    : startsWith(bytes, PNG_MAGIC)
      ? 'png'
      : null;
  if (format === null)
    throw new ImageRejected(
      'Not a JPEG or a PNG. The type is read from the file, so a renamed extension does not ' +
        'change the answer.',
    );

  const { kept, width, height } = format === 'jpeg' ? readJpeg(bytes) : readPng(bytes);

  // AFTER the header walk and BEFORE anything decodes: this is the bound a decoder bomb is
  // actually about. A 30000 x 30000 PNG passes the byte cap comfortably.
  if (width * height > limits.maxPixels)
    throw new ImageRejected(
      `${String(width)}x${String(height)} is ${String(width * height)} pixels, over the ` +
        `${String(limits.maxPixels)} limit. Refused before any decode.`,
    );

  return { bytes: kept, width, height, format } as SanitisedImage;
}
