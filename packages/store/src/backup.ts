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

import { eraseEverything, exportArchive, type Archive } from './archive.js';
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
