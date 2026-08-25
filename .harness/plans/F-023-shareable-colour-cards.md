# Plan: F-023 — Shareable colour cards

| | |
|---|---|
| **Feature** | F-023 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-50 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

A single colour as a card: its kanji, its readings, its English name, its hex, where it came
from, and the corpus version that produced it. The same entry at the same version produces the
same card, and it still reads at the size of a thumbnail.

**Done, to a user:** open a colour, see its card, and be able to tell at a glance what it is —
at full size and shrunk to a chat preview.

## Approach

### What "the same card on both platforms" can honestly mean

> *The same entry at the same corpus version renders the same card on both platforms.*

Taken as *"the same pixels"* this is unmeetable, and would quietly become an attested-forever
item. iOS and Android rasterise differently — hinting, subpixel positioning, antialiasing — and
no application code changes that. Promising it would be promising something nobody can check
and nobody can deliver.

So the card is a **document, not a bitmap**: `cardSvg(entry, …)` is a pure function returning
SVG text, and *that* is byte-identical across platforms because it is string building over
frozen bundle values. The claim becomes true, and — the part that matters — **checkable in CI
with no device at all**.

This is the same move `archive.ts` already makes for FR-58's *"byte-identical database"*, and
it gets an ADR for the same reason: it is a deliberate reading of an acceptance criterion, and
the alternative is softening it later without anyone noticing.

### Sharing bytes is FR-51, and that is not a dodge

FR-50 asks for *"a rendered card … includes corpus version"*. **FR-51 — export to CSV, JSON,
CSS, ASE, PDF — is R5** and owns getting files out of the app. So this feature renders the
card; it does not add `expo-sharing`, a rasteriser, or a device-only path. Said here so the gap
is a boundary rather than an omission.

### Text does not sit on the sample

The obvious card puts the hex over the colour. That would require choosing a legible foreground
**per entry**, against 120 different backgrounds, with no declared pairing to lean on — inventing
a contrast decision the manifest exists to make.

So the sample is a block and the text sits on the card's own ground, where the pairing is one
the manifest already declares and gate 9 already checks. Better design and less invention.

### The sample needs the keyline, for F-068's reason

A near-white entry on a near-white card has no perceptible boundary. `Swatch` solved this with a
**two-tone opaque keyline** whose worse tone still reaches 4.23 against the worst possible
sample — measured in `packages/design-tokens/test/swatch-edge.test.ts`. The card reuses
`swatch.hairline` and `swatch.hairline.inverse` rather than inventing a border, and inherits
that proof instead of re-deriving it.

### Every colour in the document is accounted for

An SVG needs literal colour values, which is exactly what the colour-literal rule forbids in a
component. The resolution is the one E-019 already uses for the generated stylesheet: the
document is **generated from tokens**, and a test asserts that every colour in it is either a
`@irodora/design-tokens` value or the entry's own published hex. A hand-typed colour fails.

### Readable at thumbnail size is arithmetic, not taste

The card declares its own dimensions, so *"readable at thumbnail"* is checkable: every text size,
scaled by `thumbnailWidth / cardWidth`, must clear a stated floor. The floor and the thumbnail
width are both declared constants with reasons, not numbers chosen to make a test pass.

**Reused:** `nativeColors`, `nativeType`, `swatch.hairline*` (`@irodora/design-tokens`) ·
`allEntries`, `entryBySlug`, `CORPUS_LABEL` (`src/corpus`) · `Surface`, `Text` (`@irodora/ui`) ·
the screen conformance suite.

**New:** `apps/mobile/src/card.ts` — the pure document builder · `ColourCard.tsx` — the surface ·
one ADR.

### Increments

1. Prove `react-native-svg` renders under jest at all — if `SvgXml` does not, the plan changes
   before anything is built on it.
2. `card.ts` — the document, pure. Tests: determinism, contents, token accounting, thumbnail
   arithmetic, with decoys.
3. i18n, `ColourCard.tsx`, a route, and a way in from the colour detail screen.
4. Screen registration and assertions.
5. ADR, effects, memory, progress.

## Files to touch

```
apps/mobile/src/card.ts                  — NEW: cardSvg(), pure and deterministic
apps/mobile/test/card.test.ts            — NEW
apps/mobile/src/screens/ColourCard.tsx   — NEW
apps/mobile/app/card/[slug].tsx          — NEW route
apps/mobile/src/screens/ColourDetail.tsx — a way in
apps/mobile/src/i18n/{en,ja}.ts          — the copy
apps/mobile/test/screens.test.tsx        — register the screen
docs/adr/0070-…                          — NEW; plus the index row
.harness/state/effects.json + memory/    — the new link
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **The card document** consumes design tokens as literal values | `design-system.manifest.json` → the card | `gate:test` — the token-accounting assertion. A **new destination for E-007**, which until now stopped at components |
| **The card embeds the corpus version and derived values** | a corpus publish changes every card | `gate:content` — E-022's `--check`, existing |
| **New Japanese copy** | the bundled font subset | `script:verify-font-coverage.mjs` — E-017, which has fired on five consecutive features |
| **A new screen** | the conformance registry · `a11y-scope.mjs` | `gate:a11y` |

## Test plan

- **Determinism:** the same entry and version produce a byte-identical string, twice, and across
  a fresh module load. This is the acceptance criterion, asserted as what it actually is.
- **Contents:** kanji, kana, romaji, English name, hex, attribution and corpus version all appear
  — asserted individually, because a card missing one is the failure FR-50 names.
- **Token accounting:** every colour in the document is a token value or the entry's own hex.
  **Decoy:** a card built with a hand-typed colour is reported.
- **Thumbnail:** every text size clears the floor when scaled to the thumbnail width. **Decoy:**
  a size just under the floor fails, so the check is not vacuous.
- **Escaping:** an entry name containing `&` or `<` must not produce malformed XML. The corpus
  has none today, which is exactly why the test supplies one — a check that only ever sees safe
  input is a check nobody has watched work.
- **E2E:** cannot run. F-091 carries gate 7; this is the sixth feature to report it.

## Verification

```
node scripts/verify-state.mjs
node scripts/gate.mjs typecheck && node scripts/gate.mjs build && node scripts/gate.mjs lint
node scripts/gate.mjs test
node scripts/gate.mjs test:a11y && node scripts/gate.mjs test:contrast
node scripts/verify-content.mjs && node scripts/verify-font-coverage.mjs
```

`test` stays **red repo-wide** on this workstation — the four bitwise fixtures under Node 22
that F-093 made visible and F-083 owns. Evidence to capture is a forced run of the packages this
feature touches.

## Risks and open questions

- **`react-native-svg` may not render under jest-expo.** It is a declared dependency that
  nothing currently imports, so this is unproven. Increment 1 settles it before anything depends
  on it; if it fails, the card document is unchanged and only the display path changes.
- **The card is a document nobody can yet send anywhere.** Deliberate — FR-51 owns export — and
  stated on the screen rather than left implicit.
- **Thumbnail legibility is arithmetic about declared sizes**, not a measurement of a rendered
  glyph. A font whose figures are narrower than assumed is not covered; that is the same
  standing limit as F-019's tabular-numerals attestation.
- No `OQ-*` blocks this feature.

## Out of scope

Export to a file, a share sheet, or any rasteriser (**FR-51**, R5) · a palette card (**F-023**
is a *colour* card) · printing · a card for a user-built palette · social metadata.
