/**
 * The ingest gate: hard limits before any decode, and EXIF gone.
 *
 * ## The assertion that earns this file
 *
 * *"No EXIF in the output"* is satisfied perfectly by a function that returns an empty buffer,
 * by one that truncates at the first APP1, and by one that mangles the entropy-coded data. So
 * every stripping test here asserts **two** things: the metadata went, and the image is still
 * an image — magic bytes intact, dimensions unchanged, and the pixel data byte-identical to
 * what went in. A negative test needs a decoy, and here the decoy is the picture.
 *
 * The fixtures are built byte by byte rather than committed as binaries. A committed JPEG is a
 * file nobody can review in a diff, and the thing under test is precisely which bytes survive.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_IMAGE_LIMITS, ImageRejected, ingestImage } from '../src/image.js';

/* ------------------------------------------------------------------ fixtures, built by hand */

const be16 = (n: number): number[] => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];

/** A JPEG segment: marker, then a length that includes its own two bytes. */
const segment = (marker: number, body: number[]): number[] => [
  0xff,
  marker,
  ...be16(body.length + 2),
  ...body,
];

/** SOF0: precision, height, width, component count, then one component triple. */
const sof0 = (width: number, height: number): number[] =>
  segment(0xc0, [0x08, ...be16(height), ...be16(width), 0x01, 0x01, 0x11, 0x00]);

const EXIF_APP1 = segment(0xe1, [
  ...[0x45, 0x78, 0x69, 0x66, 0x00, 0x00], // "Exif\0\0"
  // Stand-ins for the GPS IFD. The point is that these bytes are identifiable in the output.
  0xde,
  0xad,
  0xbe,
  0xef,
]);

const ICC_APP2 = segment(0xe2, [
  ...[0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00], // "ICC_PROFILE\0"
  0x01,
  0x01,
]);

/** Entropy-coded data after SOS. Never scanned for markers, so it may contain marker bytes. */
const SCAN = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34, 0x56];

const jpeg = (parts: number[][] = [EXIF_APP1, ICC_APP2]): Uint8Array =>
  Uint8Array.from([0xff, 0xd8, ...parts.flat(), ...sof0(1200, 800), ...SCAN]);

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG chunk types are ASCII by specification, so an index loop is exact — and unlike
 * spreading a string it cannot be tripped by a surrogate pair. */
const ascii = (s: string): number[] => {
  const out: number[] = [];
  for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i));
  return out;
};

/** A PNG chunk. The CRC is not verified by the ingest, so four zero bytes stand in for it. */
const chunk = (type: string, body: number[]): number[] => [
  ...be32(body.length),
  ...ascii(type),
  ...body,
  0,
  0,
  0,
  0,
];

const ihdr = (width: number, height: number): number[] =>
  chunk('IHDR', [...be32(width), ...be32(height), 0x08, 0x02, 0x00, 0x00, 0x00]);

const png = (width = 1200, height = 800, extra: number[][] = []): Uint8Array =>
  Uint8Array.from([
    ...PNG_MAGIC,
    ...ihdr(width, height),
    ...extra.flat(),
    ...chunk('IDAT', [0x78, 0x9c, 0x63, 0x00]),
    ...chunk('IEND', []),
  ]);

const contains = (haystack: Uint8Array, needle: number[]): boolean => {
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
};

/* ---------------------------------------------------------------------------------- tests */

describe('the type check', () => {
  it('reads the format from the file, not from a name', () => {
    // The benign case. A PNG called "photo.jpg" is common and harmless; the hostile version is
    // a file that is neither, named as though it were, and both are refused the same way.
    expect(ingestImage(png()).format).toBe('png');
    expect(ingestImage(jpeg()).format).toBe('jpeg');
    expect(() => ingestImage(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toThrow(
      ImageRejected,
    );
  });

  it('refuses an empty file', () => {
    expect(() => ingestImage(new Uint8Array(0))).toThrow(ImageRejected);
  });
});

describe('the hard limits', () => {
  it('refuses a file over the byte cap', () => {
    expect(() => ingestImage(jpeg(), { maxBytes: 8, maxPixels: 50_000_000 })).toThrow(/exceeds/);
  });

  it('refuses a decoder bomb from the HEADER, having decoded nothing', () => {
    // THE CASE THE LIMIT EXISTS FOR. 30000 x 30000 is 3.6 GB decoded and a few hundred bytes
    // here — it passes the byte cap comfortably, which is exactly why the pixel bound is on the
    // dimensions and why it is read from the header rather than from a decode.
    const bomb = png(30_000, 30_000);
    expect(bomb.length).toBeLessThan(DEFAULT_IMAGE_LIMITS.maxBytes);
    expect(() => ingestImage(bomb)).toThrow(/before any decode/);
  });

  it('accepts a real phone-sized image', () => {
    // The decoy for the bound above: a cap that refused everything would pass that test too.
    const ok = ingestImage(png(4032, 3024));
    expect(ok.width * ok.height).toBeLessThan(DEFAULT_IMAGE_LIMITS.maxPixels);
  });

  it('refuses a segment length that runs past the end of the buffer', () => {
    const truncated = jpeg().slice(0, 12);
    expect(() => ingestImage(truncated)).toThrow(ImageRejected);
  });
});

describe('stripping a JPEG', () => {
  it('removes EXIF and leaves an image behind', () => {
    const input = jpeg();
    expect(contains(input, [0xde, 0xad, 0xbe, 0xef])).toBe(true);

    const out = ingestImage(input);

    // Half one: the GPS bytes are gone.
    expect(contains(out.bytes, [0xde, 0xad, 0xbe, 0xef])).toBe(false);
    expect(contains(out.bytes, [0x45, 0x78, 0x69, 0x66])).toBe(false);

    // Half two, and the half a truncating implementation fails: it is still a JPEG, the
    // dimensions are what they were, and the scan data survived byte for byte.
    expect([...out.bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(out.width).toBe(1200);
    expect(out.height).toBe(800);
    expect(contains(out.bytes, SCAN)).toBe(true);
    expect(out.bytes.length).toBeLessThan(input.length);
  });

  it('KEEPS the ICC profile, because this is a colour product', () => {
    // A "strip all metadata" implementation is the obvious one and it is wrong here: without
    // the profile a Display P3 photograph is silently reinterpreted as sRGB and comes back
    // muted, with nothing anywhere to say why.
    const out = ingestImage(jpeg());
    expect(contains(out.bytes, [0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f])).toBe(true);
  });

  it('does not mistake a Huffman table for a frame header', () => {
    // DHT is 0xC4 — inside the SOF0..SOF15 range and not a frame header. Reading dimensions
    // out of it would produce a plausible number instead of an error.
    const dht = segment(0xc4, [0x00, ...new Array<number>(16).fill(0), 0x01]);
    const out = ingestImage(jpeg([dht, EXIF_APP1]));
    expect(out.width).toBe(1200);
    expect(out.height).toBe(800);
  });
});

describe('stripping a PNG', () => {
  it('removes eXIf and the text chunks, and leaves the image data', () => {
    const exif = chunk('eXIf', [0xde, 0xad, 0xbe, 0xef]);
    const text = chunk('tEXt', [0x41, 0x42]);
    const icc = chunk('iCCP', [0x69, 0x63, 0x63, 0x00, 0x00, 0x78, 0x9c]);
    const input = png(1200, 800, [exif, text, icc]);

    const out = ingestImage(input);

    expect(contains(out.bytes, [0xde, 0xad, 0xbe, 0xef])).toBe(false);
    expect(contains(out.bytes, [0x74, 0x45, 0x58, 0x74])).toBe(false); // "tEXt"

    // Still a PNG, still the same picture, and the colour profile survived.
    expect([...out.bytes.slice(0, 8)]).toEqual(PNG_MAGIC);
    expect(contains(out.bytes, [0x69, 0x43, 0x43, 0x50])).toBe(true); // "iCCP"
    expect(contains(out.bytes, [0x78, 0x9c, 0x63, 0x00])).toBe(true); // IDAT payload
    expect(out.width).toBe(1200);
    expect(out.height).toBe(800);
  });

  it('leaves a clean file byte-identical', () => {
    // The control. A stripper that rewrote every file would pass every assertion above.
    const clean = png();
    expect([...ingestImage(clean).bytes]).toEqual([...clean]);
  });
});
