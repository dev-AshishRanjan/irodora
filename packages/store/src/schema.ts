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
export const SCHEMA_VERSION = 6;

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
  {
    version: 3,
    /*
     * F-026. The personal colour profile, as FR-30 requires it to be: seven dimensions, each a
     * value with its OWN confidence and its OWN origin.
     *
     * ## There is no skin colour column, and there cannot be one
     *
     * NFR-22 and ADR-0010 §1. `prohibited.ts` refuses a migration that adds one and refuses a
     * database that already has one, so this is a check rather than a promise. The absence is
     * the design: the field the false precision would be built on does not exist.
     *
     * ## Seven confidences and seven origins, as columns
     *
     * Not a JSON blob, for the reason data-model.md §5 gives about the reproducibility
     * envelope: "which dimensions did the person correct by hand?" is a question that gets
     * asked every time a recommendation is investigated, and a blob makes it a table scan and
     * a parse. It is also the only shape a CHECK constraint can reach.
     *
     * `origin_*` is what makes acceptance criterion 4 structural. Re-derivation writes into a
     * dimension only when its origin is `derived`; a `user` value is never overwritten. The
     * column is NOT NULL with a CHECK, so a row cannot be silent about which it is.
     *
     * ## Ranges, and the constraint that they are ranges
     *
     * `CHECK (lightness_min <= lightness_max)` is a table-level constraint rather than a rule
     * in the writer, because an inverted range is not a value that means something unusual —
     * it is a value that means nothing, and every reader would have to decide separately what
     * to do with it.
     *
     * ## The lists are a child table
     *
     * `neutrals[] · accents[] · avoid[]` in the sketch. A child table rather than three
     * columns of delimited slugs: a slug list in a TEXT column is a parser, and it would be
     * the second place in this package where corpus slugs are addressed.
     *
     * The rows carry the sync columns like every other user table, so a list that changes is
     * a change the log can describe member by member rather than as a wholesale replacement.
     */
    up: `
      CREATE TABLE personal_color_profile (
        ${SYNC_COLUMNS},
        method                  TEXT NOT NULL CHECK (method IN ('guided','photo-assisted','professional')),

        lightness_min           REAL NOT NULL CHECK (lightness_min >= 0.0 AND lightness_min <= 1.0),
        lightness_max           REAL NOT NULL CHECK (lightness_max >= 0.0 AND lightness_max <= 1.0),
        -- -1 is fully cool, +1 fully warm, 0 no tendency either way. A BIAS, not a category:
        -- FR-30 asks for a tendency with a confidence, and a two-valued column could not carry
        -- "leans warm, but only just".
        temperature_bias        REAL NOT NULL CHECK (temperature_bias >= -1.0 AND temperature_bias <= 1.0),
        chroma_min              REAL NOT NULL CHECK (chroma_min >= 0.0 AND chroma_min <= 1.0),
        chroma_max              REAL NOT NULL CHECK (chroma_max >= 0.0 AND chroma_max <= 1.0),
        contrast_preference     TEXT NOT NULL CHECK (contrast_preference IN ('low','medium','high')),

        confidence_lightness    REAL NOT NULL CHECK (confidence_lightness   >= 0.0 AND confidence_lightness   <= 1.0),
        confidence_temperature  REAL NOT NULL CHECK (confidence_temperature >= 0.0 AND confidence_temperature <= 1.0),
        confidence_chroma       REAL NOT NULL CHECK (confidence_chroma      >= 0.0 AND confidence_chroma      <= 1.0),
        confidence_contrast     REAL NOT NULL CHECK (confidence_contrast    >= 0.0 AND confidence_contrast    <= 1.0),
        confidence_neutrals     REAL NOT NULL CHECK (confidence_neutrals    >= 0.0 AND confidence_neutrals    <= 1.0),
        confidence_accents      REAL NOT NULL CHECK (confidence_accents     >= 0.0 AND confidence_accents     <= 1.0),
        confidence_avoid        REAL NOT NULL CHECK (confidence_avoid       >= 0.0 AND confidence_avoid       <= 1.0),

        origin_lightness        TEXT NOT NULL CHECK (origin_lightness   IN ('derived','user')),
        origin_temperature      TEXT NOT NULL CHECK (origin_temperature IN ('derived','user')),
        origin_chroma           TEXT NOT NULL CHECK (origin_chroma      IN ('derived','user')),
        origin_contrast         TEXT NOT NULL CHECK (origin_contrast    IN ('derived','user')),
        origin_neutrals         TEXT NOT NULL CHECK (origin_neutrals    IN ('derived','user')),
        origin_accents          TEXT NOT NULL CHECK (origin_accents     IN ('derived','user')),
        origin_avoid            TEXT NOT NULL CHECK (origin_avoid       IN ('derived','user')),

        CHECK (lightness_min <= lightness_max),
        CHECK (chroma_min <= chroma_max)
      ) STRICT;

      CREATE INDEX personal_color_profile_live
        ON personal_color_profile (deleted_at) WHERE deleted_at IS NULL;

      CREATE TABLE profile_dimension_color (
        ${SYNC_COLUMNS},
        profile_id  TEXT    NOT NULL REFERENCES personal_color_profile (id) ON DELETE CASCADE,
        dimension   TEXT    NOT NULL CHECK (dimension IN ('neutrals','accents','avoid')),
        -- A corpus slug, like saved_color.corpus_slug. NOT a saved_color reference: these are
        -- entries the person was shown, not colours they saved, and a foreign key here would
        -- create a saved_color row for every recommendation the profile makes.
        corpus_slug TEXT    NOT NULL,
        position    INTEGER NOT NULL
      ) STRICT;

      CREATE INDEX profile_dimension_color_profile
        ON profile_dimension_color (profile_id, dimension, position);
    `,
  },
  {
    version: 4,
    /*
     * F-042. The wardrobe: a garment, its colours, and its photograph.
     *
     * ## Only `type` and one colour are NOT NULL, and that is FR-39 rather than laxity
     *
     * *"Only colour and type are required at creation; every other field is progressively
     * enriched."* Every other column here is nullable **with no DEFAULT**, for the reason
     * migration 2 gives: a default is a value nobody chose standing in for one somebody must,
     * and `formality DEFAULT 'casual'` would be an assertion about a garment nobody looked at.
     * `NULL` means *not recorded yet*, which is the true state of almost every field on a
     * garment somebody added in four seconds.
     *
     * The requirement is enforced in the TYPE as well (`NewGarment`), because a NOT NULL
     * column tells you a value is present and cannot tell you the caller was not forced to
     * invent one.
     *
     * ## `season` is a child table, not a delimited string
     *
     * FR-39 lists `season[]`. A `'spring,summer'` TEXT column is a parser, and it makes
     * "every garment for autumn" a `LIKE '%autumn%'` that also matches nothing useful. Same
     * reasoning as migration 3's `profile_dimension_color`.
     *
     * ## The image is a BLOB in this database, and that is the whole point
     *
     * NFR-13: *"the database AND ANY STORED IMAGERY are encrypted with SQLCipher"*. A file in
     * the app's private directory is covered by the OS, which is real protection and is NOT
     * SQLCipher and NOT a key we hold — so an `image_path` column would have made NFR-13 false
     * while looking like it satisfied it. `data-model.md` §5 said the image directory was
     * "covered by ... SQLCipher"; it is not, and ADR-0078 records the correction along with
     * this decision and its two costs.
     *
     * ONE ROW PER GARMENT, in its own table rather than a column on `garment`, because a blob
     * read is all-or-nothing: `SELECT * FROM garment` for a list screen must not drag every
     * photograph into memory. The split is what makes the list query cheap.
     *
     * `byte_length` and the dimensions are stored beside the bytes so a caller can size a
     * decode — or decide not to — WITHOUT reading the blob. That is the whole reason they are
     * columns rather than something a reader works out from the bytes it just loaded.
     *
     * THERE IS NO DIGEST COLUMN. One was drafted and removed: nothing in F-042 needs it, this
     * package carries no runtime dependency, and SHA-256 here would mean either a second port
     * to install at startup or an implementation of a hash nobody asked for. When the archive
     * needs to compare images without rehydrating them, that is the feature that adds it.
     */
    up: `
      CREATE TABLE garment (
        ${SYNC_COLUMNS},
        -- The two required fields. Everything below is nullable.
        type             TEXT    NOT NULL,
        primary_color_id TEXT    NOT NULL REFERENCES saved_color (id) ON DELETE RESTRICT,

        name             TEXT,
        pattern          TEXT,
        material         TEXT,
        formality        TEXT,
        brand            TEXT,
        size             TEXT,
        purchase_date    TEXT,
        -- Minor units, INTEGER. A REAL price is a rounding error with a currency symbol.
        cost_minor       INTEGER,
        currency         TEXT,
        wear_count       INTEGER NOT NULL DEFAULT 0 CHECK (wear_count >= 0)
      ) STRICT;

      CREATE INDEX garment_live ON garment (deleted_at) WHERE deleted_at IS NULL;
      CREATE INDEX garment_type ON garment (type);
      CREATE INDEX garment_primary_color ON garment (primary_color_id);

      CREATE TABLE garment_season (
        ${SYNC_COLUMNS},
        garment_id TEXT NOT NULL REFERENCES garment (id) ON DELETE CASCADE,
        season     TEXT NOT NULL CHECK (season IN ('spring','summer','autumn','winter'))
      ) STRICT;

      CREATE INDEX garment_season_garment ON garment_season (garment_id);
      CREATE INDEX garment_season_season ON garment_season (season);

      -- Secondary and accent colours. The PRIMARY colour is a column on garment because it is
      -- required and every grouping query needs it without a join; these are the rest.
      CREATE TABLE garment_color (
        ${SYNC_COLUMNS},
        garment_id TEXT NOT NULL REFERENCES garment (id) ON DELETE CASCADE,
        color_id   TEXT NOT NULL REFERENCES saved_color (id) ON DELETE RESTRICT,
        role       TEXT NOT NULL CHECK (role IN ('secondary','accent')),
        proportion REAL CHECK (proportion > 0.0 AND proportion <= 1.0)
      ) STRICT;

      CREATE INDEX garment_color_garment ON garment_color (garment_id);

      CREATE TABLE garment_image (
        ${SYNC_COLUMNS},
        garment_id  TEXT    NOT NULL UNIQUE REFERENCES garment (id) ON DELETE CASCADE,
        bytes       BLOB    NOT NULL,
        byte_length INTEGER NOT NULL CHECK (byte_length > 0),
        width       INTEGER NOT NULL CHECK (width > 0),
        height      INTEGER NOT NULL CHECK (height > 0),
        format      TEXT    NOT NULL CHECK (format IN ('jpeg','png'))
      ) STRICT;

      CREATE INDEX garment_image_garment ON garment_image (garment_id);
    `,
  },
  {
    version: 5,
    /*
     * F-108. The four facts a capture owes, which F-042 did not persist.
     *
     * ## The defect this corrects
     *
     * `colourFromReading` wrote `source: 'estimated'` and nothing else about the capture. But
     * `estimated` is a CapturedSource, and ADR-0005's `CapturedProvenance` REQUIRES
     * `conditions` — illuminant, quality, sampleCount, variance. So the row could not be read
     * back as a `Color` at all: there was no honest provenance to hand `fromXyz`, and
     * inventing the four values would be fabricating measurement facts.
     *
     * The `LensReading` carried all four the whole time. Nothing caught it because nothing
     * had yet read a colour back OUT as a Color — the write path was covered end to end and
     * a column holding the string 'estimated' looks correct until the type is asked for a
     * provenance.
     *
     * ## Nullable, no DEFAULT, and all four move together
     *
     * Migration 2's convention and its reason: a default here would be a measurement nobody
     * took wearing the shape of one somebody did. NULL means exactly "written before this
     * column existed", and the read path refuses such a row BY NAME rather than substituting
     * — and specifically never downgrades it to 'reference', which would relabel a camera
     * estimate as a published value.
     *
     * ALTER TABLE cannot carry a CHECK, so the vocabularies are enforced where they are
     * already defined: the reader refuses an illuminant or a quality outside the union, the
     * same move migration 2 makes for classification.
     */
    up: `
      ALTER TABLE saved_color ADD COLUMN capture_illuminant TEXT;
      ALTER TABLE saved_color ADD COLUMN capture_quality    TEXT;
      ALTER TABLE saved_color ADD COLUMN capture_samples    INTEGER;
      ALTER TABLE saved_color ADD COLUMN capture_variance   REAL;
    `,
  },
  {
    version: 6,
    /*
     * F-046. Preference feedback, as COUNTS.
     *
     * ## What is stored is what somebody did, not what we concluded from it
     *
     * The obvious shape is one `weight REAL` column nudged on each observation. It is wrong,
     * and the reason is worth the paragraph: a running float depends on the ORDER the updates
     * arrived in and on the HISTORY of the update function. Change the step size in a later
     * release and every stored weight silently means something else, with nothing anywhere
     * able to detect it.
     *
     * `accepted` and `rejected` are facts. The weight is `preferenceWeight()` in
     * @irodora/recommendation, evaluated on demand. So FR-37's "deterministic" is true by
     * construction, "inspectable" is real — these two integers ARE the evidence — and the
     * formula can be corrected without corrupting anything.
     *
     * ## The pair is canonically ordered, and the UNIQUE constraint is what enforces it
     *
     * A pairing is unordered: rust with charcoal is charcoal with rust. Without one row per
     * unordered pair the same preference is learned twice under two keys and half of it is
     * never found — the recommender would appear to forget, depending on which garment was in
     * hand. The writer sorts; `UNIQUE (family_a, family_b)` is what makes a second row
     * impossible rather than merely unlikely.
     *
     * ## Families, not individual colours
     *
     * 25 families over 120 published entries, counted rather than assumed. Keyed on exact
     * colours the space would be 120 x 120 and a person would have to pick the same two
     * published entries repeatedly for anything to move — the loop would be correct and inert.
     *
     * ## This table never leaves the device and never becomes content
     *
     * FR-37: "feedback affects only the submitting user, never global ranking". There is no
     * server to send it to (ADR-0051), and the published rule weights are content with their
     * own version and digest — this is a LOCAL multiplier applied on top, and nothing here can
     * write into them.
     */
    up: `
      CREATE TABLE pairing_preference (
        ${SYNC_COLUMNS},
        family_a  TEXT    NOT NULL,
        family_b  TEXT    NOT NULL,
        accepted  INTEGER NOT NULL DEFAULT 0 CHECK (accepted >= 0),
        rejected  INTEGER NOT NULL DEFAULT 0 CHECK (rejected >= 0),
        -- Canonical order, enforced rather than trusted. Without it the same pairing can be
        -- stored twice and the second copy is invisible to every read.
        CHECK (family_a <= family_b),
        UNIQUE (family_a, family_b)
      ) STRICT;

      CREATE INDEX pairing_preference_live
        ON pairing_preference (deleted_at) WHERE deleted_at IS NULL;
    `,
  },
];

/** Every table that carries the sync columns. Used by the conformance suite. */
export const SYNC_TABLES = [
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
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];
