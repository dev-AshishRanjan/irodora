# ADR-0105 — A face stays out of the plaintext archive, and the export list stops being the sync list

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-21 |
| **Feature** | F-241 |
| **Amends** | `ARCHIVE_TABLES = [...SYNC_TABLES]` in [`packages/store/src/archive.ts`](../../packages/store/src/archive.ts). [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) §5's plaintext archive is unchanged; FR-58 is unchanged. |

---

## Context

F-241 gives the profile an avatar: a picture chosen from the photo library, stored as a BLOB in
the SQLCipher database beside the wardrobe photographs ([ADR-0078](0078-wardrobe-images-are-blobs-in-the-encrypted-database.md)).

The archive is **plaintext JSON on purpose**, and ADR-0051 §5 states the cost rather than
discovering it:

> A file copy is a copy of an **encrypted** database: useless without the key, and shipping the key
> alongside makes the encryption theatre. […] Most of all: **a backup the user cannot read is not a
> backup they own.** […] The cost, stated rather than discovered: the archive is plaintext.
> Readable by the user, which is the point — and by anyone who obtains the file, which is the price.

`ARCHIVE_TABLES` was `[...SYNC_TABLES]`, and `garment_image` is in it — so photographs are already
exported in the clear. Migration 8 drew the line the other way for settings: *"an export is what
somebody made; their choice of theme is not part of it."* An avatar **is** something somebody
chose, so by that test it belongs in the export, and F-241's plan proposed exactly that.

**F-241's security review recommended the opposite**, and this ADR records the reversal.

## Decision

**`profile_avatar` is not in the archive.** `ARCHIVE_TABLES` becomes an explicit list rather than
a copy of `SYNC_TABLES`, and the table stays in `SYNC_TABLES` because it does carry the sync
columns. Erasure iterates `SYNC_TABLES`; the archive iterates `ARCHIVE_TABLES`.

Three arguments decided it, in order of weight:

1. **A face is a change in kind, not a change in degree.** A garment photograph is a picture of a
   thing. An avatar is the first directly identifying datum this product has ever held — there is
   no account, no name, no email, and `Avatar.tsx` cannot draw initials precisely *because* nothing
   here knows a name. An archive holding `personal_color_profile` and `profile_dimension_color` is
   appearance data about an anonymous person; add the avatar and the same readable file is
   appearance data **attached to an identifiable face**.
2. **The cost of leaving it out is one tap, and that is not true of the precedent.** The only
   source of an avatar is `pickFromLibrary()` — there is no camera path (F-241 asserts it) — so the
   picture necessarily still exists in the library it came from. A garment photograph can come from
   `captureWithCamera()` and may exist nowhere but the database, which is why the same reasoning
   does not move `garment_image`.
3. **The decision is reversible in one direction only.** `parseArchive` treats a missing table as
   empty, so a build that later includes it reads an older archive cleanly. Files already written
   carrying somebody's face cannot be recalled.

## Consequences

**A restore does not bring the picture back.** The person re-chooses it, and the export copy has to
say so — an omission a person discovers is worse than one they were told about. No app surface
exports an archive today (`backup.ts` exists; nothing in `apps/mobile` calls it), so that copy lands
with the surface.

**Two lists that used to be one can now drift.** The mitigation is that they answer different
questions and say so where they are declared: `SYNC_TABLES` is *carries the sync columns*,
`ARCHIVE_TABLES` is *a person may read this*. `eraseEverything` was moved onto `SYNC_TABLES` in the
same change, because a table outside the export list would otherwise have survived *erase
everything* on a foreign key cascade — and a cascade fires on a `DELETE` while most removals here
are an `UPDATE`. That is the same trap F-241's own `deleteProfile` had already fallen into once.

**`digest()` no longer covers the table**, so the round-trip proof says nothing about avatars. That
is correct — there is no round trip to prove — and it is stated here so nobody reads the digest as
a guarantee about every table.

**The tombstone is emptied**, which is a separate change from the same review and is what makes
this one honest: the archive reads tombstoned rows deliberately, so a face somebody had *removed*
would have been exported even under a rule that excluded live ones. `clearProfileAvatar` and
`deleteProfile` now blank the blob while keeping the row.

## Alternatives taken seriously

**Include it, as the plan proposed.** Consistent with `garment_image`, keeps `ARCHIVE_TABLES` a
one-line derivation, and makes *export everything* literally true. Rejected on argument 1, and
weakened further by a finding the same review made: BLOB columns do not survive the archive's JSON
round trip at all today (`Uint8Array` serialises as `{"0":137,…}` and cannot be bound on import), so
inclusion would have paid the full disclosure cost for a restore that cannot happen. That defect is
recorded as its own feature and must land with ingest-on-import before any export surface ships.

**Encrypt the archive instead.** Directly contradicts ADR-0051 §5: a backup a person cannot read is
not one they own, and shipping the key beside it is theatre. Rejected without much difficulty.

**Ask the person at export time.** A checkbox is a decision handed to somebody who has to model the
consequence, at the moment they are trying to do something else — and the default would decide it
for nearly everyone anyway. A surface may still offer it later; it is not a reason to include the
table now, when the direction that can be reversed is exclusion.
