# Plan: F-169 — Roundness reaches the colour containers themselves

| | |
|---|---|
| **Feature** | F-169 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-9 |
| **Service / package** | `packages/design-tokens` · `packages/ui` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-06 |

---

## Intent

*"When I said I need roundness in color card, I said for every containers, the main color
container of color is still rectangular."*

Done, to a person: the swatch — the thing that shows a colour, which is most of what is on most
screens — reads as a rounded object rather than a rectangle with the edges taken off.

## Which container, before anything is changed

The feature's own note says to find this first, because *the hero block, the card in a list and
the swatch are three different surfaces and only one of them is a sample*. Measured:

| surface | radius today | reads as |
|---|---:|---|
| `Surface` (every card, `radius="md"`) | 14 px | rounded |
| `Swatch` hero on a colour page (~340 px) | 42 px | rounded |
| **`Swatch` in a list or grid (44 px)** | **5.5 px** | **a rectangle** |
| **`Swatch` in the Lens readout (56 px)** | **7 px** | **a rectangle** |

So the cards are fine and the **sample** is not — which matches the report word for word: *the
main colour container of colour*. The swatches at 32–56 px are what fill the Atlas, the wardrobe
grid, the nearest-colour lists and every readout.

## Why it is 5.5 px, and why that is not simply a number to raise

[ADR-0090](../../docs/adr/0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md)
made the corner a **ratio** — 0.125 — and bounded it by `_maxSampledAreaLoss: 0.02`, enforced at
parse time. A rounded square loses `(4 − π)r²`, so the fraction lost is `0.8584 · ratio²`, and
that ceiling caps the ratio at about **0.153**. There is no value inside the current bound that
would look different.

**So the question is whether the bound measures the right thing, and it does not.**

Its stated reason is that a corner *"removes sampled area from exactly the region the eye uses to
judge a flat colour"*. Area does affect colour appearance — larger samples read lighter and more
colourful — but that effect needs an order-of-magnitude change in area to matter. The difference
between losing 1.3 % and losing 5.4 % is not something anyone can see.

What actually degrades a sample is different: **a corner large enough stops the shape being a
field and starts making it a blob.** At `ratio = 0.5` a square is a circle. A circle is a worse
container for judging a colour than a rectangle — proportionally more edge, and edge is where
simultaneous contrast acts, which is the physics `swatch.well` already exists for.

## Approach

**Replace the bound with one that measures the thing that matters.**

> **The straight part of every edge must be at least half of it.**
>
> `side − 2r ≥ side / 2`, so `ratio ≤ 0.25`.

At the limit, half of each edge is still a straight run of colour and the sample still reads as a
rectangle with softened corners. Past it the corners meet and the shape becomes a curve. That is
a geometric criterion with a statable reason, and the number falls out of it rather than being
chosen to reach a look.

**And cap it, because a pure ratio is wrong at the top end.** At 0.25 the hero would take an
85 px corner, which is a curve rather than a corner. The cap is **`radius.xl` (28)** — the largest
corner the design system already draws — so a swatch's corner is a proportion of the sample until
it reaches the biggest corner in the product, and then stops. No new number: the cap is the top of
the existing scale.

```
 32 px →  8      44 px → 11      56 px → 14      100 px → 25      340 px → 28 (capped)
```

**Reused:** `nativeRadius`, the manifest parser's existing `_`-prefixed constraint convention, the
concentric-keyline arithmetic in `swatchCorner`, and `swatch-corners.test.tsx`.

**Increments:**

1. ADR-0094, superseding ADR-0090's bound (not its ratio-not-a-length decision, which was right).
2. The manifest: `swatchRatio` 0.125 → 0.25, `_maxSampledAreaLoss` → `_minStraightEdgeFraction`.
3. The parser guard, rewritten around the new criterion.
4. `swatchCorner` caps at `nativeRadius.xl`.
5. Tests, including the two directions of the cap.

## Files to touch

```
docs/design/design-system.manifest.json      — the ratio and the constraint
packages/design-tokens/src/manifest.ts       — the parse-time guard
packages/ui/src/Swatch.tsx                   — the cap
packages/ui/test/swatch-corners.test.tsx     — the assertions
docs/adr/0094-…                              — supersedes ADR-0090's bound
```

## Anticipated effects

- **Every swatch in the product changes shape** ⇒ the conformance suite, the screen tests, and
  `apps/mobile/src/card.ts`'s exported SVG if it draws a corner. Guard: `pnpm test` across both
  packages; `swatch-corners.test.tsx` asserts the keyline stays concentric at every size, which is
  the failure a bigger corner would produce first.
- **A manifest constraint is renamed** ⇒ the parser throws by name on the old key, so a stale
  manifest cannot parse. Guard: the parser, and a test that the guard still refuses an
  out-of-bounds ratio.
- **ADR-0090 is superseded in part** ⇒ the retired-surface scan reads ADRs for vocabulary. Guard:
  gate 0, which skips superseded ADRs as history.

## Test plan

- **The criterion, as an assertion:** at the declared ratio the straight run of each edge is at
  least half the side, and the parser refuses a ratio where it is not — with a decoy ratio that
  must be accepted, or the guard could be refusing everything.
- **The cap, both ways:** a size below the cap scales with the ratio; a size above it stops at
  `radius.xl`; and the keyline stays exactly one unit outside the sample at both.
- **The sizes the product actually draws**, named: 32, 44, 56, and a hero, so a later change to
  the ratio or the cap fails against real values rather than against an abstraction.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **Nobody has looked at it.** The same limit as every visual feature here: the numbers are
  right and whether 11 px on a 44 px swatch reads as *Apple-like* is a judgement made on a phone.
- **A rounder sample loses more area than before**, and that was ADR-0090's stated worry. The
  answer is that the worry was mis-measured, not that it was imaginary — and the new bound is
  strictly *about* the sample remaining judgeable, which the old one only approximated.

## Out of scope

- The `Surface` radius. Every card in the app already takes `md` (14) and none overrides it; the
  report names the colour container, and changing the card scale as well would be changing
  something nobody asked about in the same commit.
