# Plan: F-151 — Palette Studio, Compare and Finder

|                       |                                                                   |
| --------------------- | ----------------------------------------------------------------- |
| **Feature**           | F-151 — [`feature_list.json`](../state/feature_list.json)          |
| **Requirements**      | FR-7, FR-47, NFR-25                                                |
| **Service / package** | `apps/mobile` · `packages/ui` · `packages/design-tokens`           |
| **Author**            | Claude Code (generator)                                            |
| **Date**              | 2026-09-07                                                         |

---

## Intent

Three instrument surfaces, one failure: **a colour is drawn at a size for identifying it, on a
screen whose job is judging it.** Every sample in Compare, the Finder and the Studio is 32–56 dp —
a thumbnail — and the numbers beside them carry the same visual weight as the thing they describe.

Compare is the sharpest case and the one the feature notes single out: two colours that exist to
be assessed *against each other* are currently in separate cards, separated by their own metadata.

## The number this feature turns on

The product's colorimetry is already the **CIE 2° standard observer** — `whitepoints.ts` carries
D65/2° and D50/2°, and the calibration reader refuses a patch value whose observer is unstated.
ΔE00 is parameterised for that observer.

So a sample presented as *the subject of a ΔE00* and drawn smaller than 2° is being judged under
conditions the number was not fit for. Below roughly 1° the effect is measurable rather than
theoretical: the central fovea is sparse in S-cones, and small fields lose blue–yellow
discrimination — small-field tritanopia.

At a phone viewing distance of **350 mm**:

```
2 · 350 · tan(1°)          = 12.2185 mm
1 dp = 25.4/160 mm         =  0.15875 mm
                           = 76.97 dp   →  77
```

**`size.judgeable` is derived, not written down.** The manifest carries `observerDegrees`,
`viewingDistanceMm` and `dpPerInch`; the parser computes the dp. Writing 77 into the manifest is
refused, the way `radius.swatch` refuses a value that is not the ratio — a constant nobody can
re-derive is [E-085](../memory/effects/a-derived-check-catches-the-change-a-written-down-one-waves-through.md)
waiting to happen.

The viewing distance is an **assumption**, and it is stated as one in the ADR. It is the only soft
input; the observer and the dp definition are standards.

## The line that keeps this honest: a list ranks, a pair judges

Not every sample grows. The Finder's rows carry a ΔE00 and are 40 dp, and **that is correct** —
you are choosing which colour to open, not judging a difference. Raising every result row to 77 dp
would turn a scannable list into four results a screen, which is worse at the job it has.

So the rule is scoped by what the screen asks of you:

| the screen asks you to… | the sample                              |
| ----------------------- | --------------------------------------- |
| **judge** a difference  | reaches `judgeable`, and the pair touches |
| **rank or choose**      | stays a thumbnail                        |

A screen that ranks must then not present itself as judging — which is why the Finder work below
is about the number's weight rather than the swatch's size.

## Approach, in increments

### 1. `size.judgeable`, derived (packages/design-tokens)

Manifest inputs, parser-computed value, emitted as `nativeJudgeableSample` / `JUDGEABLE_SAMPLE`.
A test re-derives it from the published constants rather than asserting 77, so a changed viewing
distance moves the value and the test together — and a literal `judgeable` in the manifest is a
parse error.

### 2. `Pair` (packages/ui) — acceptance 2

Two samples **sharing a boundary** inside one `swatch.well`, each half at least `judgeable`, every
number beneath.

**No keyline between the two halves**, and that is the colour-science half of the component rather
than a style choice: a line between two samples is an induced edge, and it changes the very
judgement the pair exists to support. The two-tone keyline still rings the pair as a whole, where
its job — an edge against the well and against the page — is unchanged.

Each half keeps its own accessible name with provenance (`swatchAccessibleName`), because a
`Color` is what the component takes and ADR-0005 does not bend for a new container. Labels sit
beneath, so the pair carries a text channel and golden rule 13 is satisfied by structure.

### 3. Compare — acceptance 2

The pair goes to the top, the two slot pickers move below it. The pickers keep their 32 dp
thumbnails: choosing a colour to compare is ranking, not judging.

### 4. Palette Studio — acceptance 1

The draft renders as a **strip** above the member rows: all members edge to edge, each width
proportional to its rank-derived weight, the strip at least `judgeable` tall. The screen already
says *order is proportion* (`studio.order`) and has never shown it — the strip is that sentence
made visible, and it is also the only view in which the relationships between the members can be
seen at once.

Member rows keep their controls and grow their sample to `judgeable`.

### 5. Finder — acceptance 3

Field first, and no layout jump. The answer header and the region panel currently mount and
unmount, so results move under the reader's thumb between keystrokes. The header becomes one slot
whose height does not depend on which branch rendered, and the result list's position is therefore
fixed from the first keystroke.

### 6. The missing direction of the tabular check — acceptance 4

`screens.test.tsx` asserts *everything marked `numeric` is selectable*. It does not assert **that a
figure is marked at all** — a `<Text>` rendering `4.23` with no `numeric` passes today, which is
the same shape as every effect recorded this month: a check thorough about its own subject and
silent one step outside it.

The new direction: a text node whose whole content is a figure must be `numeric`. Decoys in both
directions, and a stated exclusion list for the nodes that are legitimately not figures (a hex is
already numeric; a version string is not a figure).

**Reused:** `Swatch`'s `swatchCorner`, `keylineTones` and `swatchAccessibleName`; the `swatch.well`
token; `Surface`, `Stack`, `Row`, `Text`; the conformance registry; `compare()` and `find()`, both
of which stay untouched — no screen in this feature computes anything.

## Files to touch

```
docs/design/design-system.manifest.json        — the three inputs
packages/design-tokens/src/manifest.ts         — derive judgeable, refuse a literal
packages/design-tokens/src/emit/*.ts           — emit it
packages/ui/src/Pair.tsx                       — new
packages/ui/src/index.ts                       — export it
apps/mobile/src/screens/Compare.tsx            — the pair leads
apps/mobile/src/screens/PaletteStudio.tsx      — the strip
apps/mobile/src/screens/Finder.tsx             — a header that does not jump
apps/mobile/test/screens.test.tsx              — subjects + the missing direction
packages/ui/test/                              — Pair's own tests
docs/adr/0095-*.md                             — the sample floor and the list/pair line
```

## Anticipated effects

- **A new size constant reaches every screen that draws a sample** ⇒ the viewport gate
  (`NARROWEST_WIDTH − 2 × MAX_PADDING = 264`). 77 is well inside it, and a pair that fills the
  available width gives each half 132 dp on the narrowest phone. Guard: gate 2 viewport.
- **A new `@irodora/ui` component** ⇒ `a11y-scope.mjs` fails it until a conformance registry
  reaches it. That is the guard working, and it fired the same way in F-152.
- **New tokens read / old ones newly unread** ⇒ gate 8 token-reach, in both directions.
- **Two samples touching** ⇒ gate 9 contrast and gate 10 CVD. The pair's own boundary is
  sample-against-sample, which has no token by construction and is therefore gate 9's declared
  blind spot — so the Pair asserts its own edge case in its tests rather than assuming the gate
  covers it.

## Test plan

- **`judgeable` is re-derived** from the observer, the distance and the dp definition; a manifest
  that writes the value literally fails to parse.
- **`Pair`**: both halves reach the floor at the narrowest width; no keyline is drawn between
  them; each half's accessible name carries name, hex and provenance; the labels are beneath and
  are real text nodes.
- **Compare**: the pair precedes every metric in the tree order, and the two samples are siblings
  with nothing between them — asserted structurally rather than by pixel.
- **Studio**: the strip's widths follow the rank-derived weights, and reordering changes them.
- **Finder**: the y-position of the first result row is identical across the empty, name, hex and
  phrase answers — the layout-jump criterion, asserted rather than eyeballed.
- **The tabular direction**, with decoys both ways.

## Risks and open questions

- **The viewing distance is an assumption.** 350 mm is a reasonable central figure and the ADR
  says so; a person holding a phone at 250 mm is looking at a 2.8° field, which is fine, and one at
  500 mm is looking at 1.4°, which is not. The floor is a floor, not a guarantee.
- **A wider pair is not a bigger pair.** Filling the width satisfies the floor comfortably on
  every phone but does nothing about height, which is what the fixed dimension has to carry.
- **The strip's proportions come from the weight ladder**, which is derived from rank in
  `palette.ts`. If that ladder changes, the strip changes with it — correct, and worth stating so
  the strip is not read as a second opinion about proportion.

## Out of scope

- The Atlas, the colour page and the Lens. F-152 is the remaining-surfaces sweep and it is next.
- Any change to `compare()`, `find()` or `palette.ts`. These screens format; they do not compute,
  and this feature does not change that.
- Gesture reordering in the Studio. The buttons work, are accessible, and a drag affordance is a
  different feature from the size of the samples.
