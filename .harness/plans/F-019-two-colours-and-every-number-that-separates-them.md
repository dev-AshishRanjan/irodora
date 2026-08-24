# Plan: F-019 — two colours, and every number that separates them

| | |
|---|---|
| **Feature** | F-019 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-48 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · consumes `@irodora/color-difference`, `@irodora/cvd-engine` |
| **Author** | Claude Code (generator role) |
| **Date** | 2026-08-24 |

---

## Intent

The Atlas shows one colour at a time. **Compare shows two, and every number that separates
them** — ΔE00, the per-axis CIELAB differences, the OKLCh delta, CVD separation, and contrast —
each labelled with its unit and the space it was computed in.

To a user: pick two corpus colours, see how far apart they actually are, and read numbers a
professional can act on rather than an adjective.

---

## The distinction this feature is built on

F-018's boundary #24 draws a line the Atlas barely tested: **a stored value is read, a derived
answer is computed.** Compare is the first surface where nearly everything is the second kind.

| From the bundle, read | Computed here, by the engine |
|---|---|
| `derived.lab`, `derived.oklch`, `derived.rgb`, `derived.hex` | ΔE00 between two entries |
| `entry.color.xyz` | per-axis differences, OKLCh delta |
| | CVD separation, WCAG ratio, APCA Lc |

None of it recomputes a stored value, and the boundary already forbids the imports that would.
**No colour maths is written in this feature** — `hueDelta` already exists in
`@irodora/color-spaces`, so even the circular hue arithmetic is a call rather than a formula
([AGENTS.md §7](../../AGENTS.md): a second implementation of anything in `packages/color-*` is a
defect by definition).

---

## A token that has never reached a pixel

`nativeNumericFeature = 'tabular-nums'` is emitted from the manifest, asserted against it by
`packages/design-tokens/test/typography.test.ts` — and **consumed by nothing**. It has been that
way since F-017.

C9 in the design brief is unambiguous: *"Numbers are tabular. Colour values appear in columns
and must align — proportional figures make a ΔE table unscannable."* This is the feature that
puts a ΔE table on a screen, so it is the feature where that stops being true on paper only.

**`Text` gains a `numeric` prop** setting `fontVariant: ['tabular-nums']` from the token. One
home, so no call site can forget it, and the conformance suite can assert it reaches the node —
the same shape as `heading` in F-088.

---

## Approach

**Reused — every number comes from a package that has a golden dataset behind it.**

| Existing | For |
|---|---|
| `@irodora/color-difference` — `deltaE00`, `wcagContrast`, `apcaLc` | the difference and both contrast readings |
| `@irodora/color-spaces` — `hueDelta`, `oklchToOklab` | circular hue arithmetic; OKLab for nothing else |
| `@irodora/cvd-engine` — `separationDetail` | separation, with its decomposition rather than only a score |
| `@irodora/ui` — `Swatch`, `Text`, `Surface`, `SearchField`, `Chip` | the surface. `SearchField` is how a slot is chosen |
| `apps/mobile/src/corpus` | `allEntries`, `entryBySlug`, `colorFor` |

**New:**

```
apps/mobile/src/compare.ts            the metric set, assembled once and testable without a render
apps/mobile/src/screens/Compare.tsx   two slots and the table
apps/mobile/app/compare.tsx           the route
packages/ui/src/Text.tsx              a `numeric` prop
```

`compare.ts` rather than computing in the component, for the reason `engine.ts` exists: a
number a screen computes inline is a number no test can reach without rendering.

### Choosing the two colours

Each slot is a `SearchField` over all four name forms plus the slug, showing the matches as
tappable swatches. Defaults are the first two entries, so the screen means something on open
rather than showing an empty state nobody asked for.

**No new navigation mode.** A "pick from the Atlas and come back" flow would be a better product
and a bigger feature; it is not in the acceptance list.

### What each row says, and why the labels are long

> *All metrics shown with their units and the space they were computed in* — FR-48.

So every row carries three things: the number, its unit, and where it was computed. `ΔE00`
without `CIELAB (D65)` beside it is the failure this criterion names — the same number computed
in a different space is a different claim, and this repository has already been bitten by
exactly that ([[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]]).

**APCA is shown in both directions** because it is asymmetric, and showing one would imply it is
not.

### Increments

1. **`Text` gains `numeric`**, wired to the token, asserted in the conformance suite. *Gates:
   `test`, `a11y`, `contrast`.*
2. **`compare.ts`** — the metric set, with its own tests against the engine directly.
3. **The screen and the route**, registered in the screen conformance suite.
4. **i18n** — new keys, both languages, and the font subset regenerated (E-017).
5. **Home links to Compare**, so the feature is reachable.
6. Docs, effects, state.

---

## Files to touch

```
packages/ui/src/Text.tsx                — the `numeric` prop
packages/ui/test/conformance.test.tsx   — assert it reaches the node
apps/mobile/src/compare.ts              — new
apps/mobile/src/screens/Compare.tsx     — new
apps/mobile/app/compare.tsx             — new
apps/mobile/src/screens/Home.tsx        — a second link
apps/mobile/src/i18n/{en,ja}.ts         — the new keys (E-016)
apps/mobile/assets/fonts/…              — regenerated over the new ja copy (E-017)
apps/mobile/test/{compare,screens}.test.*
.harness/state/*
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-007** manifest → tokens, contrast, cvd | `nativeNumericFeature` gains its first consumer. A manifest change to the numeric feature now reaches a screen instead of stopping at a test | `gate:contrast` + the conformance assertion |
| **E-016** `en.ts` → `ja.ts`, screens | More keys, each needing written Japanese. F-017's attested criterion grows again | `gate:typecheck` |
| **E-017** `content/colors` → the face | New Japanese UI copy will introduce codepoints. It fired on the catalogue in F-018 and will fire again | `script:verify-font-coverage.mjs` |
| **E-003** `deltaE00` → naming, recommendation, cvd | A new consumer on a **surface**. A defect in ΔE00 now shows a wrong number to a reader rather than only reordering a list | `gate:color-golden` |
| **E-022** `content/versions` → the app's copy | Untouched, but Compare is a second reader of the same pinned bundle | `--check` in `gate:content` |

## Test plan

- **`compare.ts` against the engine, not against itself.** Each metric recomputed in the test by
  calling the same package function on the same inputs would prove nothing; instead assert the
  properties that must hold — ΔE00 of a colour with itself is 0, the metric set is symmetric
  where the metric is and **asymmetric where APCA is**, and the per-axis deltas sum back to the
  stored coordinates.
- **A known pair, pinned.** Two seed entries whose ΔE00 is asserted to a fixed value, so a
  change in the engine shows up here as well as in the golden set (E-003's destination end).
- **Criterion 1:** every metric named in the acceptance list appears with its unit and its
  space. Asserted over the rendered tree by content, not by structure.
- **Criterion 2:** the numeric nodes carry `fontVariant: ['tabular-nums']`, and the values are
  `selectable`. Asserted over the render — a prop in the source and a prop on the node are
  different claims.
- **Negative, with a decoy:** a `Text` **without** `numeric` must not carry the font variant, or
  the assertion would pass for a component that applies it everywhere.

## Verification

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast
pnpm test:content            # the font subset, after new ja copy
pnpm test:golden             # E-003's source end — this feature is a destination
node scripts/verify-guards.mjs
```

`e2e` is in this feature's verification list and **gate 7 is still pending** — F-091 carries the
harness. It will be reported as not run, with the reason, exactly as F-018 did rather than
quietly dropped.

`cvd`, `perf`, `security` are not in this feature's set.

## Risks and open questions

- **No `OQ-*` blocks this.**
- **CVD separation has a score, and a score invites a verdict.** `separationDetail` returns the
  decomposition as well, and the screen shows the decomposition — a number labelled "separation
  62" with no ΔE00 and lightness difference beside it is a grade nobody can check.
- **The seed corpus is 120 low-to-mid chroma colours.** Many pairs will separate poorly under
  CVD, and that is a true fact about the corpus rather than a defect in the screen. It should
  read as information, not as a warning.
- **`nativeNumericFeature` reaching nothing for two releases is the second instance** of a
  generated value with no consumer. Worth recording as a pattern, not just fixing.

## Out of scope

- **Picking a colour by navigating to the Atlas and back.** A better flow, a bigger feature.
- **Comparing more than two colours**, and comparing against a non-corpus colour — the Lens
  (F-040) is where a measured colour arrives.
- **Palette Studio, Finder, share cards** — F-020, F-021, F-023.
- **Changing any metric's definition.** This feature displays what the engine already computes.
