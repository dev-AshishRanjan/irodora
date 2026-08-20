/**
 * Export, import, erasure — the whole durability story (FR-58,
 * [ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) §5).
 *
 * With no server, a lost phone is lost data. That is why this is a first-release feature and
 * not a follow-up, and why the product says so plainly rather than implying a safety net it
 * does not have.
 *
 * ## "Byte-identical" is interpreted here, deliberately and in the open
 *
 * FR-58 asks that an export *"re-imports to a byte-identical database"*. Taken literally that
 * is unmeetable: a SQLite **file** differs in page layout, freelist state and `AUTOINCREMENT`
 * sequence after an identical sequence of writes, so no import could ever satisfy it and the
 * criterion would eventually be softened quietly instead of deliberately.
 *
 * The claim worth making is that **the data** round-trips exactly, so `digest()` is a canonical
 * serialisation — every table in a declared order, every row including tombstones, every column
 * in a declared order — and *that* is compared byte for byte.
 *
 * ## Why the archive is JSON and not a copy of the file
 *
 * A file copy is a copy of an **encrypted** database: useless without the key, and shipping the
 * key alongside makes the encryption theatre. It also pins SQLite's page format into a user's
 * backup. Most of all: **a backup the user cannot read is not a backup they own**, and
 * portability is what FR-58 is for.
 *
 * The cost, stated rather than discovered: the archive is plaintext. Readable by the user,
 * which is the point — and by anyone who obtains the file, which is the price.
 */

import { SCHEMA_VERSION, SYNC_TABLES } from './schema.js';
import { forgetDatabaseKey, type SecureKeyStore } from './key.js';
import type { Driver } from './repository.js';

/** Tables an archive carries, in a fixed order. `change_log` is deliberately absent — see below. */
export const ARCHIVE_TABLES = [...SYNC_TABLES] as const;

export interface Archive {
  readonly format: 'irodora.archive';
  readonly schemaVersion: number;
  readonly exportedAt: number;
  /** table name → rows, each row's keys sorted. */
  readonly tables: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
}

/** Column order is declared by sorting, so two runs cannot differ on key insertion order. */
const canonicalRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row).sort()) out[key] = row[key];
  return out;
};

/**
 * Every row of every archived table, in a declared order.
 *
 * **Tombstones are included.** A deleted row is a fact — it is what lets a future sync tell
 * "deleted" from "never existed" — and an export that dropped tombstones would silently
 * resurrect deletions on the next import.
 */
function readTables(driver: Driver): Archive['tables'] {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of ARCHIVE_TABLES) {
    const rows = driver.query<Record<string, unknown>>(
      // ORDER BY id, not rowid: rowid ordering is an artefact of insertion and would make the
      // digest depend on the order rows happened to be written rather than on their content.
      `SELECT * FROM ${table} ORDER BY id`,
    );
    tables[table] = rows.map(canonicalRow);
  }
  return tables;
}

/**
 * A canonical digest of the data. **This is what "identical" means here.**
 *
 * `change_log` is excluded on purpose: its `seq` is an `AUTOINCREMENT` that restarts on a fresh
 * database, so including it would make every restore differ for a reason that says nothing
 * about whether the user's data survived. The rows it describes are all present and compared.
 */
export function digest(driver: Driver): string {
  return JSON.stringify(readTables(driver));
}

/** Build an archive from a database. */
export function exportArchive(driver: Driver, now: number): Archive {
  return {
    format: 'irodora.archive',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    tables: readTables(driver),
  };
}

export class ArchiveError extends Error {}

/**
 * Validate untrusted input into an `Archive`.
 *
 * Every field is checked because every field arrives from a file on a device — possibly hand
 * edited, possibly from another application entirely, possibly truncated by a failed write.
 * The failure to avoid is a partial import: half a restore is worse than a refused one,
 * because the refusal is visible and the half is not.
 */
export function parseArchive(input: unknown): Archive {
  if (typeof input !== 'object' || input === null)
    throw new ArchiveError('not an Irodora archive: expected an object');

  const o = input as Record<string, unknown>;
  if (o['format'] !== 'irodora.archive')
    throw new ArchiveError('not an Irodora archive: the format field does not match');

  const schemaVersion = o['schemaVersion'];
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1)
    throw new ArchiveError('archive has no usable schemaVersion');

  const exportedAt = o['exportedAt'];
  if (typeof exportedAt !== 'number' || !Number.isFinite(exportedAt))
    throw new ArchiveError('archive has no usable exportedAt');

  const tablesRaw = o['tables'];
  if (typeof tablesRaw !== 'object' || tablesRaw === null)
    throw new ArchiveError('archive has no tables');

  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const table of ARCHIVE_TABLES) {
    const rows = (tablesRaw as Record<string, unknown>)[table];
    // A MISSING table is accepted as empty; a table that is present but not an array is not.
    // The first is an older archive written before that table existed; the second is
    // corruption, and treating them the same would import garbage as emptiness.
    if (rows === undefined) {
      tables[table] = [];
      continue;
    }
    if (!Array.isArray(rows)) throw new ArchiveError(`archive table "${table}" is not an array`);
    for (const row of rows)
      if (
        typeof row !== 'object' ||
        row === null ||
        typeof (row as { id?: unknown }).id !== 'string'
      )
        throw new ArchiveError(`archive table "${table}" holds a row with no string id`);
    tables[table] = rows as Record<string, unknown>[];
  }

  return { format: 'irodora.archive', schemaVersion, exportedAt, tables };
}

/**
 * Restore an archive into an **empty** database.
 *
 * Two refusals, and both are the difference between a restore and a disaster:
 *
 * - **A newer `schemaVersion` is refused**, not guessed at. An older app writing into a schema
 *   it does not understand is how data is lost, and it is the same rule `migrate()` applies.
 * - **A non-empty database is refused**, not merged. A silent merge is how a restore
 *   duplicates everything a user owns, and it looks like it worked.
 */
export function importArchive(driver: Driver, input: unknown): void {
  // `unknown`, NOT `Archive`. An archive arrives from a FILE the user chose — it is untrusted
  // input, and typing the parameter as `Archive` would be the type asserting a fact about
  // data nobody has checked. The lint caught that: with `Archive` as the parameter type, the
  // format check below was flagged as a comparison that is always false, which is precisely
  // the type describing a guarantee the runtime does not have.
  const archive = parseArchive(input);

  if (archive.schemaVersion > SCHEMA_VERSION)
    throw new ArchiveError(
      `archive is at schema version ${String(archive.schemaVersion)}, newer than this build ` +
        `understands (${String(SCHEMA_VERSION)}). Importing it would mean writing data this ` +
        'app cannot interpret. Update the app and try again.',
    );

  for (const table of ARCHIVE_TABLES) {
    const [existing] = driver.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    if ((existing?.n ?? 0) > 0)
      throw new ArchiveError(
        `refusing to import into a database that already holds rows in "${table}". A merge ` +
          'would duplicate everything and would look like it worked. Erase first, or import ' +
          'into a fresh install.',
      );
  }

  driver.transaction(() => {
    for (const table of ARCHIVE_TABLES) {
      for (const row of archive.tables[table] ?? []) {
        const columns = Object.keys(row).sort();
        driver.run(
          `INSERT INTO ${table} (${columns.join(', ')}) ` +
            `VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map((c) => row[c]),
        );
        // The restore is itself a change: a future reconciliation must be able to see that
        // these rows arrived, and when.
        driver.run('INSERT INTO change_log (table_name, row_id, op, at) VALUES (?, ?, ?, ?)', [
          table,
          String(row['id']),
          'insert',
          archive.exportedAt,
        ]);
      }
    }
  });
}

/**
 * Erase everything, locally and immediately (FR-58).
 *
 * **A tombstone is the opposite of erasure.** Soft delete exists so a future sync can tell
 * "deleted" from "never existed"; erasure exists so nothing remains to tell anything about. So
 * this is a hard `DELETE` on every table, `change_log` included — and then the key.
 *
 * **Destroying the key is the part that makes it true of bytes already on disk.** A file delete
 * leaves recoverable blocks and a row-by-row delete leaves them too; without the key those
 * blocks are ciphertext nobody can read.
 *
 * It returns nothing. FR-58's own criterion says the return value is not the proof, and a
 * function that returns `true` invites exactly the test that proves nothing.
 */
export function eraseEverything(driver: Driver, keys: SecureKeyStore): void {
  driver.transaction(() => {
    // Children before parents: foreign keys are ON, so the reverse order fails — which is the
    // pragma doing its job, and a reason not to write this loop over SYNC_TABLES in order.
    for (const table of [...ARCHIVE_TABLES].reverse()) driver.exec(`DELETE FROM ${table}`);
    driver.exec('DELETE FROM change_log');
  });
  forgetDatabaseKey(keys);
}
