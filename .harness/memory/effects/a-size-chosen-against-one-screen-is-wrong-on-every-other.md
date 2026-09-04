# A size chosen against one screen is wrong on every other

**Effect:** [E-076](../../state/effects.json) · `Wardrobe.tsx` → `ColourDetail.tsx` · **medium**

## What happened

Two fixed pixel widths, written two features apart, both mine, both the same mistake.

| constant | needs | 320pt (SE) | 360pt (Android) | 390pt |
| --- | --- | --- | --- | --- |
| `CELL_PHOTO = 160` ×2 + gap | 332 | **264** ✗ | **304** ✗ | 334 ✓ |
| `HERO = 320` in `padding="xs"` | 320 | **312** ✗ | 352 ✓ | 382 ✓ |

The wardrobe gallery overflowed on **every phone narrower than about 390pt** — most Android
hardware. The arithmetic is not close; it is off by 28pt on a common device.

## Why nothing caught it

**Nothing in this repository lays anything out.** `react-test-renderer` builds a tree without a
viewport, so the conformance suite reads structure, the contrast gate reads colours, and the a11y
gate reads roles. To all of them, a number larger than the screen is indistinguishable from a
number that fits.

It took a person holding a phone.

## The fix is not a smaller number

That is the part worth carrying. A smaller constant is wrong on a *different* device — it just
moves which one. Deriving from `useWindowDimensions()` makes the size **a consequence of the
space rather than a guess about it**, and it re-renders on rotation and on a foldable opening,
which no constant can.

```ts
const photoSize = Math.floor((width - GRID_GUTTERS) / COLUMNS);
```

A cell in a two-column grid cannot overflow, because it is computed from what it has to fit
inside.

## What the gate can and cannot do

`verify-viewport` fails a numeric `width`, `height` or `size` in a screen that exceeds
`NARROWEST_WIDTH − 2 × MAX_PADDING`. That catches the shape that shipped twice.

It **cannot check layout**, and prints so on every run: overflow through accumulated padding, an
unbreakable Japanese string, or a flex child that refuses to shrink is invisible to it. A gate
that overstated its reach would be worse than the one that admits its limit.

One decoy earns its place: a comment mentioning `width: 320` must stay green. This repository
discusses its own numbers by name — the docblock explaining *this very fix* contains the string —
so a check that fired on prose would have made documenting the fix reintroduce the failure.

Related: [[turning-off-a-header-turned-off-the-only-thing-insetting-anything]]
