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
personal_color_profile
  id · version
  lightness_min/max · temperature_bias · chroma_min/max · contrast_preference
  confidence_lightness · confidence_temperature · confidence_chroma · confidence_contrast
  method: guided | photo-assisted | professional
  neutrals[] · accents[] · avoid[]
```

**Ranges, not points, with per-dimension confidence** (FR-30). There is no `skin_color`
column and there never will be — a schema check rejects a migration that adds one (NFR-22).
The field cannot exist, so the false precision it would imply cannot be built on top of it.

```
garment
  id · type · name
  primary_color_id · pattern · material · formality · season[]
  brand · size · purchase_date · cost_minor · currency
  image_path · wear_count · created_at · updated_at · deleted_at

garment_color   garment_id · role (primary|secondary|accent) · xyz · lab · oklch
                proportion · provenance_source · provenance_confidence

outfit          id · name · occasion · created_at · updated_at · deleted_at
outfit_item     outfit_id · slot · garment_id · locked

recommendation  id · input_color · context
                envelope_engine · envelope_corpus · envelope_rules · envelope_profile
                results (JSON) · created_at
recommendation_feedback  recommendation_id · result_index · verdict · created_at
```

`image_path` points into the app's private, OS-protected storage. There is no `image_encrypted`
column and no data-key version, because there is no envelope encryption to describe: the
**whole database and the image directory are covered by the device's own protection plus
SQLCipher**, with the key in the Keychain / Keystore (NFR-13). Version 1.0's per-tenant data
keys protected images from the operator of a shared store. There is no operator and no shared
store.

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

**Retention.** Everything is kept until the person deletes it. There is no operator-side
retention schedule because there is no operator-side copy. Corpus versions are kept
indefinitely; reproducibility requires it.

**Erasure (FR-58).** Immediate, local, and complete: rows are hard-deleted, image files are
removed, and the database is `VACUUM`ed so the pages are actually released rather than left
readable in free space. A soft delete is not erasure, and a tombstone that survives erasure
would defeat it — so erasure clears `change_log` too.

**Backup is the user's export**, and it is the entire durability story. Full policy:
[`../compliance/data-governance.md`](../compliance/data-governance.md).
