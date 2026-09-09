# A parse that can find the wrong numbers is worse than one that finds none

**Effect:** [E-116](../../state/effects.json) · `packages/ui/src/brand.tsx` →
`scripts/generate-brand-assets.mjs` → the five brand assets · **medium**

## What happened

F-193 asked that the icon, the wordmark and the launch sequence be **one artefact**, and the
first half of the finding was that they already were:

| artefact | how it reaches `MARK` |
|---|---|
| the five brand assets | `markGeometry()` parses `MARK` out of `brand.tsx` |
| the wordmark and `Mark` | it *is* `brand.tsx` |
| the launch sequence | renders `<Mark size={SPLASH_IMAGE_WIDTH} />` |

Nothing carried a copy. What nothing checked was that the **parse read the right numbers**.

`markGeometry()` matched four regexes against the whole file and threw when it could not FIND
them. It could not tell that it had found the WRONG ones. A `grid:` appearing anywhere above
`MARK` — a neighbouring constant, an example in a comment — would give the generator one
geometry and the app another. And `--check` could not see it either, because `--check` compares
the produced assets against *that same reading*:
[[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].

## Two attempts that were fighting the toolchain

**In the generator, importing the component's constants.** `brand.tsx` imports `react-native`
and `react-native-svg`, so Node cannot load it — which is *precisely why the parse exists*. The
guard was unavailable for the same reason the thing it guards is necessary.

**In jest, importing `markGeometry` from the `.mjs`.** The test can load the component. It
cannot load the script: "Jest encountered an unexpected token".

Both were trying to **detect** a wrong reading across a boundary that exists to keep the two
sides apart.

## What worked: narrow the parse until the failure cannot occur

Two refusals, and no comparison at all:

- exactly one `export const MARK` in the file, or throw naming the count;
- the numbers read only from **between its braces**, not from the file.

A `grid: 999` above `MARK` no longer reaches the parse, because the parse can no longer see it.

The three cases in `--prove` hand `markGeometry` a mutated source and watch it refuse — a
refusal nobody has seen refuse is a condition that parses. The third is the decoy: a function
that threw on *everything* would satisfy the second case, so a source with **no** `MARK` must be
refused too.

## The part that can go wrong quietly

**The regex is still a regex.** This makes a wrong reading fail loudly instead of shipping; it
does not make the reading robust. `MARK` reshaped so a value moves into a nested object inside
the block would still be read wrongly, and nothing here would notice. Replacing the parse with a
real import means making the component loadable from Node, which is a larger change than this
feature.

The closing line of `--prove` was itself an instance: it said *"four assets, three decoys"* —
typed once, true once, and wrong the moment cases were added. It now counts what ran.

## The general shape

When a check cannot observe the failure it is written for, the answer is not a cleverer
observer. **Narrow the thing being checked until the failure has nowhere to live**, then prove
the narrowing by watching it refuse. A guard you can only write by defeating a boundary is
usually telling you the boundary is the guard.

Related: [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]],
[[a-fixture-that-names-a-file-rots-when-the-file-does]]
