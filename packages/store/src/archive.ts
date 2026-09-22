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
import { base64FromBytes, bytesFromBase64 } from './base64.js';
import { ingestImage, ImageRejected } from './image.js';
import type { Driver } from './repository.js';

/**
 * How bytes travel in an archive (F-286).
 *
 * `{ "$bytes": "iVBORw0KGgo…" }` — a TAGGED value rather than a convention about which column
 * is binary. A convention is a rule the next table forgets; a tag is self-describing, can be
 * validated like every other field, and cannot be confused with a string somebody typed.
 *
 * ## What it replaced, and why that could not be left alone
 *
 * `JSON.stringify` renders a `Uint8Array` as `{"0":137,"1":80,…}`. `JSON.parse` gives back a
 * plain object, `driver.run` refuses to bind it, and the `TypeError` is not an `ArchiveError`,
 * so it escapes this module's own error type and the restore rolls back whole. **Every archive
 * ever written holding a photograph is unrestorable**, and the only backup this product has is
 * the one a person exports (ADR-0051 §5). Found by F-241's security review.
 *
 * Base64 is also the honest size: at indent 2 the index-object form costs 20–25 bytes per image
 * byte, so a 4 MB photograph built a ~100 MB string in Hermes. This costs 4/3.
 */
const BYTES_TAG = '$bytes';

/**
 * Tables an archive carries, in a fixed order. `change_log` is deliberately absent — see below.
 *
 * ## An EXPLICIT list since F-241, and not `[...SYNC_TABLES]` any more
 *
 * It was the sync list, and the two questions were being answered by one array: *does this table
 * carry the sync columns* and *does this table belong in a file a person can read*. Those are
 * different questions, and the day they disagreed the answer would have been whichever one the
 * array was originally written for.
 *
 * **`profile_avatar` is the table that made them disagree** (ADR-0105). It carries the sync
 * columns and it is out of the archive, because a photograph of a person's face in a plaintext
 * file is a different kind of disclosure from a photograph of a jumper — and because the picture
 * necessarily still exists in the library it was chosen from, so a restore that omits it costs
 * one tap rather than a loss.
 *
 * **Adding a table here later is safe; removing one is not.** `parseArchive` treats a missing
 * table as empty, so an archive written without a table imports cleanly into a build that expects
 * it. The reverse — files already written carrying a face — cannot be taken back.
 */
export const ARCHIVE_TABLES = [
  'saved_color',
  'palette',
  'palette_member',
  'personal_color_profile',
  'profile_dimension_color',
  'garment',
  'garment_season',
  'garment_color',
  'garment_image',
  'pairing_preference',
  'calibration',
] as const;

/**
 * Which archived column holds an image, declared rather than sniffed (F-286).
 *
 * ## The brand is only as good as the set of writers
 *
 * `putGarmentImage` takes a `SanitisedImage` and no overload takes a buffer, so "every stored
 * photograph passed `ingestImage`" is a type fact **at those call sites**. `importArchive` was
 * not one of them: it writes `INSERT INTO ${table}` from parsed rows, so a hand-edited or
 * hostile archive could put arbitrary bytes in a blob column, and `avatarUri`-style code hands
 * them to the platform decoder with no magic-byte check and no caps. Found by F-241's security
 * review, in the same breath as the encoding above — and **fixing the encoding alone would have
 * made this live in the same commit**, which is why they are one feature.
 *
 * ## Declared, and EXPORTED so the test can hold the declaration to the schema
 *
 * A table that grows a BLOB column and forgets this map stores its bytes unchecked. So the map
 * is asserted complete against the schema — read out of `MIGRATIONS`, `CREATE TABLE` and
 * `ALTER TABLE … ADD COLUMN` alike — rather than trusted.
 *
 * **It is exported for that test, and F-286's review is why.** The first version of the
 * assertion compared the schema against a restated literal and never read this map at all,
 * which is the same shape as the check it was written to be: a guard that agrees with itself.
 *
 * ## One image column per table, and that is a property of the row rather than a shortcut
 *
 * The metadata below — `width`, `height`, `format`, `byte_length` — is taken from the ingested
 * bytes and written onto the ROW. Two image columns in one row would make those four ambiguous,
 * so a second BLOB on an archived table is a design question rather than a map entry, and the
 * test refuses one rather than letting it arrive unnoticed.
 */
export const IMAGE_COLUMNS = { garment_image: 'bytes' } as const satisfies Readonly<
  Partial<Record<(typeof ARCHIVE_TABLES)[number], string>>
>;

/**
 * The declared image column for a table name, or `undefined`.
 *
 * The widening is deliberate and is where the honesty is: `table` is a runtime string from a
 * loop over `ARCHIVE_TABLES`, and asserting it into the map's key type would make TypeScript
 * believe every table has an image column — which then reports the `undefined` check as
 * impossible, exactly as the linter did. The map stays narrow so a typo in it is a type error;
 * the LOOKUP is what admits it might miss.
 */
const imageColumnOf = (table: string): string | undefined =>
  (IMAGE_COLUMNS as Readonly<Record<string, string | undefined>>)[table];

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
  for (const key of Object.keys(row).sort()) {
    const value = row[key];
    // The one transformation on the way out. Everything else a driver returns — a string, a
    // number, null — is already something JSON can carry.
    out[key] = value instanceof Uint8Array ? { [BYTES_TAG]: base64FromBytes(value) } : value;
  }
  return out;
};

/**
 * Does this look like a `Uint8Array` that went through `JSON.stringify`?
 *
 * `{"0":137,"1":80,…}` — every key a decimal index from zero, every value a byte. Recognising
 * it is what turns *"the restore failed with a TypeError"* into a sentence that says what
 * happened, which is the difference between a defect somebody can act on and one they report as
 * "it did not work".
 *
 * `{}` reads as FALSE and falls through to the general "no column holds an object" refusal. An
 * empty blob is unreachable — `CHECK (byte_length > 0)` and `ingestImage` both refuse one — so
 * the distinction costs nothing, and calling `{}` a serialised byte array would be guessing.
 */
const looksLikeSerialisedBytes = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every((k, i) => {
    const byte = value[k];
    return (
      k === String(i) &&
      typeof byte === 'number' &&
      Number.isInteger(byte) &&
      byte >= 0 &&
      byte <= 255
    );
  });
};

/**
 * Turn one archived value back into something a driver can bind.
 *
 * **Parse by matching what is wanted** [[parse-by-matching-what-you-want-not-by-removing-what-you-recognise]].
 * SQLite hands back strings, numbers, nulls and blobs — never an object — so an object here is
 * either the tag or something that does not belong, and both are answered explicitly.
 */
const decodeValue = (table: string, column: string, value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;

  const o = value as Record<string, unknown>;
  const tagged = o[BYTES_TAG];
  if (typeof tagged === 'string') {
    /*
     * ONLY WHERE BYTES ARE DECLARED (F-286's review). The tag was honoured in every column and
     * the ingest runs on one, so `{"$bytes":"…"}` in `saved_color.name` decoded to a blob,
     * skipped `sanitiseImages`, and failed at `driver.run` as a plain `Error` — *"cannot store
     * BLOB value in TEXT column"*. No data was at risk (STRICT refuses it, the transaction rolls
     * back), but an error escaping this module's own type is the exact failure F-286 exists to
     * remove, and a universal tag with a one-column check is an asymmetry worth closing.
     */
    if (imageColumnOf(table) !== column)
      throw new ArchiveError(
        `archive table "${table}" column "${column}" carries a ${BYTES_TAG} value, and that ` +
          'column holds no binary data. Only a declared image column may.',
      );
    try {
      return bytesFromBase64(tagged);
    } catch {
      throw new ArchiveError(
        `archive table "${table}" column "${column}" holds a ${BYTES_TAG} value that is not ` +
          'base64.',
      );
    }
  }

  if (looksLikeSerialisedBytes(o))
    throw new ArchiveError(
      `archive table "${table}" column "${column}" holds binary data written by a build that ` +
        'could not encode it: a byte array serialised as an object of numeric keys. That ' +
        'archive cannot be restored — the images in it were never written in a form anything ' +
        'could read back (F-286). An archive without images from the same build imports ' +
        'normally.',
    );

  throw new ArchiveError(
    `archive table "${table}" column "${column}" holds an object, which no column can.`,
  );
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
 * Put an archived row's image through the same door a chosen one goes through.
 *
 * **The metadata comes from the bytes, not from the file.** A row claiming a 1 × 1 PNG over five
 * megapixels of JPEG would otherwise be stored with dimensions that lie about what it holds —
 * and every caller that trusts `width`/`height`/`format` without re-reading the blob is then
 * reading a claim rather than a fact. `ingestImage` already knows all four, so they are taken
 * from it and the row's own values are overwritten.
 *
 * Rows without an image column, and rows whose image column is absent, pass through untouched.
 */
function sanitiseImages(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const column = imageColumnOf(table);
  if (column === undefined) return row;

  const value = row[column];
  if (value === undefined || value === null) return row;
  if (!(value instanceof Uint8Array))
    throw new ArchiveError(
      `archive table "${table}" column "${column}" must hold binary data, and holds ` +
        `${typeof value}.`,
    );

  try {
    const image = ingestImage(value);
    return {
      ...row,
      [column]: image.bytes,
      byte_length: image.bytes.length,
      width: image.width,
      height: image.height,
      format: image.format,
    };
  } catch (error) {
    // AN IMAGE THE CHECKS REFUSE IS AN ARCHIVE ERROR, not an `ImageRejected` escaping this
    // module: a caller restoring a file should get one kind of failure from one function, which
    // is the whole reason `parseArchive` refuses everything else by name too.
    if (!(error instanceof ImageRejected)) throw error;
    throw new ArchiveError(
      `archive table "${table}" holds an image the checks refuse: ${error.message} Row ` +
        `"${String(row['id'])}".`,
    );
  }
}

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
    const decoded: Record<string, unknown>[] = [];
    for (const row of rows) {
      if (
        typeof row !== 'object' ||
        row === null ||
        typeof (row as { id?: unknown }).id !== 'string'
      )
        throw new ArchiveError(`archive table "${table}" holds a row with no string id`);
      const out: Record<string, unknown> = {};
      for (const [column, value] of Object.entries(row as Record<string, unknown>))
        out[column] = decodeValue(table, column, value);
      decoded.push(out);
    }
    tables[table] = decoded;
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
      for (const raw of archive.tables[table] ?? []) {
        const row = sanitiseImages(table, raw);
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
    /*
     * OVER `SYNC_TABLES`, NOT `ARCHIVE_TABLES` (F-241, ADR-0105).
     *
     * These were the same array until a table was kept OUT of the archive, and erasure is the
     * one place that difference would have been silent: a table outside the export list would
     * have survived "erase everything" on the foreign key's cascade alone, which is the exact
     * trap this feature's own `deleteProfile` had already fallen into once — a cascade fires on
     * a DELETE and most removals here are an UPDATE. **Erasure iterates what EXISTS; the archive
     * iterates what a person may read.**
     *
     * Children before parents: foreign keys are ON, so the reverse order fails — which is the
     * pragma doing its job.
     */
    for (const table of [...SYNC_TABLES].reverse()) driver.exec(`DELETE FROM ${table}`);
    driver.exec('DELETE FROM change_log');
  });
  forgetDatabaseKey(keys);
}
