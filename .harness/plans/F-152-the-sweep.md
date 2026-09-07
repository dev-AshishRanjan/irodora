# Plan: F-152 — The remaining surfaces are brought up to the same standard

|                       |                                                              |
| --------------------- | ------------------------------------------------------------ |
| **Feature**           | F-152 — [`feature_list.json`](../state/feature_list.json)     |
| **Requirements**      | FR-26, FR-61, NFR-8, NFR-25                                   |
| **Service / package** | `apps/mobile` · `packages/ui`                                 |
| **Author**            | Claude Code (generator)                                       |
| **Date**              | 2026-09-07                                                    |

---

## Intent

The sweep that stops the redesign being partial. Explicitly last, so the primitives, the
components and the four flagship surfaces have settled first.

## What the audit found before anything was proposed

Measured across the seven named screens rather than assumed:

| screen        | raw spacing | bare `<View>` | primitives | `EmptyState` |
| ------------- | ----------: | ------------: | ---------: | -----------: |
| ProfileSetup  |           0 |             2 |          7 |            0 |
| **Preferences** |         0 |         **7** |      **0** |            0 |
| Shopping      |           0 |             4 |          1 |            3 |
| OutfitBuilder |           0 |             2 |          4 |            3 |
| Export        |           0 |             0 |          2 |            3 |
| Measure       |           0 |             4 |          2 |            0 |
| AddGarment    |           0 |             1 |          2 |            0 |

**Criterion 3's first half is already done and the gate is why.** Not one raw padding, margin or
gap survives on any screen — `verify-spacing-scale.mjs` has enforced that since F-095, and a
criterion the harness already keeps is worth stating as kept rather than re-doing.

**Preferences is the outlier**, and by a distance: zero primitives, seven hand-built views.

## The criterion that cannot be met as written, and why

Criterion 2 asks for **an empty, a loading and an error state on every screen**.

**There is no `Promise<` anywhere in `apps/mobile/src/store/`.** Every read from the device is
synchronous — that is what ADR-0051 buys by having no server tier, and it is not an oversight.

So on a store-backed screen there is no moment at which data is being awaited. Adding a loading
state would mean inventing a state no fixture can reach, and the conformance suite says so out
loud: a registered state that renders nothing is a `state-not-rendered` finding. **A state that
exists only in the registry is worse than an absent one**, because it reports as coverage.

So loading is delivered **where something genuinely takes time** — the export write, the image
ingest, the camera — and **attested, with the reason, everywhere else**. Empty and error are
delivered everywhere they can occur.

## Approach, in increments

### 1. Both locales, which is the criterion nothing currently covers (criterion 4)

The registry renders every screen in both themes and **one language**. Half the product's copy has
never been rendered by the suite that checks contrast, structure and accessible names — which is
[E-089](../memory/effects/the-claims-lint-only-speaks-english.md)'s shape in a different gate, one
week later.

`jest.mock` is per file, so the locale comes from a hoisted mutable tag the mock closes over
(`mockLanguageTag`, named for the hoist rule). A second pass runs **the same registry** — not a
copy of it — over every subject in `ja`, in both themes.

Japanese is not a translation of the layout: the type scale differs by script, the strings are
longer or shorter in ways nothing predicts, and a screen that fits in English is not thereby a
screen that fits.

### 2. An empty state that is the designed one (criterion 2)

`Preferences` and `Measure` render their emptiness as bare `<Text>`. That is the gap F-152's own
predecessor recorded in `progress.md`: *"a screen that renders a bare `<Text>` for its empty
branch bypasses `EmptyState` entirely, and `tsc` cannot see that."* Five sites were converted
then; these are the two that remain.

### 3. An error state where an operation can fail (criterion 2)

Not everywhere — where something can fail. The export write, the image ingest, and a store write
that throws. `Status` is the component, and F-069's rule applies: a status colour may not sit
beside a colour sample without a `swatch.well` between them, which `checkStatusAdjacency` already
enforces over every registered subject.

### 4. Preferences onto the primitives (criterion 1)

Seven hand-built views become `Stack`, `Row` and `Section`. A `<View>` is not wrong by itself — a
flex spacer is a `<View>` and should stay one — so the test applied is whether it is doing what a
primitive already does.

### 5. The undifferentiated secondary buttons (criterion 3)

The audit found none on the seven, and one **off** them: `PaletteStudio` draws *Move up*, *Move
down* and *Remove* as three identical secondary buttons in one row, and *Remove* is destructive.
Criterion 3 says *no screen*, so it counts.

**Reused:** `EmptyState`, `Status`, `Screen`, `Section`, `Stack`, `Row`, the conformance registry
and `checkStatusAdjacency` — all of it. This feature adds no component.

## Files to touch

```
apps/mobile/test/screens.test.tsx        — the locale mock and the second pass
apps/mobile/src/screens/Preferences.tsx  — primitives, EmptyState
apps/mobile/src/screens/Measure.tsx      — EmptyState
apps/mobile/src/screens/PaletteStudio.tsx — the destructive control
apps/mobile/src/screens/Export.tsx        — the error state, if it has none
apps/mobile/src/i18n/{en,ja}.ts           — any new strings, both catalogues
```

## Anticipated effects

- **Every screen rendered in Japanese for the first time** ⇒ gate 9 contrast, the pairing rule,
  the accessible-name rules, and the type scale. Expect findings; they are the point.
- **New strings** ⇒ both catalogues are total by type, so a missing one is a compile error — and
  the claims gate now reads Japanese (F-172), which is the first feature to benefit.
- **`EmptyState` replacing bare text** ⇒ the rendered tree changes on two screens, so their
  contrast and pairing subjects re-measure.

## Test plan

- **The whole registry, in `ja`, in both themes.** Same subjects, same checks, one language
  different — and the pass must be asserted as having actually rendered Japanese, or it proves
  nothing.
- **The empty branches** assert `EmptyState`'s structure rather than the sentence, so a screen
  that goes back to a bare `<Text>` fails.
- **The destructive control** is distinguishable from its neighbours by something a test can see,
  not only by its label.

## Risks and open questions

- **The Japanese pass may find real contrast or layout problems**, and fixing those is inside this
  feature. If one turns out to need a token change, that is a manifest decision and an ADR.
- **"Designed" is not a property a test has.** The gates check structure, contrast and names; that
  a state reads well is a judgement, and this feature can only report which states now exist.

## Out of scope

- The theme picker (F-153) — Preferences is its home, and this feature leaves the space rather
  than pre-building it.
- Any screen not named in criterion 1, except where criterion 3 says *no screen*.
- A loading state on a store-backed screen. See above; attested rather than invented.
