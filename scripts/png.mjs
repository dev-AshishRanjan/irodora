#!/usr/bin/env node
/**
 * PNG, by hand — encode, decode, and the mark's shape signature.
 *
 * ## Why this exists rather than a dependency
 *
 * The mark is two axis-aligned rectangles on a flat ground, so every pixel of every brand asset
 * is *computable*. A rasteriser would be a build-time dependency, a native binary on three
 * platforms, and a source of "why is the icon one pixel different on CI" — for an image that is
 * four straight edges.
 *
 * The decoder exists for the other half, and for the same reason `verify-apk.mjs` parses binary
 * AXML by hand: **a gate must run where the Android SDK is not.** A check that can only run on a
 * machine with the toolchain installed is a check that does not run.
 *
 * ## Scope, stated so nobody mistakes this for a PNG library
 *
 * Encodes and decodes **8-bit RGBA, non-interlaced, one IDAT** — the only shape this repository
 * produces. Everything else throws rather than guessing, because a decoder that silently
 * mishandles a colour type it does not support returns plausible wrong pixels, and plausible
 * wrong pixels are what the shape check downstream would then agree with.
 */

import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** CRC-32, table-driven. The polynomial PNG specifies; nothing here is a choice. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * Encode 8-bit RGBA pixels as a PNG.
 *
 * **Filter 0 on every scanline, and `deflateSync` at its default level.** Neither is chosen for
 * size — they are chosen because they are *deterministic*: the same pixels must produce the same
 * bytes on every machine, or `--check` reports a difference that is really a zlib version. The
 * assets are flat colour and compress to almost nothing regardless.
 */
export function encodePng(width, height, rgba) {
  if (rgba.length !== width * height * 4)
    throw new Error(
      `pixel buffer is ${String(rgba.length)} bytes, expected ${String(width * height * 4)} — ` +
        'an encoder that padded or truncated here would emit a valid PNG of the wrong picture.',
    );

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10..12 are compression, filter and interlace methods — 0 is the only value PNG defines.

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 — None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Every chunk in a PNG, in order. Throws on anything that is not one. */
function chunks(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  const out = [];
  let p = 8;
  while (p < buf.length) {
    const length = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    out.push({ type, data: buf.subarray(p + 8, p + 8 + length) });
    p += 12 + length;
  }
  return out;
}

/**
 * Decode a PNG to 8-bit RGBA.
 *
 * Handles the five PNG filters, because a file produced by anything other than the encoder above
 * — an Android build tool resizing an icon, say — will use them. That is the whole point of
 * decoding rather than byte-comparing: the artefact's icon is a *resized* copy, so it is a
 * different file that must still be recognisably the mark.
 */
export function decodePng(buf) {
  const parts = chunks(buf);
  const ihdr = parts.find((c) => c.type === 'IHDR');
  if (ihdr === undefined) throw new Error('PNG has no IHDR');

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const depth = ihdr.data[8];
  const colourType = ihdr.data[9];
  const interlace = ihdr.data[12];

  // Refused rather than approximated. See the header: a decoder that guesses returns plausible
  // wrong pixels, and the check downstream would agree with them.
  if (depth !== 8) throw new Error(`unsupported bit depth ${String(depth)} — only 8 is handled`);
  if (interlace !== 0) throw new Error('interlaced PNG is not handled');
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colourType];
  if (channels === undefined)
    throw new Error(`unsupported colour type ${String(colourType)} (palette is not handled)`);

  const idat = Buffer.concat(parts.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const raw = inflateSync(idat);

  const bpp = channels;
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prior = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));

    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prior[i];
      const c = i >= bpp ? prior[i - bpp] : 0;
      switch (filter) {
        case 0:
          break;
        case 1:
          line[i] = (line[i] + a) & 0xff;
          break;
        case 2:
          line[i] = (line[i] + b) & 0xff;
          break;
        case 3:
          line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          // Paeth. The predictor is the neighbour nearest to a+b-c.
          const p = a + b - c;
          const pa = Math.abs(p - a),
            pb = Math.abs(p - b),
            pc = Math.abs(p - c);
          line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default:
          throw new Error(`unknown PNG filter ${String(filter)} on row ${String(y)}`);
      }
    }

    for (let x = 0; x < width; x++) {
      const s = x * bpp;
      const d = (y * width + x) * 4;
      // Widened to RGBA whatever came in, so every caller sees one shape.
      if (channels === 1) ((out[d] = out[d + 1] = out[d + 2] = line[s]), (out[d + 3] = 255));
      else if (channels === 2)
        ((out[d] = out[d + 1] = out[d + 2] = line[s]), (out[d + 3] = line[s + 1]));
      else {
        out[d] = line[s];
        out[d + 1] = line[s + 1];
        out[d + 2] = line[s + 2];
        out[d + 3] = channels === 4 ? line[s + 3] : 255;
      }
    }

    // ONE ASSIGNMENT PER SCANLINE, not per pixel. It was inside the loop above and happened to
    // be correct — the same value written `width` times — which is the sort of thing that stays
    // right until somebody makes the filters depend on it and cannot see why.
    prior = line;
  }

  return { width, height, rgba: out };
}

/**
 * The run lengths of "ink" across an image's middle row, as fractions of its width.
 *
 * ## Why a signature rather than a hash
 *
 * The criterion this serves is *"gate 16 fails if a default or placeholder asset reached the
 * artefact"*, and the two obvious implementations are both wrong:
 *
 * - **Byte-compare against our own file.** Android generates density variants, so the bytes
 *   legitimately differ and the check would fail every correct build.
 * - **Refuse a known placeholder's hash.** That refuses exactly one bad file. The next one — a
 *   different SDK's default, a half-finished export — sails through.
 *
 * Proportions survive resizing, so this is a **positive** assertion that our mark is present,
 * rather than a list of things it must not be. `ink` is any pixel whose alpha is non-trivial and
 * whose luminance differs from the first pixel of the row — which is how a light mark on dark
 * and a dark mark on light are the same measurement.
 */
export function rowSignature({ width, height, rgba }) {
  const y = Math.floor(height / 2);
  const at = (x) => {
    const d = (y * width + x) * 4;
    return { r: rgba[d], g: rgba[d + 1], b: rgba[d + 2], a: rgba[d + 3] };
  };

  const ground = at(0);
  const isInk = (p) =>
    p.a > 8 &&
    (ground.a <= 8 ||
      Math.abs(p.r - ground.r) + Math.abs(p.g - ground.g) + Math.abs(p.b - ground.b) > 90);

  const runs = [];
  let current = isInk(at(0));
  let length = 0;
  for (let x = 0; x < width; x++) {
    const here = isInk(at(x));
    if (here === current) length += 1;
    else {
      runs.push({ ink: current, fraction: length / width });
      current = here;
      length = 1;
    }
  }
  runs.push({ ink: current, fraction: length / width });
  return runs;
}

/**
 * Does this image carry the mark?
 *
 * The mark's middle row crosses: ground, field, interval, field, ground. `tolerance` is
 * generous because the caller may be looking at an icon that was resized to 48 px by a build
 * tool — the proportions survive that, a couple of percent of rounding does not.
 */
export function carriesMark(image, expected, tolerance = 0.03) {
  const runs = rowSignature(image);
  const ink = runs.filter((r) => r.ink);
  if (ink.length !== 2)
    return { ok: false, why: `${String(ink.length)} ink run(s) across the middle row, expected 2` };

  const gap = runs.find((r, i) => !r.ink && i > 0 && i < runs.length - 1);
  if (gap === undefined) return { ok: false, why: 'no interval between the two fields' };

  for (const [name, actual, want] of [
    ['first field', ink[0].fraction, expected.field],
    ['interval', gap.fraction, expected.interval],
    ['second field', ink[1].fraction, expected.field],
  ])
    if (Math.abs(actual - want) > tolerance)
      return {
        ok: false,
        why: `${name} is ${(actual * 100).toFixed(1)}% of the width, expected ${(want * 100).toFixed(1)}%`,
      };

  return { ok: true, why: 'ground · field · interval · field · ground, in the mark’s proportions' };
}
