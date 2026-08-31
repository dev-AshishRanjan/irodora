/**
 * The real `ImageSource`, over `expo-image-picker` (F-043).
 *
 * ## Why this is not in the screen, and not in `source.ts` either
 *
 * `expo-image-picker` needs a device, a permission dialogue and a person — so it lives behind
 * the port in [`./source.ts`](./source.ts), which is what lets the screen suite drive both
 * photo paths without any of that. This file is the one place the real module is named.
 *
 * ## `base64`, and it is the whole reason this works here
 *
 * The picker can hand back a URI or the bytes. **This asks for the bytes**, because
 * `eslint.config.mjs` bans `expo-file-system`, `expo-media-library`, `node:fs` and `fs` from
 * `src/lens/**` and from every route in `app/**` — *"a camera frame may never be written to a
 * file"* (NFR-12, ADR-0026). Reading a URI would need exactly what that rule forbids.
 *
 * Taking the bytes means the photograph is never a file this app manages: it goes straight
 * through `ingestImage`, which strips its EXIF and bounds it, and into the SQLCipher database
 * as a BLOB (ADR-0078). **Nothing here asks for an exemption from that lint**, and the rule
 * stays exactly as strict as it is.
 *
 * ## `null` is cancellation, and it is the common case
 *
 * Somebody opening the library and changing their mind is ordinary. The picker reports it as
 * `canceled`, and it becomes `null` rather than a throw — a screen that had to catch an
 * exception for a decision the person made deliberately would show a failure message for it.
 */

import * as ImagePicker from 'expo-image-picker';
import { bytesFromBase64, type ImageSource } from './source';

/**
 * Options shared by both paths.
 *
 * `quality: 0.8` and no editing: this is a wardrobe photograph, not a print. A full-quality
 * capture from a modern phone can exceed `DEFAULT_IMAGE_LIMITS.maxBytes`, and the ingest would
 * refuse it — correctly, and after the person had already waited for it.
 */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  base64: true,
  quality: 0.8,
  mediaTypes: ['images'],
  allowsEditing: false,
};

/** Pull the bytes out of a picker result, or `null` for a cancellation. */
function bytesOf(result: ImagePicker.ImagePickerResult): Uint8Array | null {
  if (result.canceled) return null;
  const base64 = result.assets[0]?.base64;
  // A result that is not cancelled and carries no bytes should not happen — but "should not
  // happen" is how a screen ends up rendering an attached photograph that is not there. Null
  // is the honest answer and the screen already handles it as "nothing was chosen".
  if (base64 == null || base64 === '') return null;
  return bytesFromBase64(base64);
}

export function devicePicker(): ImageSource {
  return {
    async pickFromLibrary() {
      return bytesOf(await ImagePicker.launchImageLibraryAsync(OPTIONS));
    },
    async captureWithCamera() {
      return bytesOf(await ImagePicker.launchCameraAsync(OPTIONS));
    },
  };
}
