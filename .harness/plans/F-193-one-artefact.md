# Plan: F-193 — Icon, wordmark and launch sequence are one artefact

| | |
|---|---|
| **Feature** | F-193 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Criterion 1 is already true, and this says how

All three already derive from `MARK` in
[`packages/ui/src/brand.tsx`](../../packages/ui/src/brand.tsx):

| artefact | how it reaches the geometry | since |
|---|---|---|
| the five brand assets | `markGeometry()` **parses `MARK` out of the source** and throws if it moved | F-165 |
| the wordmark and `Mark` | it *is* `brand.tsx` | F-141 |
| the launch sequence | renders `<Mark size={SPLASH_IMAGE_WIDTH} />` — the component | F-190 |

Nothing carries a copy, and the generator's own error says why: *"this generator must follow it
rather than carry its own copy."*

## Criterion 2 is not true, and that is the work

**Nothing checks that what the generator PARSED equals what the component USES.**

`markGeometry()` reads four numbers by regex and throws when it cannot find them. It does not
throw when it finds the *wrong* ones. A `MARK` reshaped so the patterns still match — a second
`grid:` appearing above it, a value moved into a nested object — would give the generator one
geometry and the app another, and the icon would drift from the mark inside the app **silently**,
which is the exact failure `markGeometry()` was written to prevent.

The generator's `--check` compares assets against *its own* reading. If the reading is wrong,
`--check` agrees with it — [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].

## The assertion

In the generator's `--prove`, which is where the coupling lives and where the decoys already are:
import the component's real constants from `packages/ui/dist` and compare them against
`markGeometry()`.

```
markGeometry()  ===  { MARK.grid, MARK.petals, MARK.orbit, MARK.interval, PETAL_RADIUS, EYE_RADIUS }
```

Six numbers, exactly. If the parse ever disagrees with the component, this fires — which is
"a change to the geometry moves all three, or the build stops".

## And the third artefact is asserted too

The launch sequence is coupled by **rendering the component**, and that is a fact about source
rather than about numbers. A source assertion that `launch.tsx` renders `<Mark` — and not an
`<Image source=…>` — keeps the coupling from being replaced by an exported PNG, which is exactly
how an icon and an in-app mark drift apart in most products.

## Files to touch

```
scripts/generate-brand-assets.mjs   — the parse is compared against the component
apps/mobile/test/launch.test.tsx    — the launch renders the mark, not a picture of it
```

## Test plan

- **Six numbers agree**, asserted individually so a failure names which one.
- **The decoy**: the comparison is against values that could differ — asserted by checking the
  constants are non-trivial (a grid of 0 and a parse of 0 would agree about nothing).
- **The launch renders `Mark`**, and does not render an `Image`.

## Verification

`state · typecheck · lint · format · test · build`. **`artifact` (gate 16) is on this feature's
list and cannot run here** — no APK — and is reported as not run rather than counted.

## Risks

- **A regex reading source is still a regex.** This makes a wrong reading *fail loudly* instead
  of shipping; it does not make the reading robust. Replacing the parse with a real import is a
  larger change — the generator is a script and the component is TSX — and is not attempted here.

## Out of scope

Gate 16, which needs a built artefact.
