# Plan: F-212 — The token-reach proof rotted the same way twice

| | |
|---|---|
| **Feature** | F-212 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-25 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The failure

CI is red at gate 8, on its own step `node scripts/verify-token-reach.mjs --prove`:

```
✗ removing the map a component resolves through names its values
  nativeElevation → surface.1, with every literal reader already gone
```

## What the case is for

`surface.1` is reached two ways: as a **literal** in components, and **through a map** —
`nativeElevation[level]`. The case proves the checker counts the second as reaching:

| | plant | must |
|---|---|---|
| A | every literal reader removed, map kept | **not** name `surface.1` |
| B | every literal reader removed **and the map** | name it |

**B fails.** After removing both, `surface.1` is still reached.

## Why: the fixture rotted, on an axis the last repair did not consider

The case names one file:

```js
const MAP_FILE = 'packages/ui/src/Surface.tsx';
```

**F-184 gave `Card.tsx` its own direct import of `nativeElevation`**, resolving
`nativeElevation[level]` at line 150. Removing the map from `Surface.tsx` no longer removes every
path to `surface.1`, so the token stays reached and B cannot discriminate.

This case's own docblock records it rotting **once before** — F-143 and F-145 gave `surface.1`
literal readers and *"CI was red for every push afterwards"*. It was rebuilt into two halves to
survive new **literal** readers. Nobody considered a second **map** reader, and that is the axis
it rotted on this time.

## The fix, and it is the one the file already knows

The spacing case directly below it learned the general lesson when it rotted:

> *Picking the most-read step from the tree means the next conversion cannot rot it again.*

So the colour case stops naming a file and **discovers every file that resolves through the map
at runtime**, planting into all of them. A third component reading `nativeElevation` then cannot
rot it, because the plant finds it.

## Files to touch

```
scripts/verify-token-reach.mjs   — the map files are discovered, not named
```

## Test plan

- **Both halves discriminate again**, which is the proof running green.
- **The case would have caught F-184**: with the map removed from *only* `Surface.tsx` — the old
  behaviour — `surface.1` is still reached, and that is asserted as its own case so the
  regression has a name rather than being implied by the repair.
- **The plant is not vacuous**: it throws if a named file does not contain the map, which
  `without()` already does — so a discovery that found nothing fails loudly rather than passing
  over an empty set.

## Verification

`state · lint · format · test · a11y` — and the proof itself, which is the subject.

## Risks

- **A discovered file list can include a file that mentions the map in a comment.** The scanner
  strips comments already (`stripComments`), which is what makes that safe, and it is stated
  rather than assumed.

## Out of scope

The other cases in this proof, which pass.
