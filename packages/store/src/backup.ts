/**
 * The backup service: an archive, a place to put it, and the confirmation before destruction.
 *
 * File access is behind an interface for the same reason the keystore is (F-041): the package
 * stays testable anywhere, and the part that can be wrong in a way no device would reveal —
 * the ORDER of the steps — becomes a test rather than a hope.
 *
 * ## The order is the whole feature
 *
 * FR-58: *"the app prompts for an export before any destructive action"*. Not after, and not
 * "offers an export in the settings screen somewhere". With no server there is no other copy,
 * so a destructive action that runs before the user has been offered a backup is the one
 * moment this product can lose data permanently.
 *
 * `eraseWithBackupPrompt` enforces that sequence, so a caller cannot get it wrong by writing
 * the two calls in the order that reads more naturally.
 */

import {
  ArchiveError,
  eraseEverything,
  exportArchive,
  parseArchive,
  type Archive,
} from './archive.js';
import type { SecureKeyStore } from './key.js';
import type { Driver } from './repository.js';

/** Somewhere to put an archive. `expo-file-system` on the device; a map in tests. */
export interface ArchiveSink {
  /** Write the archive. Returns where it went, for the confirmation message. */
  write(name: string, contents: string): string;
}

/** Asks the person. Returns what they chose. */
export interface DestructiveConfirm {
  /** Offer a backup first. `true` means export before erasing. */
  offerExport(): boolean;
  /** Final confirmation. `false` cancels everything. */
  confirmErase(): boolean;
}

export interface EraseOutcome {
  readonly erased: boolean;
  /** Where the backup went, if one was taken. */
  readonly backupPath: string | undefined;
}

/** `irodora-backup-2026-08-20.json` — a name a person can find again. */
export function archiveFileName(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `irodora-backup-${String(d.getUTCFullYear())}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}.json`;
}

export function serialiseArchive(archive: Archive): string {
  return JSON.stringify(archive, null, 2);
}

/**
 * What an archive may be before it is refused unread (F-288).
 *
 * ## The threat model described this control for a year before it existed
 *
 * Boundary ③'s import-bomb row said *"hard limits on bytes and record count before parsing"*.
 * There were none. `F-286`'s review found the row describing a check nobody had written, `F-286`
 * marked it `none yet`, and this is the check. It matters more since that feature: the import
 * path now base64-decodes every image payload into memory, so an archive is the largest untrusted
 * input this product accepts.
 *
 * ## The numbers are derived, and the arithmetic is here so raising one is a decision
 *
 * A cap that refuses a legitimate backup is worse than no cap.
 *
 * - **`maxBytes`** — a photograph arrives through the picker at `quality: 0.8`, so one to three
 *   megabytes, and base64 costs 4/3. 256 MiB is roughly **a hundred garments with photographs**,
 *   and `DEFAULT_IMAGE_LIMITS.maxBytes` bounds the worst single one at 12 MiB. A phone cannot
 *   hold a string much past this anyway, which is the honest reason it is not larger.
 * - **`maxRows`** — a wardrobe of five hundred garments with their seasons, colours and
 *   preferences is a few thousand rows. 200,000 is two orders of magnitude clear of a real
 *   archive and still bounds the insert loop.
 * - **`maxDepth`** — the archive's own shape is six levels: root, `tables`, a table, a row, a
 *   value, a `$bytes` wrapper.
 *
 * Passable per call, like `ImageLimits`, so a limit is a value a reader can find rather than a
 * number buried in a condition.
 */
export interface ArchiveLimits {
  readonly maxBytes: number;
  readonly maxRows: number;
  readonly maxDepth: number;
}

export const DEFAULT_ARCHIVE_LIMITS: ArchiveLimits = {
  maxBytes: 256 * 1024 * 1024,
  maxRows: 200_000,
  maxDepth: 32,
};

/**
 * How deep the nesting goes, counted without parsing.
 *
 * A second parser is a shape this repository distrusts, so this is one loop over one string that
 * counts only brackets **outside** string literals, with `\\` handled. `{"a":"[[[[["}` is depth
 * 1, and the test plants it both ways.
 *
 * It exists because `JSON.parse` answers a four-hundred-deep file with a stack overflow — a
 * `RangeError`, which is not an `ArchiveError`, which is the failure `F-286` spent a feature
 * removing from this module.
 */
function maxNestingOf(text: string): number {
  let depth = 0;
  let deepest = 0;
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') {
      depth += 1;
      if (depth > deepest) deepest = depth;
    } else if (ch === '}' || ch === ']') depth -= 1;
  }
  return deepest;
}

/**
 * Read an archive from the text of a file — the missing half of {@link serialiseArchive}.
 *
 * **The bounds act before `JSON.parse`, which is the only place they can do anything.** By the
 * time `parseArchive` sees an object the allocation has already happened, and that is exactly
 * what an import bomb is for.
 */
export function deserialiseArchive(text: string, limits: ArchiveLimits = DEFAULT_ARCHIVE_LIMITS) {
  if (text.length > limits.maxBytes)
    throw new ArchiveError(
      `archive is ${String(text.length)} bytes, past the ${String(limits.maxBytes)}-byte limit. ` +
        'Refused before parsing, because parsing it is what it would cost.',
    );

  const depth = maxNestingOf(text);
  if (depth > limits.maxDepth)
    throw new ArchiveError(
      `archive nests ${String(depth)} deep, past the ${String(limits.maxDepth)} limit. An ` +
        'Irodora archive is six levels deep; this is not one.',
    );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ArchiveError(
      `archive is not JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const archive = parseArchive(parsed);
  assertRowCount(archive, limits);
  return archive;
}

/** Total rows across every table — the bound on what an import will insert. */
export function assertRowCount(archive: Archive, limits: ArchiveLimits = DEFAULT_ARCHIVE_LIMITS) {
  let rows = 0;
  for (const table of Object.values(archive.tables)) rows += table.length;
  if (rows > limits.maxRows)
    throw new ArchiveError(
      `archive holds ${String(rows)} rows, past the ${String(limits.maxRows)} limit.`,
    );
}

/**
 * Erase everything, having offered a backup first.
 *
 * **Nothing is erased if the export was requested and failed.** Losing the data *and* the
 * backup in one action is the worst outcome available here, and it is the one a naive
 * try/catch produces by carrying on.
 */
export function eraseWithBackupPrompt(
  driver: Driver,
  keys: SecureKeyStore,
  sink: ArchiveSink,
  confirm: DestructiveConfirm,
  now: number,
): EraseOutcome {
  let backupPath: string | undefined;

  // The offer comes FIRST — before the confirmation, and long before the erase.
  if (confirm.offerExport()) {
    // Deliberately NOT wrapped in a try/catch that continues. If the user asked for a backup
    // and it could not be written, erasing anyway destroys the only copy.
    backupPath = sink.write(archiveFileName(now), serialiseArchive(exportArchive(driver, now)));
  }

  if (!confirm.confirmErase()) return { erased: false, backupPath };

  eraseEverything(driver, keys);
  return { erased: true, backupPath };
}
