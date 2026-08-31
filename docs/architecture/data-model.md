# Data Model

| | |
|---|---|
| **Status** | Baseline for R2 · schema lands with F-041 (`@irodora/store`) |
| **Version** | 2.0 · 2026-08-19 |
| **Implements** | FR-21, FR-25, FR-30, FR-39, FR-56, FR-58, NFR-7, NFR-13, NFR-22 |
| **Decisions** | [ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) · [ADR-0014](../adr/0014-offline-first-sqlite-outbox-and-merge-policy.md) (amended) · [ADR-0046](../adr/0046-published-corpus-is-an-immutable-generated-bundle.md) |
| **Supersedes** | Version 1.0 — a PostgreSQL schema with tenancy, row-level security and an audit table, retired with the server tier |

---

## 1. Shape of the data

**One SQLite database file on one device.** It is the system of record; there is no other
copy ([ARCHITECTURE §7](ARCHITECTURE.md#7-data)).

| Region | Where it lives | Mutability |
|---|---|---|
| **Content** | The corpus bundle shipped inside the app | Immutable per version, never written by the app |
| **User data** | The encrypted SQLite database | Mutable, owned entirely by the person holding the phone |

Version 1.0 had a third region — Identity — and a tenancy column on every user table. Both
are gone. **There is one user, so there is nothing to isolate them from.** That is not a
weakening of the old model; a `tenant_id` on a single-tenant database is a column that can
only ever hold one value, and a row-level-security policy over it is a check that can never
fail. Keeping either would have been security theatre.

Content stays out of the database deliberately. It is read-only, it is versioned, and it is
verified by digest at load — so putting it in a mutable store would add a way for it to
become wrong without adding anything.

---

## 2. Conventions

- **Identifiers** — UUIDv7, **generated on the device**. Time-ordered, so index locality is
  good and insert order is meaningful without a sequence. Client-generated because that is
  the half of sync that cannot be retrofitted: a database written with rowid keys cannot be
  merged with another one later without every user reinstalling.
- **Timestamps** — integer milliseconds since epoch, UTC. `created_at`, `updated_at`
  everywhere; `deleted_at` where a tombstone is needed.
- **Money** — integer minor units plus an ISO-4217 currency column. Never a float.
- **Colour storage** — canonical `xyz_x/y/z` as `REAL`, **plus** materialised `lab_*`,
  `oklch_*` and `hex` for query and display. The derived columns are written by the engine,
  never computed in SQL, so there is exactly one implementation of the maths
  ([E-001](../../.harness/state/effects.json)).
- **Enums** — `TEXT` with a `CHECK` constraint. SQLite has no enum type, and a check
  constraint is the honest equivalent: it fails the write rather than the review.
- **Soft delete** — used wherever a row is user-visible, because a tombstone is what makes
  a later sync able to distinguish "deleted" from "never existed". A hard delete is
  reserved for erasure (§7).
- **Foreign keys** — `PRAGMA foreign_keys = ON`, always. SQLite defaults it **off**, which
  means a schema full of `REFERENCES` clauses enforces nothing unless the pragma is set on
  every connection. This is the single most common way a SQLite schema turns out to have no
  referential integrity at all.

---

## 3. Sync-shaped, though sync is not built

Every user-data table carries:

```
id            TEXT    UUIDv7, generated on device
created_at    INTEGER
updated_at    INTEGER
deleted_at    INTEGER NULL          -- tombstone, not a hard delete
```

and every write appends to:

```
change_log
  seq         INTEGER PRIMARY KEY AUTOINCREMENT
  table_name  TEXT
  row_id      TEXT
  op          TEXT CHECK (op IN ('insert','update','delete'))
  at          INTEGER
```

**Nothing reads `change_log` today.** It exists because
[ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) draws a
line between what can be added later and what cannot: a sync protocol can be designed at any
time, but a database written without stable ids and tombstones cannot be reconciled
afterwards. Roughly forty lines now, against a migration on every user's device that has no
server to coordinate it.

It is deliberately **not** an outbox. An outbox implies a destination and a delivery
guarantee, and building either before there is a second device is the mistake this rehaul
corrected.

---

## 4. Content

Shipped as an immutable bundle, not stored in the database
([ADR-0046](../adr/0046-published-corpus-is-an-immutable-generated-bundle.md)):

```
colour entry   slug · names (kanji, kana, romaji, en) · xyz · lab · lch · oklch · hex
               family · temperature · era · material · season[] · classification
               related[] · complementary[] · fashion use
               provenance: source · sourceType · sourceLicence · derivation
                           authoredBy · verifiedBy · verifiedAt
palette        slug · name · classification · roles (anchor|neutral|light|accent)
               editorial provenance
version        id · digest · ledger of per-entry digests
```

The digest is verified at load **even though the app shipped the file**. "We built it" is a
claim about the build, not about the bytes on this device.

### Rules as content (FR-67)

Recommendation weights and harmony rules ship in the same bundle and carry the same
versioning. Changing a weight changes rankings without a code change; every change mints a
version, and that version is recorded in every envelope it produced.

---

## 5. User data

```
personal_color_profile                                          (schema version 3, F-026)
  id · created_at · updated_at · deleted_at
  method: guided | photo-assisted | professional
  lightness_min/max · temperature_bias · chroma_min/max · contrast_preference
  confidence_*   one per dimension, all seven
  origin_*       one per dimension, all seven: derived | user

profile_dimension_color                                          the three list dimensions
  profile_id · dimension (neutrals|accents|avoid) · corpus_slug · position
```

**Ranges, not points, with per-dimension confidence** (FR-30). There is no `skin_color`
column and there never will be — a schema check rejects a migration that adds one (NFR-22).
The field cannot exist, so the false precision it would imply cannot be built on top of it.

That check is `packages/store/src/prohibited.ts`, and it runs from `migrate()` in **both**
directions: over `MIGRATIONS` before a step is applied, and over `sqlite_master` afterwards.
The second half is the one no code review can substitute for — a column that arrived some other
way is invisible to a reading of the migration ladder.

**Seven confidences and seven origins, as columns.** The sketch this section replaced carried
four confidences and no origin at all. FR-26 asks for *"a confidence per dimension"* and names
all seven, and the lists are dimensions; and `origin` is what makes *"a user correction is never
overwritten by re-derivation"* a rule rather than a habit — re-derivation writes into a dimension
only where it reads `derived`. Columns rather than a JSON blob, for the reason the
reproducibility envelope is four columns: *"which dimensions did this person correct?"* is asked
every time a recommendation is investigated, and only a column can carry a CHECK.

The list dimensions are a child table rather than three delimited TEXT columns. A slug list in a
string is a parser, and it would be the second place in the package where corpus slugs are
addressed. The rows carry the sync columns like every other user table, so a slug taken out of
`avoid` is one tombstone rather than a wholesale replacement — and, because
`ARCHIVE_TABLES = [...SYNC_TABLES]`, both tables joined the backup format and its canonical
digest without anyone editing `archive.ts` ([E-023](../../.harness/state/effects.json)).

How the guided path produces these values, and why the confidence ceiling is 0.75, is
[ADR-0072](../adr/0072-a-guided-profile-is-forced-choices-and-confidence-is-agreement.md).

```
saved_color
  id · name · xyz_* · lab_* · oklch_* · hex
  source · confidence            (ADR-0005: provenance is NOT NULL)
  corpus_slug                    which corpus entry this came from, or null
  capture_illuminant · capture_quality · capture_samples · capture_variance
                                 the four facts a CAPTURE owes (F-108, migration 5)

palette
  id · name (en) · name_ja · classification · category · version_id
palette_member
  palette_id · color_id · position (= rank) · role · weight
```

**A user palette is a corpus-schema palette** (FR-49,
[ADR-0067](../adr/0067-a-palette-built-on-a-device-is-validated-by-the-corpus-schema-and-says-it-came-from-a-device.md)).
`parsePalette` runs on it before it is written and again when it is read back, so the two rules
a palette editor breaks — at least one `anchor`, ranks contiguous from 1 — are checked by the
code that defines them rather than by a second copy in a screen.

That is why these columns exist: `palette.id` doubles as the corpus `slug`,
`palette_member.position` is the corpus `rank`, and `corpus_slug` is what lets a stored row be
re-expressed as a slug-addressed member. A second column for the same fact would be a second
thing that can disagree.

**The capture columns are all four or none** (F-108, migration 5). ADR-0005's provenance is a
union: `reference` and `declared` owe nothing, while `estimated` and `calibrated` owe their
`conditions` — illuminant, quality, sample count and variance. F-042 stored the *source*
without them, which made a captured row **unreadable as a `Color`**: there was no honest
provenance to construct, and inventing an illuminant would have been fabricating a measurement
to make a read succeed.

The columns are nullable with no `DEFAULT`, and the read path **refuses** a captured row that
lacks them, by name. It never substitutes, and it never relabels the row `reference` — that
would turn a camera estimate into a published value, which is exactly the back door ADR-0005
exists to close.

**A member copies the corpus colour into `saved_color`.** Not duplication for its own sake: a
palette built against `2026.08.1` keeps the colours the person chose when a later version
supersedes an entry, and `version_id` records which version it was built against. `corpus_slug`
is nullable because a Lens capture (F-040) has no slug and never will.

```
garment
  id · type · name
  primary_color_id · pattern · material · formality · season[]
  brand · size · purchase_date · cost_minor · currency
  wear_count · created_at · updated_at · deleted_at

garment_season  garment_id · season (spring|summer|autumn|winter)
garment_color   garment_id · color_id · role (secondary|accent) · proportion
                -- primary is a column on garment: it is required, and every grouping
                -- query needs it without a join
garment_image   garment_id (UNIQUE) · bytes BLOB · byte_length · width · height · format

outfit          id · name · occasion · created_at · updated_at · deleted_at
outfit_item     outfit_id · slot · garment_id · locked

recommendation  id · input_color · context
                envelope_engine · envelope_corpus · envelope_rules · envelope_profile
                results (JSON) · created_at
recommendation_feedback  recommendation_id · result_index · verdict · created_at
```

**There is no `image_path` column. The bytes are a BLOB in `garment_image`, inside the
SQLCipher database** ([ADR-0078](../adr/0078-wardrobe-images-are-blobs-in-the-encrypted-database.md)).

The paragraph that stood here said the image directory was *"covered by the device's own
protection plus SQLCipher"*, and **that was false in a way worth naming**: SQLCipher encrypts a
database file. It does not reach a directory of images sitting next to it. Those would be
covered by iOS Data Protection and Android FBE — real protection, and neither SQLCipher nor a
key we hold. NFR-13 says *"the database **and any stored imagery** are encrypted with
SQLCipher"*, so an `image_path` column would have made that requirement false while looking
like it satisfied it. F-042 found the contradiction rather than inheriting it.

There is still no `image_encrypted` column and no data-key version, and that part was always
right: there is no envelope encryption to describe, because the blob is inside the encrypted
database and the one key in the Keychain / Keystore already covers it. Version 1.0's per-tenant
data keys protected images from the operator of a shared store. There is no operator and no
shared store.

The two costs are recorded in the ADR rather than discovered later: a blob read is
all-or-nothing, which is why `garment_image` is its own table and why the dimensions are
columns beside the bytes; and `archive.ts` reads `SELECT *`, so photographs join the backup and
its digest ([E-023](../../.harness/state/effects.json)).

The reproducibility envelope is stored as **four separate columns**, not one JSON blob, so
"which recommendations used rule version 2026.08.4?" is an indexed query rather than a table
scan — and that question gets asked every time a ranking change is investigated.

---

## 6. Indexing

| Need | Index |
|---|---|
| Colour name search | FTS5 virtual table over the name columns |
| Fuzzy / romaji match | FTS5 prefix tokens; trigram fallback in the engine for short queries |
| Perceptual nearest | Coarse index on `(lab_l, lab_a, lab_b)` buckets; exact ΔE00 in the engine over the shortlist |
| Wardrobe listing | `(type, created_at DESC) WHERE deleted_at IS NULL` |
| Recommendation replay | `(envelope_rules)`, `(envelope_corpus)` |

**Perceptual nearest-neighbour is not a database problem.** ΔE00 is not a metric distance —
it violates the triangle inequality — so no spatial index can answer it correctly. The
database narrows by Lab bucket; the engine ranks exactly. This is
[ADR-0008](../adr/0008-search-postgres-fts-with-engine-side-perceptual-ranking.md) with
Postgres swapped for FTS5 and its actual decision untouched, because the decision was never
about which database.

The **shortlist bound is what makes the two-stage search equal a full scan.** Too small and
the ranking is wrong in a way no test notices; it is a correctness parameter, not a
performance knob.

---

## 7. Migrations, retention and erasure

**Migrations.** Drizzle, forward-only, applied at app start. No advisory lock — there is
exactly one process, and the concurrent-boot race that lock existed for cannot occur.

A failed migration **leaves the previous database intact** and surfaces an actionable error.
An app that opens a half-migrated database is worse than one that refuses to start, because
the first destroys data quietly and the second only inconveniences someone. Migrations ship
in store builds only, never as an OTA update
([incident-response.md](../operations/incident-response.md)).

Expand/contract still applies to anything destructive: add, backfill, dual-write, switch
reads, then drop — across separate releases.

**A column added by a later migration is nullable with no `DEFAULT`.** A default would be a
value nobody chose standing in for one somebody must — `version_id DEFAULT ''` is a silent blank
wearing a NOT NULL constraint. `NULL` means exactly one thing, *written before this column
existed*, and the read path refuses it by name rather than inventing a substitute. Migration 2
(F-020) is the first to apply this.

A migration reaches further than the tables it names: the archive reads `SELECT *`, so a new
column joins the backup format and its canonical digest without anyone editing `archive.ts`
([E-023](../../.harness/state/effects.json)).

**Retention.** Everything is kept until the person deletes it. There is no operator-side
retention schedule because there is no operator-side copy. Corpus versions are kept
indefinitely; reproducibility requires it.

**Erasure (FR-58).** Immediate, local, and complete: rows are hard-deleted, image files are
removed, and the database is `VACUUM`ed so the pages are actually released rather than left
readable in free space. A soft delete is not erasure, and a tombstone that survives erasure
would defeat it — so erasure clears `change_log` too.

**Backup is the user's export**, and it is the entire durability story. Full policy:
[`../compliance/data-governance.md`](../compliance/data-governance.md).
