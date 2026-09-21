/**
 * The profile's picture, between the library and the screen (F-241, FR-26, NFR-12).
 *
 * ## What this module is, and what it deliberately is not
 *
 * It is the three steps between a person tapping *choose a picture* and a circle on the header:
 * ask the picker for BYTES, put them through `ingestImage`, and hand the screen a `data:` URI.
 *
 * **It is not a reader.** Nothing here looks at what is in the photograph — no face, no colour,
 * no dominant tone, no orientation heuristic. That is F-241's second criterion and ADR-0010's
 * whole argument, and it is checked from the outside by `verify-avatar-reads.mjs` rather than
 * promised here: this file may not import a colour package, a vision module or the engine, and a
 * scan refuses one with a planted offender proving it reads files at all.
 *
 * ## Bytes, never a file
 *
 * `pickFromLibrary()` returns bytes because `eslint.config.mjs` bans `expo-file-system`,
 * `expo-media-library`, `node:fs` and `fs` from every route — *"a camera frame may never be
 * written to a file"* (NFR-12, ADR-0026). The picture goes library → `ingestImage` → SQLCipher
 * BLOB, and the only URI it ever has is a `data:` one built here.
 *
 * ## `ingestImage` is what makes a library photograph safe to keep
 *
 * A picture from a phone's library carries EXIF, and EXIF carries the coordinates it was taken
 * at. On a picture of a person that is the location of a person. `ingestImage` strips it, checks
 * the format by magic bytes rather than by name, and bounds the size — and the repository takes
 * a `SanitisedImage` and nothing else, so there is no path that skips it.
 */

import { ingestImage, ImageRejected, type SanitisedImage } from '@irodora/store';
import { base64FromBytes, type ImageSource } from '../wardrobe/source';

/** What the avatar needs from the repository — nothing more, so a test can supply it. */
export interface AvatarStore {
  putProfileAvatar(profileId: string, image: SanitisedImage, now: number): void;
  getProfileAvatarInfo(profileId: string): { readonly format: 'jpeg' | 'png' } | undefined;
  getProfileAvatar(profileId: string): Uint8Array | undefined;
  clearProfileAvatar(profileId: string, now: number): void;
}

/**
 * The picture as something `<Image>` can render, or `null`.
 *
 * The INFO read first, then the bytes: the format comes from the row rather than from sniffing
 * the blob a second time, and a header asking *is there a picture* does not load one to find out.
 * The gallery's reasoning, at a scale of one.
 */
export function avatarUri(store: AvatarStore, profileId: string): string | null {
  const info = store.getProfileAvatarInfo(profileId);
  if (info === undefined) return null;
  const bytes = store.getProfileAvatar(profileId);
  if (bytes === undefined) return null;
  return `data:image/${info.format};base64,${base64FromBytes(bytes)}`;
}

/** What came of asking for a picture. Total, so a caller cannot forget the refusal. */
export type AvatarChoice =
  | { readonly kind: 'chosen' }
  /** The person opened the library and changed their mind. Ordinary, and says nothing. */
  | { readonly kind: 'cancelled' }
  /** The file was not an image, was too large, or was too big in pixels. */
  | { readonly kind: 'refused' };

/**
 * Choose a picture from the library and store it.
 *
 * **A refusal is a RESULT, not an exception.** `ingestImage` throws `ImageRejected` for a file
 * that is not a JPEG or a PNG, or is past the limits — all of which are things a person can do
 * by accident with a screenshot or a RAW export, and none of which is a fault. A caller that had
 * to catch an exception for an ordinary choice would end up with a `try` around a tap.
 *
 * Anything else propagates: a driver failure is not a refused picture, and swallowing it here
 * would show *"that file cannot be used"* for a database that is not writable.
 */
export async function chooseAvatar(
  source: ImageSource,
  store: AvatarStore,
  profileId: string,
  now: number,
): Promise<AvatarChoice> {
  // THE LIBRARY, NEVER THE CAMERA. `ImageSource` offers both and this asks for one: a profile
  // picture is a picture somebody already has, and reaching for the camera here would ask for a
  // permission this feature does not need and put a capture path beside a face.
  const bytes = await source.pickFromLibrary();
  if (bytes === null) return { kind: 'cancelled' };
  try {
    store.putProfileAvatar(profileId, ingestImage(bytes), now);
  } catch (error) {
    if (!(error instanceof ImageRejected)) throw error;
    return { kind: 'refused' };
  }
  return { kind: 'chosen' };
}
