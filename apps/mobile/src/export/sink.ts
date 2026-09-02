/**
 * Where an export goes (FR-51, F-129).
 *
 * ## A port, for the reason `ImageSource` is one
 *
 * `expo-file-system` and `expo-sharing` need a device, a chooser and a person. None of that
 * happens in jest — and jest is where the accessibility guarantees are checked, so a screen that
 * imported either could not be rendered and the conformance registry would lose it. The route
 * supplies the real implementation; the screen suite supplies one that records what it was
 * handed.
 *
 * ## The lint that bans the filesystem stays exactly as strict
 *
 * `eslint.config.mjs` forbids `expo-file-system`, `expo-media-library`, `node:fs` and `fs` in
 * `src/lens/**` and in **every route under `app/**`** — *"a camera frame may never be written to
 * a file"* (NFR-12, ADR-0026). Its own message anticipates this surface: *"If a surface here
 * genuinely needs the filesystem, it is not the Lens and it does not belong in this directory."*
 *
 * This one genuinely does, and it lives in `src/export/` rather than in a route or in the Lens.
 * Nothing asks for an exemption.
 *
 * ## What a result says, and what it must not
 *
 * `SaveResult` is a discriminated union rather than a boolean, for the reason `CostPerWear` is
 * one: *"you cancelled"* and *"the write failed"* are different sentences with different things
 * to do about them, and a screen given `false` for both would have to guess.
 *
 * **`cancelled` is not an error.** Somebody opening a share sheet and changing their mind is the
 * ordinary case, and a screen that showed a failure message for a decision the person made
 * deliberately would be wrong about the commonest path through it.
 */

import type { ExportFile } from '@irodora/export';

/** Where the bytes went, or why they did not. */
export type SaveResult =
  | {
      readonly kind: 'saved';
      /**
       * What to tell the person, in their own terms.
       *
       * A path is not that: on Android a Storage Access Framework URI is a content:// address
       * nobody can read, and on iOS the app's document directory is not a place a person
       * navigates to. The adapter says what happened; the screen shows the filename.
       */
      readonly filename: string;
    }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly detail: string };

/**
 * Somewhere an export can be written.
 *
 * One method, unlike `ImageSource`'s two: the two image sources need different permissions and
 * fail differently, and these do not — every format takes the same route out.
 */
export interface FileSink {
  save(file: ExportFile): Promise<SaveResult>;
}
