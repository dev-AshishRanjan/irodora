# ADR-0095 — A sample that carries a number subtends the observer that number was fit for

## Status

**Accepted** — F-151.

## Date

2026-09-07

## Context

Three instrument surfaces — Compare, the Finder and Palette Studio — failed the same way, and
the feature's own note named it: *"the colours are too small to judge, and the numbers carry the
same visual weight as the thing they describe."*

Measured before anything was changed:

| surface | sample | what the screen asks of you |
| ------------------------ | -----: | --------------------------------------- |
| Compare, each slot       |  56 dp | judge how different these two are       |
| Palette Studio, a member |  48 dp | judge how these colours sit together    |
| Studio picker, Compare picker | 32 dp | choose one from a list             |
| Finder, a result row     |  40 dp | choose which one to open                |

Every sample in the product is drawn at a size for **identifying** a colour. Two of those rows
are screens that ask you to **judge** one, and the product had never distinguished the two jobs.

Compare was the sharpest case, and structurally rather than by size alone: the two colours sat in
separate cards, each with its own well, its own keyline and its own metadata. Two colours that
exist to be assessed against each other were never adjacent to each other.

## The decision

**Where a screen asks a reader to judge a colour, the sample subtends at least the observer the
product's own colour metric is defined for. Where a screen asks them to rank or choose, it need
not.**

The floor is `size.judgeable`, and it is **derived rather than declared**.

### Why the observer is the right quantity

This product's colorimetry is the **CIE 2° standard observer** throughout. `whitepoints.ts`
carries D65/2° and D50/2°; `color-calibration` refuses a published patch value whose observer is
unstated, because *"D50/2° and D65/2° values for the same physical patch are different numbers"*.
ΔE00 is parameterised for that observer.

So a sample presented as **the subject of a colour difference** and drawn smaller than 2° is
being judged under conditions the number beside it was not fit for. That is not pedantry at the
bottom of the range: below roughly 1°, small-field colour vision measurably differs, because the
central fovea is sparse in S-cones and small fields lose blue–yellow discrimination.

Choosing a size by eye would have produced a number that felt right and could not be argued with.
This one can be checked, and it moves when its inputs do.

### The arithmetic

```
2 · d · tan(θ/2)      the chord a field of θ subtends at distance d
1 dp = 25.4 / 160 mm  the density-independent pixel's own definition

θ = 2°, d = 350 mm →  12.2185 mm  →  76.97 dp  →  77
```

`docs/design/design-system.manifest.json` carries `observerDegrees`, `viewingDistanceMm` and
`dpPerInch`. `parseManifest` computes the dp and **refuses a `judgeable` key written literally**,
for the reason [E-085](../../.harness/memory/effects/a-derived-check-catches-the-change-a-written-down-one-waves-through.md)
records: a constant copied out of its reasoning cannot be checked against it later, and the
Android safe-zone assertion had already carried a previous mark's numbers and would have passed
while the new one was clipped.

The floor applies to the **smaller** dimension. A field is 2° across only if its narrowest run is.

### The one soft input, stated as one

**350 mm is an assumption**, and the only one here — the observer and the dp definition are
standards. It is a central figure for a phone in the hand. A person holding one at 250 mm sees a
2.8° field, which is fine; at 500 mm they see 1.4°, which is not. The floor is a floor, not a
guarantee about anybody's posture.

## The line: a list ranks, a pair judges

The Finder's result rows carry a ΔE00 and are 40 dp, and **they stay 40 dp**. You are choosing
which colour to open, not judging a difference — the number orders the list. Raising every row to
77 dp would turn a scannable list into four results a screen, which is worse at the job the list
has, and a rule that did that would be switched off within a week.

So the rule is scoped by what the surface asks:

| the screen asks you to… | the sample                                 |
| ----------------------- | ------------------------------------------ |
| **judge** a difference  | reaches the floor, and the samples touch   |
| **rank or choose**      | stays a thumbnail                          |

A screen that ranks must then not present itself as judging, which is why F-151's Finder work is
about the answer's position and the number's weight rather than about the swatch's size.

## And the samples touch

`Pair` and `Strip` draw **no keyline and no corner where two samples meet**. This is the half of
the decision that is about arrangement rather than size, and it matters as much:

The question *how different are these two* is answered at the boundary. Simultaneous contrast
acts at an edge, and so does the visual system's own difference machinery — a discontinuity you
can see is a difference, and one you cannot see is not. Anything drawn between two samples is an
induced edge sitting exactly where the judgement happens, and it costs most for the **small**
differences, which are the ones anybody is squinting at.

The two-tone keyline (F-068) still rings the pair, where its job is unchanged: an edge against
the well and against the page. The ring is chosen against the **well** rather than against a
sample, because a pair has two samples and one ring — and the well is a known colour, which is
the easy half of the problem the two tones were built for. Each sample still gets the tone chosen
against **itself** on its three outer edges.

**When the boundary is invisible, that is the answer.** Two colours that cannot be told apart
edge to edge cannot be told apart, and the number beneath says how much difference the metric
found. A seam drawn there would answer a question nobody asked and hide the one they did.

## Consequences

- **A new floor reaches every surface that presents a colour for judgement.** Compare and the
  Studio strip take it now; F-152 sweeps the rest.
- **The narrowest supported phone still fits.** The viewport gate allows 320 dp with 28 dp of
  padding either side, so a full-width pair gives each half 124 dp — comfortably past the floor
  in both dimensions. Asserted from the well's padding and the ring rather than from a measured
  number.
- **A changed viewing distance changes the floor**, and the manifest test re-derives it rather
  than asserting 77 — so the value and its reasoning cannot drift apart.
- **This says nothing about how large a sample should be when nothing is being judged.** A
  wardrobe thumbnail, an Atlas grid cell and a picker row are all outside it, deliberately.

## Alternatives considered

**A fixed pixel size chosen by eye.** Faster, unarguable, and unfalsifiable. The repository has
recorded the cost of that twice this month — a written-down constant is a constant nobody can
check against the thing it came from.

**Raise every sample everywhere.** Simpler to state and worse to use: it makes lists unusable at
the job lists have, which is why the scope line exists.

**Keep the samples separate and put the number between them.** This is what the screen did, and
it is the arrangement that makes the judgement hardest — the reader compares each sample against
the furniture rather than against the other sample.

**Express the floor in millimetres.** Honest about the physics and useless to a layout: React
Native lays out in dp, so the conversion has to happen somewhere, and doing it once at parse time
means every consumer gets the same number.
