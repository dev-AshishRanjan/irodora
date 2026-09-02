/**
 * The real file sink (FR-51, F-129).
 *
 * ## Cache, then share — and why not a directory the person picks
 *
 * The bytes are written to the **cache** directory and handed to the platform share sheet, which
 * is where the person chooses what happens to them: save to Files, send to another app, put in a
 * message. That is what *"a file they chose"* means on both platforms without a third
 * dependency.
 *
 * Android's Storage Access Framework can let somebody pick a directory directly and would be a
 * better fit there — and it has no iOS equivalent, so taking it would mean two flows, two
 * failure modes and a criterion satisfied differently on each platform. One flow, stated, beats
 * two that diverge.
 *
 * **The cache, not the document directory.** These files exist to be handed somewhere else; a
 * copy the app keeps forever is storage nobody asked for, and the system may reclaim the cache
 * exactly when it should. The share sheet has already copied what it needs by then.
 *
 * ## This file is why `sink.ts` exists
 *
 * `expo-file-system` and `expo-sharing` reach a device, so nothing that imports them can be
 * rendered by jest. The screen takes a `FileSink`; the route passes this; the suite passes a
 * fake. The lint that bans the filesystem from `src/lens/**` and every route stays untouched,
 * because this is neither.
 */

import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { ExportFile } from '@irodora/export';
import type { FileSink, SaveResult } from './sink';

/**
 * A sink that writes to the cache and opens the share sheet.
 *
 * Built per call rather than held: `Paths.cache` is resolved by the native module, and a module
 * that captured it at import time would be doing native work before any screen decided to
 * export anything.
 */
export function deviceSink(): FileSink {
  return {
    async save(file: ExportFile): Promise<SaveResult> {
      try {
        if (!(await isAvailableAsync()))
          return {
            kind: 'failed',
            detail: 'sharing is not available on this device',
          };

        const target = new File(Paths.cache, file.filename);
        // Overwrite rather than fail: exporting the same palette twice is ordinary, and a
        // second attempt that failed because the first left bytes behind would be a defect
        // somebody could not clear without knowing about a cache directory.
        if (target.exists) target.delete();
        target.create();
        target.write(file.bytes);

        /*
         * `shareAsync` RESOLVES WHETHER OR NOT ANYTHING WAS CHOSEN. The platform sheet reports
         * dismissal on iOS and nothing at all on Android, so this cannot honestly distinguish
         * "saved somewhere" from "dismissed" — and `SaveResult.cancelled` exists for a case
         * this adapter is not able to detect.
         *
         * Reporting `saved` is the lesser wrong: the bytes ARE written, and the screen says
         * which file rather than claiming where it went. Claiming `cancelled` when somebody had
         * saved would be worse, and guessing either way would be inventing an outcome.
         */
        await shareAsync(target.uri, {
          mimeType: file.mediaType,
          dialogTitle: file.filename,
          UTI: file.mediaType,
        });

        return { kind: 'saved', filename: file.filename };
      } catch (error) {
        // The reason, carried out rather than swallowed. A screen that said only "export
        // failed" would produce a bug report nobody can act on.
        return {
          kind: 'failed',
          detail: error instanceof Error ? error.message : 'unknown',
        };
      }
    },
  };
}
