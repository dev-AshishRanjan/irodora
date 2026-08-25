/**
 * The schema, and the pragmas without which half of it enforces nothing.
 *
 * From [`docs/architecture/data-model.md`](../../../docs/architecture/data-model.md) §2–3.
 * SQL rather than a query builder's DSL because this is the artefact a migration ships: it
 * must be readable as the thing that will actually run on a stranger's phone.
 *
 * ## Sync-shaped, though sync is not built
 *
 * Every user row carries a client-generated UUIDv7 `id`, integer-millisecond `created_at` and
 * `updated_at`, and a `deleted_at` tombstone. Every write appends to `change_log`.
 *
 * **Nothing reads `change_log`.** It exists because
 * [ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
 * §6 draws a line between what can be added later and what cannot: a sync protocol can be
 * designed at any time, but a database written without stable ids and tombstones cannot be
 * reconciled afterwards — and there is no server to coordinate a migration on every device.
 *
 * It is deliberately **not an outbox**. An outbox implies a destination and a delivery
 * guarantee, and building either before there is a second device is the mistake ADR-0051
 * corrected.
 */

/**
 * Pragmas that must run on **every connection**, not once at creation.
 *
 * `foreign_keys` is the one that matters and the one that is nearly always wrong. **SQLite
 * defaults it OFF**, and it is a per-connection setting — so a schema full of `REFERENCES`
 * clauses enforces *nothing at all* unless this runs every time. It looks correct in the DDL,
 * it passes every test that does not deliberately violate a key, and it silently accumulates
 * orphans in production.
 *
 * The conformance suite therefore proves it by **watching a bad write fail**, never by reading
 * the pragma back — reading it back only asserts that the line executed.
 */
export const CONNECTION_PRAGMAS = [
  'PRAGMA foreign_keys = ON',
  // Write-ahead logging: a reader is never blocked by a writer. NFR-17 says a read path may
  // not block, and on a phone the writer is often a background save the user did not start.
  'PRAGMA journal_mode = WAL',
  // FULL rather than NORMAL. NORMAL can lose the last transactions on power loss, and FR-56
  // asks that a write survive a force-quit mid-transaction — which is the case a user
  // actually hits, by swiping the app away.
  'PRAGMA synchronous = FULL',
  'PRAGMA busy_timeout = 5000',
] as const;

/** Schema version. Forward-only; every step is applied in order and never edited afterwards. */
export const SCHEMA_VERSION = 2;

/**
 * The columns every user-data table carries. Written once so a new table cannot forget one —
 * a table without a tombstone is a table that can never be synced, and nothing would report it.
 */
const SYNC_COLUMNS = `
  id          TEXT    NOT NULL PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER`;

/**
 * Migration 1. `STRICT` on every table: without it SQLite accepts a string in an INTEGER
 * column and stores it as a string, which is how a timestamp column ends up holding `'now'`.
 */
export const MIGRATIONS: readonly { readonly version: number; readonly up: string }[] = [
  {
    version: 1,
    up: `
      CREATE TABLE change_log (
        seq         INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name  TEXT    NOT NULL,
        row_id      TEXT    NOT NULL,
        op          TEXT    NOT NULL CHECK (op IN ('insert','update','delete')),
        at          INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX change_log_at ON change_log (at);

      -- A saved colour. Canonical XYZ plus MATERIALISED derived columns: the engine writes
      -- lab_*, oklch_* and hex, and SQL never computes them. Deriving them here would be a
      -- second implementation of the colour maths, which is E-001's whole subject.
      CREATE TABLE saved_color (
        ${SYNC_COLUMNS},
        name        TEXT    NOT NULL,
        xyz_x       REAL    NOT NULL,
        xyz_y       REAL    NOT NULL,
        xyz_z       REAL    NOT NULL,
        lab_l       REAL    NOT NULL,
        lab_a       REAL    NOT NULL,
        lab_b       REAL    NOT NULL,
        oklch_l     REAL    NOT NULL,
        oklch_c     REAL    NOT NULL,
        oklch_h     REAL    NOT NULL,
        hex         TEXT    NOT NULL,
        -- Provenance is not optional on a Color (ADR-0005), so it is not nullable here
        -- either. A row whose origin nobody recorded is the thing the type forbids, and a
        -- database that allows it becomes the back door into the type.
        source      TEXT    NOT NULL CHECK (source IN ('declared','reference','calibrated','estimated','unknown')),
        confidence  REAL    NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0)
      ) STRICT;

      CREATE INDEX saved_color_updated ON saved_color (updated_at);
      CREATE INDEX saved_color_live ON saved_color (deleted_at) WHERE deleted_at IS NULL;

      CREATE TABLE palette (
        ${SYNC_COLUMNS},
        name        TEXT    NOT NULL
      ) STRICT;

      -- The REFERENCES clause here is the reason CONNECTION_PRAGMAS exists. With
      -- foreign_keys off — SQLite's default — this line is documentation.
      CREATE TABLE palette_member (
        ${SYNC_COLUMNS},
        palette_id  TEXT    NOT NULL REFERENCES palette (id) ON DELETE CASCADE,
        color_id    TEXT    NOT NULL REFERENCES saved_color (id) ON DELETE CASCADE,
        position    INTEGER NOT NULL,
        role        TEXT    NOT NULL CHECK (role IN ('anchor','neutral','light','accent'))
      ) STRICT;

      CREATE INDEX palette_member_palette ON palette_member (palette_id, position);
    `,
  },
  {
    version: 2,
    /*
     * F-020. Migration 1 provisioned `palette` and `palette_member` ahead of the feature, and
     * they could not hold what FR-49 requires: *"palettes validate against the same schema as
     * corpus palettes"*, and a `CorpusPalette` carries a Japanese name, a classification, a
     * category, a corpus version and a per-member weight. None of those had a column.
     *
     * `saved_color.corpus_slug` is the other half: without it a row is a colour with no way
     * back to the entry it came from, so a saved palette could never be re-expressed as the
     * slug-addressed record `parsePalette` reads.
     *
     * ## Every column is NULLABLE, and none has a DEFAULT
     *
     * A `DEFAULT` here would be a value nobody chose standing in for one somebody must —
     * `version_id DEFAULT ''` is a silent blank wearing a NOT NULL constraint. `NULL` means
     * exactly one thing: *this row was written before the column existed*. That is a real
     * distinction, the read path refuses it by name, and no row can currently be in that state
     * because nothing has ever written a palette.
     *
     * ## What SQLite will not let this migration add
     *
     * `ALTER TABLE … ADD COLUMN` cannot carry a `CHECK`, so `classification` and `category`
     * have no constraint at the database. They are constrained where the rule actually lives:
     * `parsePalette` rejects anything outside the union, on the way in and on the way back
     * out. A CHECK here would be a SECOND definition of a content rule, in a language with no
     * tests — the shape E-013 exists to keep to one place.
     */
    up: `
      ALTER TABLE saved_color    ADD COLUMN corpus_slug    TEXT;
      ALTER TABLE palette        ADD COLUMN name_ja        TEXT;
      ALTER TABLE palette        ADD COLUMN classification TEXT;
      ALTER TABLE palette        ADD COLUMN category       TEXT;
      ALTER TABLE palette        ADD COLUMN version_id     TEXT;
      ALTER TABLE palette_member ADD COLUMN weight         REAL;

      CREATE INDEX palette_live ON palette (deleted_at) WHERE deleted_at IS NULL;
    `,
  },
];

/** Every table that carries the sync columns. Used by the conformance suite. */
export const SYNC_TABLES = ['saved_color', 'palette', 'palette_member'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
