# Plan: F-241 — The profile can carry an avatar, and it never leaves the device

| | |
|---|---|
| **Feature** | F-241 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-26, NFR-13, NFR-12 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui` · `@irodora/store` |
| **Author** | implementing session |
| **Date** | 2026-09-21 |

---

## Intent

`23` draws a small round photograph at the head of the finished profile. A person can choose one
from their library, it is kept in the encrypted database with their wardrobe photographs, and the
brand mark stands in its place until they do. **Nothing reads it.** No face is detected, no colour
is sampled, and ADR-0010's promise that a profile can be built without a camera is untouched —
this is decoration, and the point of the feature is that it stays decoration.

## Approach

**Reused.** The `ImageSource` port and `devicePicker()` (F-043) — the picker asks for bytes rather
than a URI precisely so no photograph becomes a file this app manages (NFR-12, ADR-0026).
`ingestImage` (F-050): magic-byte format check, byte and dimension bounds, EXIF stripped, so the
GPS coordinates in a library photograph never reach the database. The `garment_image` table's
shape, down to its `ON DELETE CASCADE`. `gallery.ts`'s bytes → `data:` URI encode. `Mark` from
`brand.tsx` for the absent state. `Screen`, which already owns the header the avatar sits in.

**New.** A migration adding `profile_avatar`; four repository methods; `Avatar` in `@irodora/ui`;
an optional `lead` slot on `Screen`; the picker wiring and the copy.

### Where it is stored, and what deletes it

One table, the same shape as `garment_image`, hanging off the profile rather than off a garment:

```sql
CREATE TABLE profile_avatar (
  ${SYNC_COLUMNS},
  profile_id  TEXT    NOT NULL UNIQUE REFERENCES personal_color_profile (id) ON DELETE CASCADE,
  bytes       BLOB    NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length > 0),
  width       INTEGER NOT NULL CHECK (width > 0),
  height      INTEGER NOT NULL CHECK (height > 0),
  format      TEXT    NOT NULL CHECK (format IN ('jpeg','png'))
) STRICT;
```

`UNIQUE` because a profile has one picture and replacing it is the ordinary case.

**The cascade is a backstop, not the mechanism**, and increment 2 found this before writing the
code: `deleteProfile` tombstones with an `UPDATE`, and `ON DELETE CASCADE` fires on a `DELETE`.
Its own comment already says so about `profile_dimension_color` — *"a cascade fires on a DELETE and
this is an UPDATE, so the list entries would stay live under a deleted profile and nothing would
report it"*. So the avatar is tombstoned explicitly beside them: **forgetting the profile has to
forget the face**, and an avatar that outlived its profile would be a photograph of a person with
nothing left to explain why it was kept. The test asserts the tombstone, with a decoy proving a
second profile keeps its own.

### The one decision that is not mine, and goes to the security reviewer

`ARCHIVE_TABLES` is `[...SYNC_TABLES]`, and **the archive is plaintext JSON on purpose**:
*"a backup the user cannot read is not a backup they own … the archive is plaintext. Readable by
the user, which is the point — and by anyone who obtains the file, which is the price."*
`garment_image` is already in it, so a wardrobe photograph is already in the clear in an export.

Putting `profile_avatar` in `SYNC_TABLES` therefore means **a photograph of the person's face in a
plaintext file**. Leaving it out means an export that silently drops something a person chose, and
a restore that comes back without their picture.

This plan took the **consistent** option — in, beside `garment_image`.

**THE SECURITY REVIEW RECOMMENDED THE OPPOSITE, AND IT WAS RIGHT** (ADR-0105). A face is the first
directly identifying datum this product holds; the cost of leaving it out is one tap, because the
only source is the library and the picture is still there; the decision is reversible in one
direction only; and inclusion bought no restore fidelity at all, because BLOB columns do not
survive the archive's JSON round trip today. `profile_avatar` is out of `ARCHIVE_TABLES`, which
stopped being `[...SYNC_TABLES]`, and `eraseEverything` moved onto `SYNC_TABLES` so a table outside
the export list is still erased.

The original reasoning is kept above rather than deleted: it was the argument the review answered,
and writing the decision down as *"to be signed off"* rather than discovering it in the diff is what
made the review able to answer it at all.

**No app surface exports an archive today** (`backup.ts` exists; nothing in `apps/mobile` calls it),
so this settled the shape a backup will have when it ships rather than a file anyone can produce
this week — which is also why excluding the table now costs nothing and including it could not have
been taken back.

### Nothing reads it, and that has to be checkable

Criterion 2 is a negative, so the guards are negative:

- `Avatar` takes **no `Color`** and returns no value. Its props are bytes-as-a-URI, a size and a
  name. There is nothing in its type to read a colour into.
- A scan of the avatar modules' IMPORT SPECIFIERS: no `@irodora/color-*`, no `cvd`, no face,
  vision or ML module, with a decoy asserting the pattern matches something. **In two test files
  rather than a script in the lint chain** — `apps/mobile/test/profile.test.ts` for `avatar.ts`
  and `packages/ui/test/avatar.test.tsx` for the component. A repo-wide script would scan the same
  two files; what makes the guarantee hold for a THIRD module is the roster assertion beside it,
  which fails when `src/profile/` gains a file nobody has classified. Both run in gate 4.
  (The first draft scanned file TEXT and went red on its own docblock —
  [[a-comment-that-mentions-a-forbidden-import-is-not-one]].)
- The picker path asks for the **library**, never the camera, and requests no camera permission.
- ADR-0010's camera-free path is asserted unchanged: the existing profile tests still build a
  complete profile from twelve forced choices with no image anywhere.

### Where it renders

`23` draws the avatar **in the screen header, left of the title** (`23.avatar` at x 135, the title
at x 251, both at y ≈ 162). `Screen` owns that header, so it gains an optional `lead` slot and the
avatar goes in it — the drawn arrangement, not a new one. Putting it at the top of the summary
card instead would be a reorder, which rule 14 forbids and which F-239's review caught the first
draft of in a smaller form.

`F-260` rebuilds this screen as `17` while it is being built and `23` when it is finished; that
feature is blocked on OQ-33/OQ-34. This one delivers the avatar and puts it where `23` draws it.

### Increments

1. **Record**: the claim, this plan.
2. **The store**: the migration, the four repository methods, the archive decision, their tests.
3. **The component**: `Avatar` in `@irodora/ui`, the `Mark` fallback, the conformance subject.
4. **The screen**: `Screen`'s `lead` slot, the profile header, the picker wiring, the copy.
5. **The negative guards**: the import scan and its proof; the camera-free assertion.
6. **The security review, effects and the record.**

## Mockup fidelity

- **Governing mockup:** `23` (profile finished). `17` draws the profile while it is being built and
  draws no avatar; `26` is the Japanese detail screen and does not draw this header.
- **Inventory:** `23.avatar` — `new:Avatar`, box 51 × 50 px, **36.5 × 35.5 dp**, parent `null`
  (the header, not the card), order 1, no tokens of its own.
- **Bindings:** `store:profile.avatar` — the bytes come from the database, never from the mockup.
  The drawn picture is a stock illustration of a person and reaches the build as nothing at all.
- **Departures:** none expected. The avatar is round in the drawing and round in the build; `C7`'s
  round-versus-square resolution is about a colour SAMPLE and does not reach a photograph.

## Files to touch

```
packages/store/src/schema.ts              migration: profile_avatar, and SYNC_TABLES
packages/store/src/createRepository.ts    put/get/getInfo/clear, beside the garment image methods
packages/store/src/index.ts               exports
packages/ui/src/Avatar.tsx (new)          the round picture, and the Mark when there is none
packages/ui/src/layout.tsx                Screen gains an optional `lead`
packages/ui/src/index.ts                  exports
apps/mobile/src/profile/avatar.ts (new)   the app half: ingest, store, read back as a data URI
apps/mobile/src/screens/ProfileSetup.tsx  the avatar in the header, and choosing one
apps/mobile/app/(tabs)/profile/index.tsx  wiring: the repository and the picker
apps/mobile/src/i18n/*                    the copy, both scripts
(no new script — see below)               nothing reads the picture, in two test files
packages/store/test/*, packages/ui/test/*, apps/mobile/test/*
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects

1. **A new table in `SYNC_TABLES`** → the archive, the digest, the erase path, and the store's
   conformance suite, which asserts every sync table carries the sync columns. Guard: that suite,
   the archive round-trip test, and a new test that erasing the profile erases the picture.
2. **A schema migration** → every existing database on a device. Guard: the migration tests, which
   run each migration forward from the previous version.
3. **`Screen` gains a slot** → every screen, since every screen renders one. Guard: the conformance
   sweep over all 73 subjects, and the header's existing layout assertions.
4. **A second consumer of `ImageSource`** → the picker port and its permission. Guard: the port's
   existing tests, plus the new scan proving the avatar path asks for the library and not the
   camera.
5. **A photograph of a person in the database and possibly in the archive** → NFR-13, NFR-12,
   ADR-0078, ADR-0026. Guard: the security reviewer's sign-off, which criterion 3 requires.

## Test plan

- **Storage**: the bytes round-trip byte-for-byte; a second write replaces rather than duplicates;
  deleting the profile deletes the picture (the cascade, asserted rather than assumed); the info
  read is available without the bytes, the way the gallery's is.
- **Ingest**: the avatar path refuses an empty file, a file that is neither JPEG nor PNG whatever
  it is named, one past the byte limit and one past the dimension bound — and strips EXIF, with a
  fixture that HAS EXIF so the assertion can fail.
- **Absent**: `Avatar` with no picture renders the `Mark`, at the drawn size, and announces itself
  as the profile rather than as an image of nothing.
- **Nothing reads it**: the import scan, with a planted offender and a planted acceptable import;
  `Avatar`'s props carry no `Color`; the camera-free profile path still completes with no image.
- **The screen**: the avatar renders in the header beside the title, choosing one calls the picker
  once, cancelling changes nothing, and a rejected image says so without losing the profile.
- **Both themes and both locales**, through the conformance subject — an avatar present and an
  avatar absent, because the fallback is a different tree.
- **Gates**: state, typecheck, lint, format, test, build, security.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm security
```

Plus the **security reviewer** on the storage, the picker permission and the backup path, which
criterion 3 names. That is a different activity from the evaluator's single review, not a second
round of it.

## Risks and open questions

- **No open question blocks this.** The one decision with a real cost — a face in a plaintext
  archive — is named above and goes to the security reviewer, which is what criterion 3 is for.
- **A photograph is the most sensitive thing this app will hold.** Everything else is a colour, a
  garment or a preference. The guards are therefore negative and structural rather than a promise
  in a docblock.
- **`Screen`'s header is shared.** An optional slot is additive, but it is rendered by every screen
  in the product, so the sweep is the guard rather than the profile screen's own test.

## Out of scope

The rest of mockup `23` (F-260, blocked on OQ-33/OQ-34); any backup or export SURFACE (none
exists; `backup.ts` is reached by nothing in the app); face detection, colour sampling from the
avatar, or any other reading of it — criterion 2 forbids all three, permanently.
