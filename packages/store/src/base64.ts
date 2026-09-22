/**
 * Base64, for the two places a BLOB has to become text (F-286, F-043).
 *
 * ## Why this is here rather than in the app
 *
 * It was in `apps/mobile/src/wardrobe/source.ts`, written for a `data:` URI, and F-286 needed
 * the same thing one layer down — the archive is JSON, and JSON has no bytes. Two copies of a
 * codec is two places for an off-by-one that corrupts every photograph in a way the caller
 * reports as a malformed file. This package owns the blobs, so it owns the encoding, and the app
 * re-exports these.
 *
 * ## `btoa`/`atob` rather than `Buffer`
 *
 * F-043's finding, kept verbatim because it is the reason: *"this runs in Hermes, where
 * `Buffer` does not exist unless something polyfills it"*. Both are globals in Hermes and in
 * Node, and neither needs a dependency — which this package does not take lightly.
 */

/**
 * Well under any engine's argument limit.
 *
 * `String.fromCharCode(...bytes)` on a photograph is a spread of a hundred thousand arguments,
 * and Hermes throws before it is slow. The concatenation below is linear.
 */
const CHUNK = 0x8000;

export function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

export function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
