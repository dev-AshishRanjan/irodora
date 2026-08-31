# Plan: F-042 — Wardrobe model and encrypted local storage

| | |
|---|---|
| **Feature** | F-042 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-39, FR-41, NFR-13 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages` · `@irodora/store` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |

---

## Intent

The wardrobe becomes storable: a garment you can create knowing only its colour and its type,
enrich later, group by how colours actually look rather than how their hex strings sort, and
attach a photograph to — with the photograph inside the encrypted database rather than beside
it, and with its EXIF gone before it is ever written.

"Done" to a user: they can add a red jumper in two fields, add the brand next week, see it
grouped with the other reds and not with a red-ish brown, attach a photo, and have the photo's
home address not follow it in.

## The contradiction this feature had to resolve first

Three sources disagreed about what "encrypted images" means:

| source | says |
|---|---|
| **NFR-13** | the database *and any stored imagery* are encrypted **with SQLCipher** |
| **criterion 3** | encrypted with a **device key held in the platform keystore**; rotation tested |
| **`data-model.md` §5** | *"no `image_encrypted` column… the whole database **and the image directory** are covered by the device's own protection plus SQLCipher"* |

**The third is factually wrong.** SQLCipher encrypts a database file. It does not cover a
directory of image files sitting next to it — that would be the OS's protection, which is real
but is neither SQLCipher nor a key we hold. Saying otherwise in the architecture document is
the same overstatement golden rule 11 bans in the UI.

**Decision (user, 2026-08-31): images are BLOBs in the SQLCipher database.** It is the only
option that makes NFR-13 true *as written*, and it needs no cipher of our own, no new
dependency, and no second key — the one in the keystore already covers them. Rotation is
SQLCipher's own `PRAGMA rekey` rather than a re-encrypt loop we would have to write and get
right. Recorded as an ADR, with the two costs stated: blob reads load whole into memory, and
`archive.ts` reads `SELECT *` so images join the backup ([E-023](../state/effects.json)).

## Approach

**Reused:** `@irodora/store`'s driver interface, migration runner, `change_log` append and
conformance suite (F-041); `getOrCreateDatabaseKey` and `SecureKeyStore` (F-041);
`randomBytes` through the port (F-104); `deltaE00` from `@irodora/color-difference` for the
grouping metric — *the metric is imported, never re-derived*, which is E-008's rule.

Checked rather than assumed: `verify-engine-purity.mjs` grows its zone **downward** from the
`color-*` roots through their dependencies, so `store` importing `color-difference` makes it a
consumer of the zone, not a member of it. The `node:sqlite` exemption on `drivers/node.ts` is
unaffected.

**New:**

- `schema.ts` migration 4 — `garment`, `garment_color`, `garment_image`.
- `image.ts` — the ingest guard and a **branded `SanitisedImage`**.
- `grouping.ts` — perceptual grouping over stored garment colours.
- `rekey` on the `Driver` interface, and `rotateDatabaseKey` in `key.ts`.

### Criterion 4, and the word in it that names something retired

The criterion reads *"images decoded only in **the worker** under hard limits"*. There is no
worker. ADR-0051 retired the server tier, and `.harness/rules/security/security.md`'s "images
are hostile input" section still describes one — *"never in the API process"*, *"the worker
runs non-root, read-only filesystem, no network egress"*. On a phone none of that exists.

Gate 0's retired-surface check could not catch this: it scans **feature criteria and PRD rows
only**, and its vocabulary list has no term for a worker or an API process. The architecture
and security documents are entirely outside its corpus, which is why `privacy-design.md` can
still say *"per-tenant data key"* — a term literally on its retired list — with gate 0 green.

**What is honestly buildable, and what this feature builds:** the criterion's intent is that
hostile bytes never reach a decoder unbounded. So the guard enforces **byte cap, magic-byte
type check, and pixel-count cap read from the file header — before any decode** — and the
type system makes it impossible to store bytes that skipped it. The "in the worker" half is
not implementable and is reported as such rather than reinterpreted into something easier.
The vocabulary gap is filed, not fixed here.

### The branded type is the enforcement, not the reminder

`putGarmentImage` accepts only a `SanitisedImage`, which no caller can construct — only
`ingestImage()` returns one. So "EXIF was stripped" is not a convention anybody has to
remember: an un-ingested buffer does not type-check at the call site. This is `LensReading`'s
move from F-040, where the type has no field a frame could be assigned to.

### Rotation, and the half of it CI cannot see

`node:sqlite` has no SQLCipher, so **`PRAGMA rekey` cannot be executed in CI** — the same wall
F-041 hit and recorded with `encryptsAtRest: false`. Rotation therefore splits:

- **Gated:** the *lifecycle*, which is the part that goes wrong. `rotateDatabaseKey` generates
  through the port, calls `driver.rekey`, and **writes the new key to the keystore only after
  the rekey returns** — the wrong order leaves a database nobody can open, presenting months
  later as "the app lost my data". A fake driver that throws on rekey proves the old key
  survives. `DriverInfo` gains `supportsRekey`, and the Node driver reports `false` and throws
  rather than silently succeeding, so a green CI run cannot be read as a statement about
  SQLCipher.
- **Attested:** that a real SQLCipher database opens with the new key and refuses the old one,
  on a device.

**Increments** — each leaves the build green:

1. Migration 4 and the garment row types; conformance suite extended.
2. `NewGarment` requiring only colour and type, plus progressive enrichment (criterion 1).
3. `image.ts`: caps, magic bytes, EXIF strip, `SanitisedImage` (criterion 4).
4. `garment_image` BLOB write/read, `rekey`, `rotateDatabaseKey` (criterion 3).
5. `grouping.ts` over `deltaE00` (criterion 2).
6. Docs: `data-model.md` §5 corrected, `privacy-design.md` §4 rewritten for the architecture
   that exists (criterion 5).

## Files to touch

```
packages/store/src/schema.ts          — migration 4: garment, garment_color, garment_image
packages/store/src/repository.ts      — row types, NewGarment, Driver.rekey, DriverInfo.supportsRekey
packages/store/src/createRepository.ts— garment methods, image put/get
packages/store/src/image.ts           — NEW: ingest guard, SanitisedImage
packages/store/src/grouping.ts        — NEW: perceptual grouping
packages/store/src/key.ts             — rotateDatabaseKey
packages/store/src/drivers/node.ts    — rekey throws; supportsRekey false
packages/store/src/testing/index.ts   — conformance additions
packages/store/test/*.test.ts         — garment, image, grouping, rotation
packages/store/package.json           — @irodora/color-difference dependency
docs/architecture/data-model.md       — §5: the SQLCipher-covers-the-directory sentence
docs/architecture/security/privacy-design.md — §4 for the architecture that exists
docs/adr/0078-*.md                    — images are blobs in the encrypted database
.harness/state/effects.json           — E-041 (images join the archive), E-023 revisited
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| A new table in migration 4 | `archive.ts` reads `SELECT *` — images join the backup and its digest | **E-023 already records this**; the archive test must assert the new behaviour deliberately rather than discover it |
| `Driver` gains `rekey` | both drivers + the conformance suite | `gate:test` — the suite runs against both, and the Node driver must *throw*, asserted |
| `DriverInfo` gains `supportsRekey` | the conformance report | same suite |
| `store` gains a `color-difference` dependency | engine-purity zone; the lockfile | `gate:lint` (purity) and `gate:state` (E-032, lockfile) — **regenerate the lockfile in the same commit** |
| Images become storable at all | the privacy documents' claims | criterion 5, and the claims lint |

**A new link is owed** for the ingest guard: bytes that skip it can reach the database only if
the branded type is widened, and nothing but the type says so.

## Test plan

- **Unit:** garment created with colour and type alone; each field enriched afterwards and read
  back; grouping puts two perceptually-near colours together and a near-in-hex/far-in-Lab pair
  apart — **the decoy is a pair whose hex strings sort adjacently**, because that is precisely
  what criterion 2 forbids and a test using well-separated colours would pass either way.
- **Ingest, negative with decoys:** oversized bytes rejected; a PNG renamed `.jpg` rejected by
  magic bytes; a header declaring 30000×30000 rejected before decode; EXIF-bearing JPEG comes
  back with no APP1 segment **and still decodes** — a stripper that corrupts the image passes a
  "no EXIF" assertion perfectly.
- **Rotation:** new key differs; the keystore holds the new one only *after* rekey returns; a
  driver that throws on rekey leaves the old key in place; the Node driver reports
  `supportsRekey: false` and throws, asserted.
- **Conformance:** both drivers run the extended suite.
- **E2E:** the journey is user-facing but gate 7 is pending on F-091 — reported as not run.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm security
```

Not applicable: `color-golden` (no engine maths changes — the metric is imported), `cvd`,
`content`, `contrast`, `a11y`, `perf`, `artifact`. **`e2e` applies and cannot run** (F-091).

## Risks and open questions

- **Blob size.** Images are resized on ingest to a bounded longest edge before storage; the cap
  is a constant with the reasoning beside it, not a number chosen in the moment.
- **The archive grows by the size of the wardrobe's photographs.** Real, and E-023 predicted the
  mechanism. Whether a backup *should* carry images is a product question; the honest default is
  yes, because a backup that silently omits them loses them.
- No `OQ-*` blocks this. The image-storage question was closed by the user and becomes an ADR.

## Out of scope

- The add-garment **UI** — that is F-043, and this feature deliberately stops at the package.
- Outfits (`outfit`, `outfit_item`) — F-045.
- Fixing the retired-server vocabulary in `security.md` and `privacy-design.md` beyond what
  criterion 5 requires, and extending gate 0's retired-surface scan to architecture documents.
  **Filed, not fixed** — WIP is 1.
- Drizzle, which F-041 also deferred and for the same reason.
