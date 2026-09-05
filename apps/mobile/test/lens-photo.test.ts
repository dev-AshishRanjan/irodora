/**
 * Reading a colour out of a photograph.
 *
 * ## The PNG fixture is built by hand, and that is the point
 *
 * A test that encodes with a library and decodes with the same library proves the library agrees
 * with itself. `pngBytes` below writes the file **byte by byte** — signature, IHDR, an IDAT whose
 * zlib stream uses only *stored* (uncompressed) deflate blocks, IEND — with the CRC32 and Adler32
 * computed here. No encoder is involved, so the chunk walk, the filter handling and `fflate`'s
 * inflate all have to agree with a file whose every byte is stated in this file.
 *
 * That matters more here than it usually would, because **the PNG reader is ours** (ADR-0092):
 * only the inflate is a library. A round-trip fixture would have been the reader agreeing with
 * itself, which is no check at all.
 *
 * Stored blocks are what makes it feasible: deflate's `BTYPE=00` is a length, its complement, and
 * the literal bytes. Writing a Huffman encoder to test a decoder would be the same mistake one
 * level down.
 *
 * ## The JPEG fixture cannot be, and the test says what it is worth
 *
 * There is no hand-writable JPEG. What is asserted instead is that a solid colour survives an
 * encode and a decode within two units a channel — and encode and decode are different code
 * paths, so a wrong IDCT scale, a wrong upsample or a wrong colour matrix would move it well
 * past that. It is **not** a check against an independent implementation, and nothing here
 * pretends otherwise.
 */

import { encode as encodeJpeg } from 'jpeg-js';
import {
  decodePhoto,
  openPhoto,
  PHOTO_LIMITS,
  PHOTO_REGION_FRACTION,
  PhotoUnreadable,
  pointFrom,
  readPhoto,
  reticleBox,
  sampleAt,
  type DecodedPhoto,
} from '../src/lens/photo';
import { ingestImage, ImageRejected } from '@irodora/store';
import { SPACE_CONFIDENCE_CEILING } from '../src/lens/reading';
import { MAX_SAMPLES_PER_FRAME } from '../src/lens/camera';

/* ------------------------------------------------------------------ a PNG, by hand */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: readonly number[]): number => {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const adler32 = (bytes: readonly number[]): number => {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

const u32be = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];

const chunk = (type: string, data: readonly number[]): number[] => {
  // Indexed rather than spread: a chunk type is four ASCII letters, and spreading a string
  // yields code POINTS, which lint refuses for the good general reason that it decomposes
  // anything richer. `charCodeAt` per index is what a byte-level format wants anyway.
  const typed: number[] = [];
  for (let i = 0; i < type.length; i += 1) typed.push(type.charCodeAt(i));
  const body = [...typed, ...data];
  return [...u32be(data.length), ...body, ...u32be(crc32(body))];
};

/**
 * A truecolour-with-alpha PNG, written out.
 *
 * `rgba(x, y)` supplies each pixel. Filter type 0 (None) leads every scanline, so the IDAT's
 * uncompressed payload is exactly the pixels with one zero byte per row — nothing to undo, and
 * nothing a filter bug could hide in.
 */
function pngBytes(
  width: number,
  height: number,
  rgba: (x: number, y: number) => readonly [number, number, number, number],
): Uint8Array {
  const raw: number[] = [];
  for (let y = 0; y < height; y += 1) {
    raw.push(0); // filter: None
    for (let x = 0; x < width; x += 1) raw.push(...rgba(x, y));
  }

  // zlib: CMF/FLG, then one FINAL stored deflate block, then Adler32 of the raw data.
  const stored = [
    0x78,
    0x01,
    0x01,
    raw.length & 0xff,
    (raw.length >>> 8) & 0xff,
    ~raw.length & 0xff,
    (~raw.length >>> 8) & 0xff,
    ...raw,
    ...u32be(adler32(raw)),
  ];

  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    // IHDR: width, height, bit depth 8, colour type 6 (RGBA), deflate, adaptive filter, no
    // interlace.
    ...chunk('IHDR', [...u32be(width), ...u32be(height), 8, 6, 0, 0, 0]),
    ...chunk('IDAT', stored),
    ...chunk('IEND', []),
  ]);
}

/* --------------------------------------------------------------------- fixtures */

/** Four quadrants, four colours. The fixture the geometry is checked against. */
const QUADRANTS = [
  [200, 40, 40, 255], // top-left, red
  [40, 160, 60, 255], // top-right, green
  [50, 70, 190, 255], // bottom-left, blue
  [220, 210, 60, 255], // bottom-right, yellow
] as const;

const quadrantAt = (
  x: number,
  y: number,
  size: number,
): readonly [number, number, number, number] =>
  QUADRANTS[(y < size / 2 ? 0 : 2) + (x < size / 2 ? 0 : 1)] ?? QUADRANTS[0];

const QUAD_SIZE = 64;
const quadrantPng = pngBytes(QUAD_SIZE, QUAD_SIZE, (x, y) => quadrantAt(x, y, QUAD_SIZE));

/** A solid JPEG at maximum quality. */
const solidJpeg = (r: number, g: number, b: number, size = 64): Uint8Array => {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  const encoded = encodeJpeg({ data, width: size, height: size }, 100);
  return new Uint8Array(encoded.data);
};

const open = (bytes: Uint8Array): DecodedPhoto => openPhoto(bytes).photo;

/* ------------------------------------------------------------------------ tests */

describe('a PNG decodes to the bytes that were written', () => {
  it('reproduces a hand-built file exactly', () => {
    /*
     * THE ONE INDEPENDENT ASSERTION IN THIS FILE. Every byte of the input is stated above, so
     * this compares a third-party decoder against a file nothing third-party produced. A decoder
     * that mis-read the stride, the filter byte or the channel order would fail here and pass
     * every round-trip test ever written.
     */
    const photo = open(quadrantPng);
    expect(photo.width).toBe(QUAD_SIZE);
    expect(photo.height).toBe(QUAD_SIZE);

    for (const [x, y] of [
      [0, 0],
      [QUAD_SIZE - 1, 0],
      [0, QUAD_SIZE - 1],
      [QUAD_SIZE - 1, QUAD_SIZE - 1],
      [17, 41],
    ] as const) {
      const at = (y * QUAD_SIZE + x) * 4;
      expect([
        photo.pixels[at],
        photo.pixels[at + 1],
        photo.pixels[at + 2],
        photo.pixels[at + 3],
      ]).toEqual([...quadrantAt(x, y, QUAD_SIZE)]);
    }
  });

  it('keeps alpha rather than flattening it, so the engine can reject transparent pixels', () => {
    // FR-15 rejects transparent pixels, and it cannot if the alpha never reaches it.
    const clear = pngBytes(8, 8, () => [255, 255, 255, 0]);
    const photo = open(clear);
    expect(photo.pixels[3]).toBe(0);
  });

  it('reads greyscale by putting one value in three channels', () => {
    // Colour type 0 is one channel. Written by hand again, with a different IHDR.
    const raw: number[] = [];
    for (let y = 0; y < 4; y += 1) {
      raw.push(0);
      for (let x = 0; x < 4; x += 1) raw.push(120);
    }
    const grey = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...chunk('IHDR', [...u32be(4), ...u32be(4), 8, 0, 0, 0, 0]),
      ...chunk('IDAT', [
        0x78,
        0x01,
        0x01,
        raw.length & 0xff,
        (raw.length >>> 8) & 0xff,
        ~raw.length & 0xff,
        (~raw.length >>> 8) & 0xff,
        ...raw,
        ...u32be(adler32(raw)),
      ]),
      ...chunk('IEND', []),
    ]);
    const photo = open(grey);
    expect([photo.pixels[0], photo.pixels[1], photo.pixels[2], photo.pixels[3]]).toEqual([
      120, 120, 120, 255,
    ]);
  });
});

describe('a JPEG survives a round trip', () => {
  /**
   * The tolerance, and why it is 2 rather than 0.
   *
   * **JPEG is lossy in the colour transform even at quality 100.** RGB goes to YCbCr, is stored
   * at eight bits, and comes back through the inverse matrix — and the two roundings do not
   * cancel. The first run of this measured 178 for an input of 180, which is that, not a defect:
   * quality controls the quantisation of the DCT coefficients and has no say over the colour
   * conversion either side of it.
   *
   * It is stated as a number here rather than loosened until green. A tolerance nobody can
   * explain is a tolerance that will be widened again the next time something moves.
   */
  const JPEG_ROUND_TRIP = 2;

  it('reads a solid colour back within two units a channel', () => {
    /*
     * Worth what it is worth, and no more — see this file's header. Encode and decode are
     * different code paths, so a wrong IDCT scale or a wrong YCbCr matrix moves this well past
     * the tolerance; a decoder that agreed with a wrong encoder would not be caught by it.
     */
    const photo = open(solidJpeg(180, 90, 60));
    const at = (32 * photo.width + 32) * 4;
    for (const [channel, expected] of [
      [0, 180],
      [1, 90],
      [2, 60],
    ] as const)
      expect(photo.pixels[at + channel] ?? 0).toBeGreaterThanOrEqual(expected - JPEG_ROUND_TRIP);
    for (const [channel, expected] of [
      [0, 180],
      [1, 90],
      [2, 60],
    ] as const)
      expect(photo.pixels[at + channel] ?? 0).toBeLessThanOrEqual(expected + JPEG_ROUND_TRIP);

    expect(photo.pixels[at + 3]).toBe(255);
  });
});

describe('the tap and the sample agree', () => {
  /*
   * THE DEFECT A PERSON WOULD NOTICE FIRST and no type could catch: tapping the red corner and
   * being told the colour is blue. Every quadrant is checked rather than one, because an
   * inverted axis passes a single-quadrant test half the time.
   */
  const photo = open(quadrantPng);

  const corners = [
    { at: { x: 0.15, y: 0.15 }, expect: QUADRANTS[0], name: 'top-left' },
    { at: { x: 0.85, y: 0.15 }, expect: QUADRANTS[1], name: 'top-right' },
    { at: { x: 0.15, y: 0.85 }, expect: QUADRANTS[2], name: 'bottom-left' },
    { at: { x: 0.85, y: 0.85 }, expect: QUADRANTS[3], name: 'bottom-right' },
  ] as const;

  for (const corner of corners)
    it(`reads the ${corner.name} quadrant when tapped there`, () => {
      const reading = readPhoto(photo, corner.at);
      const [r, g, b] = reading.rgb;
      expect(Math.round(r * 255)).toBe(corner.expect[0]);
      expect(Math.round(g * 255)).toBe(corner.expect[1]);
      expect(Math.round(b * 255)).toBe(corner.expect[2]);
    });

  it('draws the reticle over the region it will actually read', () => {
    // The two clamps have to agree, or the marks point somewhere the engine is not looking.
    const box = reticleBox(photo, { x: 0, y: 0 });
    expect(box.left).toBe(0);
    expect(box.top).toBe(0);
    expect(box.width).toBeCloseTo(PHOTO_REGION_FRACTION * 100, 6);

    const far = reticleBox(photo, { x: 1, y: 1 });
    expect(far.left).toBeCloseTo(100 - PHOTO_REGION_FRACTION * 100, 6);
  });

  it('keeps the region inside the image at an edge, rather than shrinking it', () => {
    // A region that got smaller near an edge would quietly change what the reading is over.
    const middle = sampleAt(photo, { x: 0.5, y: 0.5 }).region;
    const edge = sampleAt(photo, { x: 0, y: 0 }).region;
    expect(edge.samples.length).toBe(middle.samples.length);
  });

  it('turns a tap into a fraction, and survives a box nobody has measured yet', () => {
    expect(pointFrom(40, 10, { width: 200, height: 100 })).toEqual({ x: 0.2, y: 0.1 });
    // Outside the box — a press can report a coordinate past the edge — is clamped, not NaN.
    expect(pointFrom(-5, 500, { width: 200, height: 100 })).toEqual({ x: 0, y: 1 });
    expect(pointFrom(10, 10, { width: 0, height: 0 })).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe('what a photograph is not allowed to claim', () => {
  it('never exceeds the ceiling an unstated colour space imposes', () => {
    /*
     * THE GUARD FOR A CHANGE NOBODY HAS MADE YET. `ingestImage` deliberately KEEPS the ICC
     * profile, so the day somebody parses it, an imported photograph would silently move from a
     * 0.6 ceiling to `garment-scan`'s 0.9 — a claim about accuracy, arriving as a side effect of
     * a feature about colour management. This fails on that day and names the reason.
     *
     * Its decoy is the quadrant block above: a reading that always returned zero confidence
     * would satisfy this and could not read a colour at all.
     */
    const reading = readPhoto(open(quadrantPng), { x: 0.15, y: 0.15 });
    expect(reading.space).toBe('unknown');
    expect(reading.confidence).toBeLessThanOrEqual(SPACE_CONFIDENCE_CEILING.unknown);
    expect(reading.usableSamples).toBeGreaterThan(0);
  });

  it('sends no more pixels to the engine than a camera frame does', () => {
    const big = open(pngBytes(600, 600, () => [10, 20, 30, 255]));
    expect(sampleAt(big, { x: 0.5, y: 0.5 }).region.samples.length).toBeLessThanOrEqual(
      MAX_SAMPLES_PER_FRAME,
    );
  });
});

describe('a file that cannot be read says so', () => {
  it('refuses something that is not an image at all', () => {
    expect(() => open(new Uint8Array([1, 2, 3, 4]))).toThrow(ImageRejected);
  });

  it('refuses a truncated file rather than reading zeros', () => {
    // A plausible colour from a broken file is the worst outcome available here.
    const truncated = quadrantPng.slice(0, quadrantPng.length - 40);
    expect(() => open(truncated)).toThrow();
  });

  it('refuses a 16-bit PNG, and says which part it cannot read', () => {
    const raw: number[] = [];
    for (let y = 0; y < 2; y += 1) {
      raw.push(0);
      for (let x = 0; x < 2; x += 1) raw.push(0, 100, 0, 100, 0, 100, 0xff, 0xff);
    }
    const deep = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...chunk('IHDR', [...u32be(2), ...u32be(2), 16, 6, 0, 0, 0]),
      ...chunk('IDAT', [
        0x78,
        0x01,
        0x01,
        raw.length & 0xff,
        (raw.length >>> 8) & 0xff,
        ~raw.length & 0xff,
        (~raw.length >>> 8) & 0xff,
        ...raw,
        ...u32be(adler32(raw)),
      ]),
      ...chunk('IEND', []),
    ]);
    expect(() => open(deep)).toThrow(PhotoUnreadable);
    expect(() => open(deep)).toThrow(/16 bits/u);
  });

  it('bounds the image before anything decodes it', () => {
    // The bound is on the DIMENSIONS, from the header — the thing a decoder bomb is about — and
    // it is enforced before a byte is expanded.
    expect(PHOTO_LIMITS.maxPixels).toBeLessThan(50_000_000);
    const header = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...chunk('IHDR', [...u32be(30000), ...u32be(30000), 8, 6, 0, 0, 0]),
      ...chunk('IEND', []),
    ]);
    expect(() => ingestImage(header, PHOTO_LIMITS)).toThrow(ImageRejected);
  });

  it('cannot be handed bytes nobody bounded', () => {
    /*
     * A TYPE-LEVEL ASSERTION, written as a comment because it cannot be written as a runtime one:
     * `decodePhoto` takes a `SanitisedImage`, whose brand only `ingestImage` can apply, so
     *
     *   decodePhoto(someUint8Array)
     *
     * does not compile. `typecheck` is the check; this test exists so a reader looking for it
     * finds out where it lives instead of concluding nobody wrote one.
     */
    expect(typeof decodePhoto).toBe('function');
  });
});
