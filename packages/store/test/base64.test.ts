/**
 * The base64 codec (F-286, moved down from the app in the same feature).
 *
 * ## Why these cases live here now
 *
 * They were `apps/mobile/test/gallery.test.ts`'s, reached through the re-export — which works
 * until somebody removes the re-export, at which point the codec this package owns has no tests
 * and nothing says so. F-286's review caught that: every archive fixture is about eighty bytes,
 * so nothing in `packages/store` crosses the chunk boundary that the implementation exists to
 * handle.
 *
 * **The chunking is the whole risk.** `String.fromCharCode(...bytes)` on a photograph is a spread
 * of a hundred thousand arguments and Hermes throws before it is slow, so the encoder walks in
 * 0x8000-byte pieces — and an off-by-one there corrupts every photograph in a way the caller
 * reports as a malformed file.
 */

import { describe, expect, it } from 'vitest';
import { base64FromBytes, bytesFromBase64 } from '../src/base64.js';

/** Deterministic, and every byte value appears — 0x00 and 0xFF are the ones that go wrong. */
const bytes = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_, i) => (i * 7 + (i >> 8)) & 0xff);

describe('bytes survive the trip to text and back', () => {
  it.each([0, 1, 2, 3, 4, 255, 256, 0x8000 - 1, 0x8000, 0x8000 + 1, 0x8000 * 2 + 7])(
    'round-trips %i bytes',
    (length) => {
      const input = bytes(length);
      expect(Array.from(bytesFromBase64(base64FromBytes(input)))).toStrictEqual(Array.from(input));
    },
  );

  it('crosses the chunk boundary, so the lengths above are not all one pass', () => {
    // Without this, every case could be a single chunk and the loop would be untested.
    expect(0x8000 * 2 + 7).toBeGreaterThan(0x8000);
  });

  it('carries 0x00 and 0xFF, the two that a char-code walk gets wrong', () => {
    const input = Uint8Array.from([0x00, 0xff, 0x00, 0xff, 0x80, 0x7f]);
    expect(Array.from(bytesFromBase64(base64FromBytes(input)))).toStrictEqual(Array.from(input));
  });

  it('produces the encoding everything else agrees on', () => {
    // A known vector rather than only self-consistency: an encoder and a decoder that were
    // wrong in the same way would round-trip perfectly and interoperate with nothing.
    expect(base64FromBytes(Uint8Array.from([0x68, 0x69]))).toBe('aGk=');
    expect(Array.from(bytesFromBase64('aGk='))).toStrictEqual([0x68, 0x69]);
  });

  it('refuses text that is not base64 rather than returning something', () => {
    // `decodeValue` catches this and turns it into an ArchiveError; if it returned empty bytes
    // instead, a corrupt archive would import as an empty image.
    expect(() => bytesFromBase64('not base64 at all !!!')).toThrow();
  });
});
