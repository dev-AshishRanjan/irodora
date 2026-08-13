# Data Model

| | |
|---|---|
| **Status** | Baseline · schema lands with F-011 (corpus) and F-034 (tenancy) |
| **Implements** | FR-21, FR-25, FR-39, FR-59, NFR-13, NFR-15 |
| **Decisions** | [ADR-0013](../adr/0013-postgres-drizzle-single-system-of-record.md) · [ADR-0017](../adr/0017-multi-tenancy-and-rls-from-day-one.md) |

---

## 1. Shape of the data

Three regions with different rules:

| Region | Tables | Mutability | Tenancy |
|---|---|---|---|
| **Content** | colours, palettes, rules, sources, versions | Immutable once published | Global |
| **Identity** | tenants, orgs, workspaces, users, memberships, sessions | Mutable | Owns tenancy |
| **User data** | profiles, garments, outfits, recommendations, feedback | Mutable | `tenant_id` + RLS |

Content is global and immutable; user data is tenant-scoped and mutable. Keeping them
apart is what lets the entire catalog be cached at the edge indefinitely while user data
never leaves its tenant.

---

## 2. Conventions

- **Identifiers** — UUIDv7 primary keys. Time-ordered, so index locality is good and
  insert order is meaningful without a separate sequence.
- **Timestamps** — `timestamptz`, always UTC. `created_at`, `updated_at` everywhere;
  `deleted_at` where soft deletion is needed.
- **Money** — integer minor units plus an ISO-4217 currency column. Never a float.
- **Colour storage** — canonical `xyz_x/y/z` as `double precision`, **plus** materialised
  `lab_*`, `oklch_*` and `hex` for query and display. The derived columns are generated
  by the engine at write time, never by the database, so there is exactly one
  implementation of the maths ([E-001](../../.harness/state/effects.json)).
- **Enums** — Postgres enums for closed sets that change with a migration; lookup tables
  for sets content editors change.
- **Soft delete** — only where recovery has genuine value. Anything under a data-subject
  erasure request is hard-deleted and de-indexed (FR-58).

---

## 3. Content

```
color_source
  id · name · source_type · publisher · published_year · licence
  licence_url · rights_holder · notes · verified_by · verified_at
     ▲
     │  every colour cites at least one
     │
japanese_color                                    color_version
  id · slug · classification                        id · label ('2026.08.1')
  name_kanji · name_kana · name_romaji · name_en    published_at · immutable
  xyz_x/y/z · lab_l/a/b · oklch_l/c/h · hex         checksum · notes
  family · temperature · era · material · season
  fashion_use · contemporary_note
  editorial_status · version_id ─────────────────────┘
     │
     ├── color_relation (related · complementary · historical-variant)
     └── palette_color (role: anchor|neutral|light|accent, rank, weight)
              │
           palette
             id · slug · name_en · name_ja · description
             category · aesthetic · classification
             source_id · version_id · editorial_status
```

**`classification`** (FR-23) is a required, displayed field: `historical` ·
`traditional` · `modern-japanese` · `japanese-inspired` · `editorial`. The UI cannot
present an inspired palette as historical because the field is not optional and the
renderer switches on it.

**`editorial_status`**: `draft` → `review` → `verified` → `published` → `superseded`.
Only `published` is served. Reaching `published` requires complete provenance and a
recorded reviewer — enforced by the `content` gate (NFR-20), not by process discipline.

### Rules as content (FR-67)

```
rule_version        id · label · published_at · immutable · checksum
recommendation_weight   rule_version_id · factor · weight · context
harmony_rule            rule_version_id · from_family · to_family · score
                        context[] · source · rationale
```

A weight change publishes a new `rule_version`. Recommendations record which one they
used, so a ranking that changed can be explained rather than guessed at.

---

## 4. Identity and tenancy

```
tenant ──< organization ──< workspace ──< membership >── user
                                              │
                                           role: owner | admin | editor | member | viewer
```

Even the single-brand consumer product carries the full hierarchy from day one. A
consumer user is a tenant with one organisation, one workspace and one member. Retrofitting
tenancy onto a live schema means backfilling every table and every query — the cost of
carrying it now is a column and a policy.

```
user      id · tenant_id · email_hash · display_name · locale
          preferences · created_at
identity  id · user_id · provider · subject · linked_at
session   id · user_id · device_id · issued_at · expires_at · revoked_at
```

Passwords do not appear. Authentication is OIDC and passkeys
([ADR-0015](../adr/0015-auth-oidc-passkeys-no-homegrown-crypto.md)); we store no
credential material.

`email_hash` alongside the encrypted address supports lookup without exposing plaintext
in indexes or query logs.

### Row-level security

Every table holding user data carries `tenant_id NOT NULL` and:

```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <t> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <t>
  USING (tenant_id = current_setting('irodora.tenant_id')::uuid);
```

`FORCE` matters: without it the table owner bypasses the policy, and the application's
migration role is usually the owner.

The setting is established per connection from the authenticated session, never from a
request parameter. A missing setting causes an error, not an empty result — failing open
on a tenancy boundary is the worst possible default.

---

## 5. User data

```
personal_color_profile
  id · tenant_id · user_id · version
  lightness_min/max · temperature_bias · chroma_min/max · contrast_preference
  confidence_lightness · confidence_temperature · confidence_chroma · confidence_contrast
  method: guided | photo-assisted | professional
  neutrals[] · accents[] · avoid[]
```

**Ranges, not points, with per-dimension confidence** (FR-30). There is no `skin_color`
column and there never will be — a schema check rejects a migration that adds one
(NFR-22). The field cannot exist, so the false precision it would imply cannot be built on
top of it.

```
garment
  id · tenant_id · user_id · type · name
  primary_color_id · pattern · material · formality · season[]
  brand · size · purchase_date · cost_minor · currency
  image_key · image_encrypted · wear_count · created_at · updated_at
  device_id · revision · updated_by_device_at        ← sync metadata

garment_color   garment_id · role (primary|secondary|accent) · xyz · lab · oklch
                proportion · provenance_source · provenance_confidence

outfit          id · tenant_id · user_id · name · occasion · created_at
outfit_item     outfit_id · slot · garment_id · locked

recommendation  id · tenant_id · user_id · input_color · context
                envelope_engine · envelope_corpus · envelope_rules · envelope_profile
                results (jsonb) · created_at
recommendation_feedback  recommendation_id · result_index · verdict · created_at
```

`image_key` points at object storage; the bytes never live in Postgres.
`image_encrypted` records that the object is under envelope encryption and which data key
version applies (NFR-13).

The reproducibility envelope is stored as **four separate columns**, not one JSON blob, so
"which recommendations used rule version 2026.08.4?" is an indexed query rather than a
table scan — and that question gets asked every time a ranking change is investigated.

---

## 6. Audit (NFR-15)

```
audit_event
  id · tenant_id · actor_id · actor_type · action · subject_type · subject_id
  before (jsonb) · after (jsonb) · ip_hash · user_agent_hash · occurred_at
```

Append-only: no `UPDATE` or `DELETE` grant exists for the application role. Covers content
publication, entitlement changes, role changes, data exports and erasures.

Chronological only — deliberately no user-facing column sorting. An audit trail that can
be re-ordered invites reading it as a ranking rather than a sequence, and sequence is the
entire evidentiary value.

---

## 7. Indexing

| Need | Index |
|---|---|
| Colour name search | GIN on `to_tsvector` over the name columns |
| Fuzzy / romaji match | `pg_trgm` GIN on `name_romaji`, `name_en` |
| Perceptual nearest | Coarse B-tree on `(lab_l, lab_a, lab_b)` buckets; exact ΔE00 in the engine over the shortlist |
| Wardrobe listing | `(tenant_id, user_id, type, created_at DESC)` |
| Recommendation replay | `(envelope_rules)`, `(envelope_corpus)` |
| Audit | `(tenant_id, occurred_at DESC)`, `(subject_type, subject_id)` |

**Perceptual nearest-neighbour is not a database problem.** ΔE00 is not a metric distance
(it violates the triangle inequality), so no spatial index can answer it correctly. The
database narrows by Lab bucket; the engine ranks exactly. Trying to make Postgres rank by
ΔE00 would produce subtly wrong ordering that nobody would catch.

---

## 8. Migrations

Drizzle. Forward-only; a mistake is corrected by a compensating migration, never by
editing a shipped one.

Applied at boot under `pg_advisory_lock`, so several containers starting simultaneously on
a VPS cannot race — which is the normal case under Coolify and Dokploy, not an edge case.

**Expand/contract for anything destructive.** Add the new column, backfill, dual-write,
switch reads, then drop — across separate releases. A migration that drops a column in the
same release that stops writing it cannot be rolled back.

---

## 9. Retention

| Data | Retention |
|---|---|
| Wardrobe images | Until deleted by the user; hard-deleted and de-indexed on erasure |
| Recommendations | 24 months, then aggregated |
| Audit events | 7 years |
| Sessions | Until expiry + 30 days |
| Analytics events | 25 months, pseudonymous |
| Corpus versions | Indefinitely — reproducibility requires it |

Full policy: [`../compliance/data-governance.md`](../compliance/data-governance.md).
