# Plan: F-043 — Add-garment flows

| | |
|---|---|
| **Feature** | F-043 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-40 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |
| **Blockers** | F-040 (done) · F-042 (done) |

---

## Intent

F-042 made the wardrobe storable. This makes it reachable: a screen where somebody adds a
garment in four ways, and where the thing that stops them is never a form.

"Done" to a user: they point the Lens at a jumper, tap once, and it is in their wardrobe — or
they pick a colour by name, or attach a photo they already have, or take one. Two fields, and
everything else is offered rather than demanded.

## The two decisions this feature turns on

### 1. The camera and upload paths need a dependency, and it must not be a filesystem one

`apps/mobile` has **no picker and no filesystem package**. Two of the four paths need one.

There is a hard constraint that shapes the answer. `eslint.config.mjs` bans
`expo-file-system`, `expo-media-library`, `node:fs` and `fs` from
`apps/mobile/src/lens/**` **and from every route in `apps/mobile/app/**`** — *"a camera frame
may never be written to a file (NFR-12, ADR-0026)"*. The rule's own message anticipates this
feature: *"If a surface here genuinely needs the filesystem, it is not the Lens and it does not
belong in this directory."*

**`expo-image-picker` with `base64: true` needs none of that.** It returns the bytes directly,
they go through `ingestImage`, and the result is a BLOB in the SQLCipher database (ADR-0078).
**The image never becomes a file this app manages** — so the lint stays exactly as strict as it
is, and nothing here asks for an exemption. One dependency covers both paths
(`launchCameraAsync` and `launchImageLibraryAsync`).

**The consequence that CI will catch, flagged now rather than discovered:** gate 16 asserts the
shipped APK's permission set **equals** `EXPECTED_PERMISSIONS`, in both directions. `CAMERA` is
already expected; the library picker may add `READ_MEDIA_IMAGES` on Android 13+. Whether it
does can only be settled by building the artefact. F-085 records that the first genuinely
signed APK failed this check on three permissions no dependency and no source file named — so
the expectation is **not** pre-emptively widened here. A red gate 16 naming a permission is the
correct outcome, and the list moves in response to a build rather than in anticipation of one.

### 2. The Lens hand-off has one slot and one consumer, and now needs two

`handoff.ts` is a single mailbox: `offerReading` writes, `takeReading` consumes, and profile
setup is the only reader. Its own header explains why consuming matters — *"an offer that
survives being declined is not an offer"*.

A second consumer breaks it in a way no type would catch. Someone scans a garment, navigates
through profile setup on the way, and **profile silently eats the reading** — then the wardrobe
screen finds an empty slot and the person is told to scan again. The reverse loses a profile
estimate the same way.

**The offer gains a destination.** `offerReading(reading, 'profile' | 'wardrobe')` and
`takeReading(destination)`, which returns `null` unless the waiting offer was addressed to that
caller. One slot still — a queue would offer a colour somebody had moved on from — but a slot
that knows who it is for. E-037 is the link that covers the Lens hand-off seam and it is
updated rather than duplicated.

## Approach

**Reused:** `NewGarment`, `enrichGarment`, `ingestImage`, `putGarmentImage`, `groupByColor`
from `@irodora/store` (F-042); `LensReading` and the hand-off (F-040, F-097); the corpus bundle
and `@irodora/ui` components; the narrow-port pattern from `PaletteStore`.

**New:**

- `src/wardrobe.ts` — a narrow `WardrobeStore` port and the draft logic. **The screen decides
  nothing**: whether a draft can be saved is one function here, the way `draftProblem` is for
  palettes, so the rule lives in one place and jest can exercise it without rendering.
- `src/wardrobe/source.ts` — an `ImageSource` port (`pickFromLibrary`, `captureWithCamera`),
  injected. This is what makes all four paths testable off-device: the route supplies the
  `expo-image-picker` implementation, the test supplies a fake returning fixture bytes.
- `src/screens/AddGarment.tsx` and `app/wardrobe/add.tsx`.
- i18n keys in `en.ts` and `ja.ts`.

**Increments** — each leaves the build green:

1. The hand-off gains a destination; profile keeps working, asserted.
2. `WardrobeStore` port and draft logic, with tests. No screen yet.
3. `ImageSource` port and the ingest wiring, with a fake source.
4. The screen and its route, with the screens suite.
5. i18n for both locales.

## Files to touch

```
apps/mobile/src/lens/handoff.ts        — destination on the offer
apps/mobile/src/wardrobe.ts            — NEW: WardrobeStore port, draft rules
apps/mobile/src/wardrobe/source.ts     — NEW: ImageSource port
apps/mobile/src/screens/AddGarment.tsx — NEW
apps/mobile/app/wardrobe/add.tsx       — NEW: route, supplies the real store and source
apps/mobile/src/i18n/{en,ja}.ts        — the copy, both locales
apps/mobile/package.json               — expo-image-picker  (+ lockfile, E-032)
apps/mobile/app.config.ts              — the picker's permission strings
apps/mobile/test/{wardrobe,screens}.*  — tests
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| `handoff.ts` signature | `Lens.tsx`, `ProfileSetup.tsx`, `lens.test.ts` | `gate:typecheck` — both call sites must move; **E-037 updated** |
| A new dependency | the lockfile; the APK's permission set | `gate:state` (E-032, lockfile in the same commit) and **`gate:artifact`** — which cannot run here |
| A new screen | contrast, a11y, i18n, status-adjacency | `gate:a11y` / `gate:contrast` — `screens.test.tsx` runs them over **every** screen, so a new one is covered by construction |
| A new route | `verify-app-imports.mjs` (Metro resolution) | `gate:lint` |

## Test plan

- **Draft rules:** a draft with colour and type saves; **each of the twelve other fields absent
  does not block it** — that is criterion 3, and asserting it field by field is what catches a
  "required" creeping in.
- **Four paths, one assertion each**, through the injected ports: a Lens reading addressed to
  the wardrobe becomes a garment; a corpus pick becomes a garment; a library image is ingested
  and stored; a camera image is ingested and stored.
- **Hand-off, with the decoy that is the point:** a reading offered to `profile` must **not** be
  taken by the wardrobe, and vice versa. Without that pair the destination is decoration.
- **Rejected image:** an oversized or non-image pick surfaces a message and adds nothing — the
  screen must not create a half-garment when the ingest throws.
- **Screens suite:** contrast, a11y, status adjacency, both locales, 200% text.
- **E2E:** the journey is exactly what gate 7 is for, and gate 7 is **pending on F-091**.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast
```

`perf` is in this feature's verification list; the p95 budget it covers is measurable here, but
**the criterion it exists for — median time to add, 20 s — is already declared `attested`** and
needs devices from the reference matrix.

Not applicable: `color-golden` (no engine maths), `cvd`, `content`, `security` (no new
inference surface), `artifact` (needs an APK from CI).

## Risks and open questions

- **Gate 16 may go red on a permission after the next signed build.** Expected, and the correct
  response is to read the finding rather than to widen the list now.
- **`expo-image-picker` must be compatible with Expo 57.** Checked against the installed SDK
  before the manifest is edited, not after — `peerDependencies did not name the constraint that
  broke the install` is the lesson, and "both are latest" is not evidence.
- No `OQ-*` bears on this.

## Out of scope

- **Product-URL ingestion.** FR-40 says *"(later)"*, and ADR-0026 is explicit that there is no
  fetch-by-URL path. Not built, and the absence is deliberate.
- Browsing, filtering and grouping the wardrobe as a **surface** — `groupByColor` exists and
  FR-41's screen is not this feature.
- Editing a garment after creation beyond what `enrichGarment` already supports.
- Outfits (F-045).
