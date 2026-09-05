/**
 * Reading a colour out of a photograph — the first time this repository decodes an image.
 *
 * ## Why that sentence is worth writing down
 *
 * [`packages/store/src/image.ts`](../../../../packages/store/src/image.ts) bounds every wardrobe
 * photograph **by reading its header**, and says so in its own words: *"every limit below is
 * enforced by reading the header, and this module never decodes anything"*. A decoder bomb is a
 * few kilobytes that expands into gigabytes, and on a phone there is no process to spend
 * containing it — so the containment has to happen *before* the decode rather than around it.
 *
 * That module is still the trust boundary. **Nothing here decodes bytes; it decodes a
 * `SanitisedImage`**, which only `ingestImage` can produce, so an un-ingested buffer does not
 * type-check at the call site. The same move `LensReading` makes for camera frames: the
 * guarantee is a type rather than a convention somebody has to remember.
 *
 * ## Why the decoding happens in JavaScript
 *
 * [ADR-0092](../../../../docs/adr/0092-pixels-come-out-of-a-file-in-javascript.md). Three
 * reasons, in the order they decided it:
 *
 * 1. **Memory safety.** A pure-JS decoder facing an arbitrary user file can exhaust memory or
 *    spin. It cannot corrupt memory. A native decoder's failure mode is the other one.
 * 2. **Determinism.** Platform decoders differ between iOS and Android in IDCT precision and
 *    chroma upsampling. NFR-3 promises the same inputs give the same observable value; *which
 *    phone decoded it* should not be one of the inputs.
 * 3. **It can be checked here.** A native path would be entirely device-attested — a feature
 *    with no gate coverage at all. This runs in jest, against fixtures, in CI.
 *
 * ## What the photograph is not asked to state
 *
 * **Its colour space.** `ingestImage` deliberately KEEPS the ICC profile (JPEG `APP2`, PNG
 * `iCCP`) and nothing here parses it, so every reading from a photograph is `space: 'unknown'`
 * — which `SPACE_CONFIDENCE_CEILING` already caps at 0.6, for a reason written long before this
 * file existed. No new ceiling is invented for imported images, which is
 * [ADR-0087](../../../../docs/adr/0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md)
 * applied in the direction it points.
 *
 * ## And a detail that only looks incidental
 *
 * `ingestImage` strips EXIF, which removes the **Orientation** tag along with the GPS
 * coordinates a photograph taken at home carries. That matters twice: the privacy reason it was
 * written for, and this one — the sanitised bytes are what the screen displays *and* what this
 * decodes, so a tap lands on the pixels the person was looking at. Displaying the original and
 * decoding the sanitised copy would put a rotation between the two.
 */

import { decode as decodeJpeg } from 'jpeg-js';
import { unzlibSync } from 'fflate';
import { ingestImage, ImageRejected, type ImageLimits, type SanitisedImage } from '@irodora/store';
import type { Region, Sample } from '@irodora/color-sampling';
import { MAX_SAMPLES_PER_FRAME, sampleStride } from './camera';
import { read, type CaptureInput } from './modes';
import type { LensReading } from './reading';

/**
 * What a photograph may be, before anything decodes it.
 *
 * **Tighter than `DEFAULT_IMAGE_LIMITS` where it matters and looser where it does not.**
 *
 * `maxPixels` is halved from the wardrobe's 50 million, because these two numbers are bounding
 * different things. The wardrobe bound exists so a decoder *elsewhere* is never handed a bomb;
 * this one is the size of an allocation **this process is about to make** — four bytes a pixel
 * for the decoded image, plus the decoder's own working set. 24 megapixels is above any
 * photograph a phone saves by default and below the point where the decode is the problem.
 *
 * `maxBytes` is doubled, because the Lens picker asks for full quality where the wardrobe asks
 * for 0.8. That is a colour decision: this file is the input to a measurement, and choosing to
 * recompress it first would be discarding information on purpose.
 */
export const PHOTO_LIMITS: ImageLimits = {
  maxBytes: 24 * 1024 * 1024,
  maxPixels: 24_000_000,
};

/**
 * A second bound, enforced by the decoder itself.
 *
 * `jpeg-js` counts its own allocations and throws past this — so a file whose header claims a
 * modest size and whose scan data says otherwise is stopped by the thing doing the allocating,
 * not only by our check of what the header claimed.
 */
export const PHOTO_MAX_DECODE_MB = 256;

/** The fraction of the photograph's shorter side a reading spans. `REGION_FRACTION`'s twin. */
export const PHOTO_REGION_FRACTION = 0.1;

/** A refused photograph. Its own class so a caller can tell a bad file from a bug. */
export class PhotoUnreadable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoUnreadable';
  }
}

/**
 * A decoded photograph.
 *
 * **RGBA, interleaved, eight bits a channel**, whatever the file was. One shape rather than two
 * means the sampling below has no format branches, and alpha is kept rather than dropped
 * because FR-15 requires transparent pixels to be *rejected* — which the engine's `partition`
 * does, and cannot do if the alpha never reaches it.
 */
export interface DecodedPhoto {
  readonly width: number;
  readonly height: number;
  /** `width * height * 4` bytes, row-major, no row padding. */
  readonly pixels: Uint8Array;
}

/** Where in a photograph to read, as fractions of its width and height, each in [0, 1]. */
export interface PhotoPoint {
  readonly x: number;
  readonly y: number;
}

/** The middle, which is where a reading starts before anybody has chosen. */
export const PHOTO_CENTRE: PhotoPoint = { x: 0.5, y: 0.5 };

/**
 * Bound a picked file, then decode it.
 *
 * Two steps rather than one because they refuse for different reasons and the person should be
 * told which: `ImageRejected` means the file is not something we will accept at all — wrong
 * type, too many bytes, too many pixels — and `PhotoUnreadable` means it was accepted and then
 * could not be read.
 */
export function openPhoto(bytes: Uint8Array): { photo: DecodedPhoto; image: SanitisedImage } {
  const image = ingestImage(bytes, PHOTO_LIMITS);
  return { photo: decodePhoto(image), image };
}

/**
 * Decode a photograph that has already passed the trust boundary.
 *
 * Takes a `SanitisedImage` and not a buffer, and that is the enforcement rather than the
 * documentation: there is no way to call this on bytes nobody bounded.
 */
export function decodePhoto(image: SanitisedImage): DecodedPhoto {
  const pixels = image.format === 'jpeg' ? jpegPixels(image) : pngPixels(image);

  /*
   * THE LENGTH IS CHECKED RATHER THAN TRUSTED. Both decoders report a width and a height and
   * both can, on an unusual file, return a buffer that does not match them — a CMYK JPEG is the
   * concrete case, where four components come back where three were expected. Every read below
   * indexes off `width`, so a short buffer would sample zeros and produce a plausible colour
   * from nothing at all. That is the failure this product least wants.
   */
  const expected = image.width * image.height * 4;
  if (pixels.length !== expected)
    throw new PhotoUnreadable(
      `the decoded image is ${String(pixels.length)} bytes where ${String(expected)} were ` +
        'expected — the file is a format the Lens cannot read',
    );

  return { width: image.width, height: image.height, pixels };
}

function jpegPixels(image: SanitisedImage): Uint8Array {
  try {
    /*
     * `useTArray` is not optional: without it the library reaches for `Buffer`, which does not
     * exist in Hermes. It catches its own `ReferenceError` and rethrows with advice — advice
     * nobody would see, because it would arrive on a phone.
     */
    const decoded = decodeJpeg(image.bytes, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: PHOTO_MAX_DECODE_MB,
      maxResolutionInMP: Math.ceil(PHOTO_LIMITS.maxPixels / 1_000_000),
    });
    return decoded.data;
  } catch (error: unknown) {
    throw new PhotoUnreadable(
      `the photograph could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Channels per pixel, by PNG colour type. `undefined` is a type the format does not define.
 *
 * 3 — indexed — is deliberately absent: a palette is a second pixel path for a file type no
 * camera produces, and it is refused by name rather than by falling off this table.
 */
const PNG_CHANNELS: Readonly<Record<number, number | undefined>> = {
  0: 1, // greyscale
  2: 3, // truecolour
  4: 2, // greyscale + alpha
  6: 4, // truecolour + alpha
};

/**
 * Read a PNG.
 *
 * ## Why this is ours and the inflate is not
 *
 * The first version used `fast-png`, and it did not survive contact with the runtime: the library
 * builds `new TextDecoder('latin1')` **at module scope**, and Expo's `TextDecoder` polyfill
 * supports UTF-8 only — so importing it threw `Unknown encoding: latin1` before a single pixel
 * was read. jest surfaced it because jest-expo installs the same polyfill the app ships, which
 * is the version of that failure worth having.
 *
 * What that decoder wanted `TextDecoder` for is PNG's **text chunks**, and `ingestImage` has
 * already stripped every one of them — `tEXt`, `zTXt`, `iTXt` — before this sees the file. The
 * dependency was carrying a feature we deliberately destroy upstream, and breaking on it.
 *
 * **The hard part is still a library.** `fflate` does the inflate; everything here is the chunk
 * walk and the unfiltering, both fully specified by the PNG spec, and both checked against a
 * fixture written byte by byte in `test/lens-photo.test.ts` — no encoder involved, so this cannot
 * be wrong in the same direction as the thing testing it.
 *
 * ## The decompression bound is exact rather than generous
 *
 * `unzlibSync` is handed a pre-allocated output of **exactly** the size IHDR implies, so a stream
 * that expands past it fails on a buffer this code sized rather than against a limit somebody
 * guessed. There is only one correct size and it is known before a byte is inflated.
 */
function pngPixels(image: SanitisedImage): Uint8Array {
  const bytes = image.bytes;
  const header = pngHeader(bytes);
  const channels = PNG_CHANNELS[header.colorType];

  /*
   * REFUSED RATHER THAN CONVERTED, and each for its own reason.
   *
   * 16 bits a channel would have to be scaled to eight, and scaling is a colour operation —
   * `apps/mobile/AGENTS.md` puts those in the engine, and the engine has no opinion about PNG.
   * A palette would be a second pixel path to get wrong. Adam7 interlacing is seven passes of
   * geometry for a feature the web abandoned.
   *
   * A screenshot — the realistic PNG somebody picks — is 8-bit RGBA and goes straight through.
   */
  if (header.depth !== 8)
    throw new PhotoUnreadable(
      `this PNG stores ${String(header.depth)} bits a channel, and the Lens reads 8`,
    );
  if (header.colorType === 3)
    throw new PhotoUnreadable('this PNG uses a colour palette, which the Lens does not read');
  if (channels === undefined)
    throw new PhotoUnreadable(`this PNG declares colour type ${String(header.colorType)}`);
  if (header.interlace !== 0)
    throw new PhotoUnreadable('this PNG is interlaced, which the Lens does not read');

  const stride = image.width * channels;
  const raw = inflateIdat(bytes, image.height * (stride + 1));

  const out = new Uint8Array(image.width * image.height * 4);
  // The scanline above, unfiltered. Zeroes for the first row, which is what the spec says the
  // row above the image contains.
  let previous = new Uint8Array(stride);
  let line = new Uint8Array(stride);

  for (let y = 0; y < image.height; y += 1) {
    const at = y * (stride + 1);
    unfilter(raw[at] ?? 0, raw, at + 1, line, previous, channels, stride);

    for (let x = 0; x < image.width; x += 1) {
      const from = x * channels;
      const to = (y * image.width + x) * 4;
      // Greyscale (1) and grey+alpha (2) put one value in all three channels; truecolour (3)
      // and truecolour+alpha (4) are already in order. Alpha defaults to opaque, which is what
      // a PNG without an alpha channel is.
      const grey = channels < 3;
      out[to] = line[from] ?? 0;
      out[to + 1] = (grey ? line[from] : line[from + 1]) ?? 0;
      out[to + 2] = (grey ? line[from] : line[from + 2]) ?? 0;
      out[to + 3] =
        (channels === 2 ? line[from + 1] : channels === 4 ? line[from + 3] : 255) ?? 255;
    }

    // Swapped rather than copied: the line just written becomes the one above the next.
    const spare = previous;
    previous = line;
    line = spare;
  }

  return out;
}

/** IHDR, which `ingestImage` has already found — read again for the fields it does not keep. */
function pngHeader(bytes: Uint8Array): {
  readonly depth: number;
  readonly colorType: number;
  readonly interlace: number;
} {
  // The signature is 8 bytes and IHDR is required to be the first chunk, so its data starts at
  // 16. Both facts are guaranteed by `ingestImage`, which refused anything else.
  return { depth: bytes[24] ?? 0, colorType: bytes[25] ?? 0, interlace: bytes[28] ?? 0 };
}

/**
 * Concatenate every IDAT and inflate into a buffer of exactly the expected size.
 *
 * A PNG may split its image data across any number of IDAT chunks, and a reader that took only
 * the first would produce a correct-looking top slice of the image and nonsense below it — which
 * is precisely the "plausible colour from nothing" failure this file exists to avoid.
 */
function inflateIdat(bytes: Uint8Array, expected: number): Uint8Array {
  const parts: Uint8Array[] = [];
  let total = 0;

  // Past the 8-byte signature. Every chunk is length, type, data, CRC.
  for (let at = 8; at + 8 <= bytes.length;) {
    const length =
      ((bytes[at] ?? 0) << 24) |
      ((bytes[at + 1] ?? 0) << 16) |
      ((bytes[at + 2] ?? 0) << 8) |
      (bytes[at + 3] ?? 0);
    const type = String.fromCharCode(
      bytes[at + 4] ?? 0,
      bytes[at + 5] ?? 0,
      bytes[at + 6] ?? 0,
      bytes[at + 7] ?? 0,
    );
    const from = at + 8;
    if (length < 0 || from + length > bytes.length)
      throw new PhotoUnreadable('this PNG ends inside a chunk — the file is truncated');

    if (type === 'IDAT') {
      parts.push(bytes.subarray(from, from + length));
      total += length;
    }
    if (type === 'IEND') break;
    at = from + length + 4;
  }

  if (total === 0) throw new PhotoUnreadable('this PNG carries no image data');

  const stream = parts.length === 1 ? (parts[0] ?? new Uint8Array()) : join(parts, total);

  try {
    return unzlibSync(stream, { out: new Uint8Array(expected) });
  } catch (error: unknown) {
    throw new PhotoUnreadable(
      `this PNG's image data could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function join(parts: readonly Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/**
 * Undo one scanline's filter, in place into `line`.
 *
 * The five filters are the PNG spec's, unchanged. `bpp` is the distance to the neighbour on the
 * left — in **bytes**, and bytes rather than pixels is what trips people: filtering runs per byte
 * across the scanline, so the left neighbour of a green byte is the previous pixel's green byte.
 */
function unfilter(
  filter: number,
  raw: Uint8Array,
  from: number,
  line: Uint8Array,
  previous: Uint8Array,
  bpp: number,
  stride: number,
): void {
  for (let i = 0; i < stride; i += 1) {
    const x = raw[from + i] ?? 0;
    const a = i >= bpp ? (line[i - bpp] ?? 0) : 0;
    const b = previous[i] ?? 0;
    const c = i >= bpp ? (previous[i - bpp] ?? 0) : 0;

    switch (filter) {
      case 0:
        line[i] = x;
        break;
      case 1:
        line[i] = (x + a) & 0xff;
        break;
      case 2:
        line[i] = (x + b) & 0xff;
        break;
      case 3:
        line[i] = (x + ((a + b) >> 1)) & 0xff;
        break;
      case 4:
        line[i] = (x + paeth(a, b, c)) & 0xff;
        break;
      default:
        throw new PhotoUnreadable(
          `this PNG uses filter ${String(filter)}, which is not one of the five`,
        );
    }
  }
}

/** The Paeth predictor, from the PNG spec. Ties go to `a`, then `b` — the order is normative. */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Take a bounded sample of the photograph around a point.
 *
 * The region is a centred square of {@link PHOTO_REGION_FRACTION} of the shorter side, clamped
 * so it stays inside the image — a tap near an edge reads the nearest full region rather than a
 * smaller one, because a region that shrank at the edges would quietly change what the reading
 * is over.
 *
 * `sampleStride` is the camera's, and reusing it is the point: the same bound on how many
 * pixels reach the engine, so a photograph and a frame are read from comparable amounts of
 * evidence rather than one of them being a thousand times denser.
 */
export function sampleAt(photo: DecodedPhoto, at: PhotoPoint): CaptureInput {
  const size = Math.max(1, Math.floor(Math.min(photo.width, photo.height) * PHOTO_REGION_FRACTION));
  const left = clamp(Math.round(at.x * photo.width) - Math.floor(size / 2), 0, photo.width - size);
  const top = clamp(Math.round(at.y * photo.height) - Math.floor(size / 2), 0, photo.height - size);

  const stride = sampleStride(size * size, MAX_SAMPLES_PER_FRAME);
  const samples: Sample[] = [];

  for (let y = 0; y < size; y += stride)
    for (let x = 0; x < size; x += stride) {
      const at4 = ((top + y) * photo.width + (left + x)) * 4;
      samples.push({
        r: (photo.pixels[at4] ?? 0) / 255,
        g: (photo.pixels[at4 + 1] ?? 0) / 255,
        b: (photo.pixels[at4 + 2] ?? 0) / 255,
        alpha: (photo.pixels[at4 + 3] ?? 255) / 255,
      });
    }

  const region: Region = {
    samples,
    width: Math.ceil(size / stride),
    height: Math.ceil(size / stride),
  };

  /*
   * `unknown`, ALWAYS, and it is the honest answer rather than a shrug. A JPEG carries no colour
   * space unless its ICC profile says so, and nothing here reads one. Guessing sRGB would be the
   * assumption `apps/mobile/AGENTS.md` forbids by name, and it would be wrong in exactly the
   * saturated colours this product exists for.
   */
  return { region, space: 'unknown' };
}

/**
 * Read the colour at a point in a photograph.
 *
 * `garment-scan` because that is the interaction: FR-14 is *"capture a garment, user selects the
 * fabric region"*, and selecting the region is what a tap on a photograph is. Its ceiling of 0.9
 * is not what bounds the result — `space: 'unknown'` caps it at 0.6 first — so the mode is a
 * statement about the interaction rather than a number doing work.
 */
export function readPhoto(photo: DecodedPhoto, at: PhotoPoint): LensReading {
  return read('garment-scan', sampleAt(photo, at));
}

/**
 * The reticle's box, as percentages of the displayed photograph.
 *
 * Here rather than in the screen for the reason the viewfinder's marks are derived from
 * `REGION_FRACTION`: **a reticle that lies about where the colour is read is worse than none.**
 * It is an instruction to aim somewhere the engine is not looking. One function, one test, and
 * the screen cannot express a different opinion.
 *
 * The clamp is {@link sampleAt}'s, in fractions rather than pixels, so what is drawn is the
 * region that will actually be read — including at the edges, where the two would otherwise
 * disagree by exactly the amount the clamp moved it.
 */
export function reticleBox(
  photo: { readonly width: number; readonly height: number },
  at: PhotoPoint,
): {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
} {
  const size = Math.min(photo.width, photo.height) * PHOTO_REGION_FRACTION;
  const left = clamp(at.x * photo.width - size / 2, 0, photo.width - size);
  const top = clamp(at.y * photo.height - size / 2, 0, photo.height - size);
  return {
    left: (left / photo.width) * 100,
    top: (top / photo.height) * 100,
    width: (size / photo.width) * 100,
    height: (size / photo.height) * 100,
  };
}

/** A point from a tap, in fractions, kept inside the image. */
export function pointFrom(
  x: number,
  y: number,
  box: { width: number; height: number },
): PhotoPoint {
  // A zero-sized box has not been laid out yet. The centre is the honest answer — it is where
  // the reading starts — rather than a NaN that would propagate into every index below.
  if (box.width <= 0 || box.height <= 0) return PHOTO_CENTRE;
  return { x: clamp(x / box.width, 0, 1), y: clamp(y / box.height, 0, 1) };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

export { ImageRejected };
