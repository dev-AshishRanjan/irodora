# Plan: F-018 — the Atlas reads the bundle, and trusts nothing else

| | |
|---|---|
| **Feature** | F-018 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-20, FR-21, FR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · consumes `@irodora/corpus`, `@irodora/ui`, `@irodora/cvd-engine` |
| **Author** | Claude Code (generator role) |
| **Date** | 2026-08-24 |

---

## Intent

F-012 published `2026.08.1` — 120 colours and 5 palettes with complete provenance — and
nothing can see it. This feature is the first surface that reads the corpus: **an Atlas that
browses it and a detail screen that shows everything an entry carries**, including the parts
that make it honest.

To a user: they open the app, browse 120 colours, filter by family or temperature or season,
tap one, and see its four names, every coordinate system, who made it and how, what it relates
to, which palettes hold it, and what it looks like to someone with each kind of colour-vision
deficiency. Offline, from a bundle whose checksum was verified before a single pixel was drawn.

---

## The two decisions that are not obvious

### 1. The app needs a synchronous SHA-256, and does not have one

`loadPublishedVersion(bundleText, expectedRootDigest, digestOf)` takes a **sync** `DigestFn`.
`scripts/` passes `node:crypto`; the app cannot. `expo-crypto` offers only
`digestStringAsync`, and making load async would push the verification behind a promise on the
first render — which is where "verified at load" quietly becomes "verified eventually".

**Decision: `@noble/hashes`.** Audited, zero-dependency, synchronous, pure JS, runs on Hermes.
Not hand-written: a checksum is a tamper control, and the correct move when one is needed is a
reviewed implementation, not a fresh one. `assertSha256` already exists as the acceptance seam
and validates any candidate against published vectors **before it is trusted anywhere** — so
the dependency is checked by us rather than taken on faith. **ADR.**

### 2. The bundle has to get into the app as *text*, not as an object

The digest is taken over a canonical form, so `JSON.stringify(require(...))` would verify.
But re-serialising 450 KB on every cold start to check a hash we could have shipped as a
string is work for nothing, and it makes the verified artefact one step removed from the file
that was published.

**Decision: a generated module carrying the bundle text and its expected root digest**, in the
established shape of every other generated output here — written by a script, verified by
`--check` in the gate, and never hand-edited. The digest comes from the **ledger**, embedded
separately, because a bundle carrying its own expected digest verifies itself.

`content/` sits outside `apps/mobile/`, so Metro cannot reach it without a watch folder;
generating into the app is also what keeps the pinned version explicit rather than implicit in
a resolver path.

---

## Approach

**Reused — everything that already exists, and the list is most of the feature.**

| Existing | For |
|---|---|
| `@irodora/corpus` — `loadPublishedVersion`, `parseLedger`, `ledgerRowFor`, `assertSha256` | reading and verifying the bundle. No parsing is written here |
| `@irodora/ui` — `Swatch`, `Text`, `Surface`, `Button`, `Icon`, `Status`, `useTheme` | every pixel. No new primitive unless a screen needs one |
| `@irodora/ui/testing` — `checkAll`, the conformance suite | the new screens register in `screens.test.tsx` like `Home` does |
| `@irodora/cvd-engine` — `simulateDichromacy`, `simulateAnomalous`, `separationDetail` | the CVD appearance block on the detail screen |
| `@irodora/color-core` — `fromSpace` | a `Swatch` needs a `Color`, and a `Color` needs provenance (ADR-0005) |
| `src/engine.ts` | the app's one engine entry point. New derived answers go through it |
| `expo-router` | `app/atlas/index.tsx`, `app/atlas/[slug].tsx` |

**New:**

```
scripts/generate-corpus-bundle.mjs          the generator + --check
apps/mobile/src/corpus/generated/bundle.ts  GENERATED: bundle text + ledger digest
apps/mobile/src/corpus/index.ts             load once, verify, expose queries
apps/mobile/src/screens/Atlas.tsx           browse, filter, search
apps/mobile/src/screens/ColourDetail.tsx    one entry, everything it carries
app/atlas/index.tsx · app/atlas/[slug].tsx  routes (options only)
```

### Criterion 3 is a rule about where numbers come from, and it needs a guard

> *"Browsing renders values read from the published bundle; the engine is called for derived
> answers, never to recompute a value the bundle already carries."*

An entry's `hex`, `lab`, `lch`, `oklch` and `rgb` are **in the bundle**. Recomputing them from
`xyz` at render time would look identical, pass every test, and silently return *today's*
engine's answer for a published version — the exact failure `load.ts` refuses to commit and
FR-10 forbids. A CVD simulation or a ΔE00 between two entries is a **derived answer** and does
belong to the engine.

So the screens may not import `@irodora/color-spaces` conversion functions at all. That is a
lint boundary, added to `verify-guards.mjs` with a decoy, not a convention.

### Interactions, for criterion 1

```
atlas root  →  tap a colour           = 1     (all 120 listed, grouped by family)
atlas root  →  tap a filter → tap     = 2
atlas root  →  search → type → tap    = 2 taps
```

Under three either way, and the root lists everything, so no entry depends on a filter to be
reachable. Asserted by walking the rendered tree for all 120 slugs, not by counting by hand.

### Increments

1. **The bundle reaches the app, verified.** Generator, generated module, `src/corpus/`, a test
   that a tampered bundle throws. No screen yet. *Gates: `state`, `content`, `test`.*
2. **`@noble/hashes` + ADR**, validated through `assertSha256`.
3. **Atlas screen** — list, group, filter, search. Registered in the conformance suite.
4. **Colour detail** — names, coordinates, provenance, relations, palettes, CVD.
5. **The `verify-guards` boundary** for criterion 3, with a decoy.
6. **i18n** — every new key in `en` and a **written** `ja`.
7. Docs, effects, state.

---

## Files to touch

```
docs/adr/00NN-*.md                          — sha256 in the app
docs/adr/README.md
scripts/generate-corpus-bundle.mjs          — new
scripts/verify-guards.mjs                   — the criterion-3 boundary
package.json                                — the generate/--check wiring
apps/mobile/package.json                    — @noble/hashes
apps/mobile/src/corpus/**                   — new
apps/mobile/src/screens/{Atlas,ColourDetail}.tsx — new
apps/mobile/app/atlas/**                    — new routes
apps/mobile/src/i18n/{en,ja}.ts             — the new key set (E-016)
apps/mobile/test/**                         — corpus load, screens, interactions
NOTICE.md                                   — @noble/hashes licence
```

---

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-016** `en.ts` → `ja.ts`, screens, i18n test | The catalogue roughly triples. Every key needs a written Japanese string — machine translation is refused by ADR-0028, and the errors are invisible to a non-speaker | `gate:typecheck` — a missing or extra key fails `tsc` |
| **E-017** `content/colors` → the bundled face | New **UI copy** in Japanese, not new corpus text. Font coverage reads the corpus *and* `ja.ts`, so new kanji in the catalogue must be in the subset | `script:verify-font-coverage.mjs` |
| **E-006** `content/colors` → corpus, spec, gate | First consumer of a published bundle outside the gate. The claim "verified at load" becomes executable on a device rather than in a script | `gate:content` + the new load test |
| **E-021** register → every record | Untouched, but now a broken register also breaks a *screen*, not only the gate | `gate:content` |
| **E-007** manifest → tokens, contrast, cvd | Two new screens are two new contrast surfaces; every pairing they declare is measured in both themes | `gate:contrast` |
| **NEW?** the generated bundle module → the app | A publish that does not regenerate leaves the app on a stale version, silently. Expect a new link | `--check` in `gate:content` |

## Test plan

- **Load:** a tampered entry, a tampered ledger digest, and a bundle whose ledger row is
  missing each throw — over the **real** bundle, mutated in memory.
- **Criterion 1:** every one of the 120 slugs appears in the Atlas tree from the root, with no
  filter applied. Asserted over the render, not counted by hand.
- **Criterion 3:** the guard, with a decoy — a screen that *does* recompute a bundled value is
  planted and watched failing.
- **Criterion 4:** the detail screen for a chosen entry contains all four name forms, each
  coordinate system, the provenance fields FR-24 names, its relations, its palettes and the
  CVD block. Assert by content, and include an entry whose `complementary` is empty so the
  empty case is rendered rather than skipped.
- **Criterion 5:** conformance suite, which already asserts a swatch's accessible name carries
  name + value + provenance and forbids "swatch".
- **A11:** both screens announce headings, as `Home` does.
- **Negative:** a `japanese-inspired` entry must never render as `historical` (FR-23) — the
  classification is displayed and asserted.

## Verification

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:content        # the --check on the generated bundle
pnpm test:a11y           # gate 8, with the new screens in scope
pnpm test:contrast       # gate 9, both themes
node scripts/verify-guards.mjs --prove
```

`e2e` is in F-018's `verification` list and **gate 7 is `pending`** — nothing declares
`test:e2e`. Whether it activates here or is honestly deferred is decided during the work and
recorded either way; it is not quietly dropped, which is what F-017 did and said.

`color-golden`, `cvd`, `perf`, `security` are not in this feature's set.

## Risks and open questions

- **No `OQ-*` blocks this.**
- **450 KB of bundle text in the JS bundle.** It is the whole corpus and it has to ship
  (ADR-0051, no network). Startup cost is real; if parsing on the main thread is visibly slow
  it is a work item, not a reason to skip verification.
- **The seed corpus is what it is.** Every entry is `japanese-inspired`, self-reviewed, with a
  coined name. The detail screen is where a reader either learns that or does not, so the
  classification and the coinage note are load-bearing copy — and F-084's attested criterion
  (a self-reviewed entry shows it was reviewed by its author) is discharged here or is not.
- **`ja.ts` grows a lot, written by a non-native editor.** F-017's attested criterion covers
  it and gets larger again. Say so rather than letting the count grow quietly.

## Out of scope

- **Compare, Palette Studio, Finder, share cards** — F-019, F-020, F-021, F-023.
- **The Lens** — F-040. The Atlas reads; it does not measure.
- **Wardrobe, profiles, recommendations** — later releases.
- **A second corpus version.** The app pins `2026.08.1`.
