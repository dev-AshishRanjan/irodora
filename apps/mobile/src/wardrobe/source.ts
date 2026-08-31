/**
 * Where a wardrobe photograph comes from (FR-40, F-043).
 *
 * ## A port, for the reason `SecureKeyStore` is one
 *
 * `expo-image-picker` needs a device, a permission dialogue and a person. None of that can
 * happen in jest, and two of FR-40's four paths go through it — so a screen calling the picker
 * directly would leave half this feature testable only by hand. The route supplies the real
 * implementation; the screen suite supplies one that returns fixture bytes.
 *
 * ## Bytes, not a URI, and that is the whole design
 *
 * `eslint.config.mjs` bans `expo-file-system`, `expo-media-library`, `node:fs` and `fs` from
 * `src/lens/**` **and from every route in `app/**`** — *"a camera frame may never be written
 * to a file"* (NFR-12, ADR-0026). The rule's own message anticipates a surface like this one:
 * *"If a surface here genuinely needs the filesystem, it is not the Lens."*
 *
 * This surface does not need it. The picker is asked for `base64`, the adapter decodes to
 * bytes, `ingestImage` strips and bounds them, and they become a BLOB inside the SQLCipher
 * database (ADR-0078). **The image is never a file this app manages**, so the lint stays
 * exactly as strict as it is and nothing here asks for an exemption.
 *
 * ## `null` means cancelled, and it is the common case
 *
 * Somebody opening the library and changing their mind is ordinary, not exceptional. A throw
 * would make every call site handle a control-flow event as an error, and the one that forgot
 * would show a failure message for a decision the person made deliberately.
 */

/**
 * The two ways bytes arrive. Both return `null` when the person backs out.
 *
 * Deliberately NOT one method with a parameter: the two need different permissions and fail
 * differently, and a screen offering both wants to disable them independently. A single
 * `pick(source)` would put that distinction back at every call site.
 */
export interface ImageSource {
  /** The photo library. */
  pickFromLibrary(): Promise<Uint8Array | null>;
  /** The camera, capturing a still — not the Lens, which never keeps a frame. */
  captureWithCamera(): Promise<Uint8Array | null>;
}

/**
 * Decode a base64 payload to bytes.
 *
 * Exported because it is the one piece of the adapter worth testing: the picker's own return
 * value cannot be exercised here, but the decode can, and it is where an off-by-one would
 * corrupt every photograph in a way `ingestImage` would report as a malformed file.
 *
 * `atob` rather than `Buffer`: this runs in Hermes, where `Buffer` does not exist unless
 * something polyfills it — the same class of assumption that crashed the app in F-104, where
 * `crypto` was real in every runtime except the one that ships.
 */
export function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
