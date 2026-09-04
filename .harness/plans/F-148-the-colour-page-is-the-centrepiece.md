# Plan: F-148 — The colour page is the centrepiece

| | |
|---|---|
| **Feature** | F-148 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-20, FR-23, NFR-25 |
| **Service / package** | `apps/mobile` · `@irodora/design-tokens` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

`ColourDetail` is a 96px swatch and then **eight sections of stacked label/value rows** — 30-odd
`DetailRow`s. It is where a person spends time and where 120 entries of sourced editorial work
earns its keep, presented as a property inspector.

## What it becomes

**The colour, full bleed, above the fold.** Criterion 1, and the one place the visual-taste skill
says to spend boldness on this product. Then the name block, then the editorial content as
*prose*, then the derived material behind tabs, then provenance.

**Editorial content stops being rows.** `description_en` and `description_ja` are paragraphs, not
values in a table — they are the thing 120 entries of sourced work produced. Classification,
family, season and era become an **eyebrow line**, which is what that type step is for, rather
than four rows of label-and-value.

**Harmony, colour vision and neighbours become `Tabs`** — criterion 3, and the component F-143
built for exactly this.

## The one thing tabs must not hide

**Provenance stays outside them.** Criterion 4 is *"always visible and never a disclosure a person
has to find"*, and a tab is a disclosure. FR-24 puts provenance on the colour surface rather than
on a legal page; putting it behind a tab would move it back.

So the tabs carry only *derived* material — harmony, CVD simulation, nearest neighbours — which is
computed and explorable. What the record **asserts** is never behind one.

## `foreground.3`, and the check it has never had

Its exemption names this feature. It is *"decorative and large text only"*, and the honest use
here is the **romaji at a display size** beneath the kanji: large, subordinate, not carrying
meaning of its own.

**But its `pairsWith` is empty**, so the contrast gate has never measured it. Using it means
declaring the pairing in the manifest — `background` and `surface.1` — and letting the gate check
it at the 3:1 large-text threshold.

**If it cannot meet 3:1, that is the finding**, and the honest outcome is to re-own the exemption
with the measurement rather than paint it anyway. A token whose own manifest role cannot be
satisfied is worth discovering.

## Approach

**Reused:** `Screen`, `Section`, `Stack`, `Row`; `Tabs` (F-143); `Swatch`, `Surface`; every
existing computation — `simulateAnomalous`, `colorFor`, `resolveSlugs`, `palettesContaining`. **No
value on this page changes.** `DetailRow` survives for the places a label/value pair genuinely is
the right shape: coordinates and provenance are tables, and pretending otherwise would be worse.

**Increments:** the hero; the editorial prose; the tabs; `foreground.3` and its pairing.

## Files to touch

```
apps/mobile/src/screens/ColourDetail.tsx     — the composition
docs/design/design-system.manifest.json      — foreground.3 gains a pairsWith
packages/design-tokens/src/generated/*       — regenerated
apps/mobile/test/screens.test.tsx            — the subject's sampleValues
.harness/verification/unreached-tokens.json  — foreground.3 closed, or re-owned with the measurement
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `foreground.3` gains a `pairsWith` | the contrast gate starts checking a token it never has | `contrast` — and it may fail, which is the point |
| The manifest changes | every emitter; `generate-design-tokens --check` byte-compares | `lint` |
| `Tabs` reaches a real screen | it was registry-only until now | `a11y`, `contrast` |
| The page's tree changes | the conformance subject and the F-018 criterion-4 test, which asserts by CONTENT | `test` |

**The one to watch:** F-018 criterion 4 asserts the detail screen shows *everything the record
carries*, by content. Moving anything behind a tab removes it from the rendered tree — so that
test will fail for anything tabbed, and it will be **right** to. Whatever it catches either
belongs outside the tabs or needs the assertion rethought, and the default answer is the first.

## Test plan

- **Hero:** the swatch is the first painted thing and is full-bleed width — asserted from the
  tree, not from a style constant.
- **Prose, not rows:** the descriptions render as their own text nodes with no label beside them.
- **Provenance is not tabbed:** every provenance field is in the tree with no interaction — the
  assertion that criterion 4 actually needs, and the reason the tabs are scoped to derived data.
- **Tabs:** the selected panel renders and an unselected one does not. The second half is the
  decoy; without it a "tab" that rendered everything at once would pass.
- **`foreground.3`:** if it ships, the contrast gate measures it against both declared grounds at
  3:1. If it does not, the exemption carries the measured ratio.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:a11y && pnpm test:contrast
```

## Risks and open questions

**Tabs hide things, and this page's whole argument is that nothing is hidden.** The split — record
outside, derived inside — is the line, and it is a judgement rather than a rule. If it turns out
that a person expects harmony beside the colour rather than a tap away, the tabs were the wrong
answer and the page should be long instead.

**A full-bleed colour is the strongest test of the register.** *Put a real garment colour on
screen inside this interface — can you judge it accurately?* At full bleed there is no chrome
between the sample and the eye except the well and the keyline, which is the best case; if it
fails here it fails everywhere.

## Out of scope

The card (`cardSvg`) and its screen. The contemporary-equivalents feature (F-155), which will add
a section here and is a different question about what the corpus *says*.
