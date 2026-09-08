# Plan: F-177 — The sheet is a sheet: detents, an inset, and content that scrolls

| | |
|---|---|
| **Feature** | F-177 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, FR-71 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-09-08 |

---

## Intent

Reported as: *"we can't drag the bottom sheet up or down, and the bottom sheet opens full
screen. It should … have a little bit space at top."*

Both are true and they are the same cause. `Sheet` passes gorhom **no `snapPoints`**, and
gorhom's `enableDynamicSizing` defaults to `true` — so the sheet has exactly **one** detent,
sized to its content and capped at the container height. There is nothing to drag *to*, and
content taller than the screen makes the sheet the screen.

`F-158` recorded this as a decision: *"No snap points. A result sheet fixed at a fraction of the
screen is either cropping the result or padding it, and the content is the only thing that knows
which."* **The argument is right and the conclusion does not follow** — it rules out a *fixed*
fraction, not a second detent. This feature keeps the content-sized rest position and adds the
things a fixed fraction would have bought.

Done, to a user: the sheet arrives at the height its content needs, never covers the top of the
page, can be dragged up for more and back down, and scrolls inside itself when there is more
than fits.

## Approach

**Reused:** gorhom's own detent machinery, reached through HeroUI's `BottomSheet.Content`, which
spreads `Partial<BottomSheetProps>` — so `snapPoints`, `enableDynamicSizing` and
`maxDynamicContentSize` all reach it without touching the wrapper's shape. `useMotion` from
F-144 for the reduced-motion branch. `useWindowDimensions`, which `verify-viewport` explicitly
recommends for a derived size (safe-area insets are the restricted thing, and this is not one).

**New:** two constants and a scroll container. No new component.

### How the detents work, read out of gorhom rather than assumed

`useAnimatedDetents` normalises the provided snap points, computes a **dynamic** detent from the
measured content height clamped by `maxDynamicContentSize`, pushes it into the list *if it is not
already there*, and sorts. So providing one snap point **and** leaving dynamic sizing on gives:

```
snapPoints:            ['90%']
maxDynamicContentSize:  height * 0.80

short content  →  detents [content, 90%]   rests small, drags up
tall content   →  detents [80%,     90%]   rests at 80%, drags up, scrolls inside
```

**Neither case can reach the top of the screen**, which is the "little bit space" — and it is
a property of the ceiling rather than of an inset, so it holds on every device without this
package reading a safe area it is not allowed to read.

The two numbers are deliberately apart. Setting the cap equal to the snap point would let
rounding produce two detents a pixel apart, which drags like a stutter.

### Content scrolls, and that is what makes the ceiling safe

`BottomSheetScrollView` rather than the plain view HeroUI supplies. It reports its content
height into dynamic sizing through `useBottomSheetContentSizeSetter`, so the rest position is
still measured — and when the content exceeds the ceiling it scrolls instead of growing. Without
it, a ceiling would crop.

### The handle settles

`animationConfigs` takes a spring. Under reduced motion it takes a zero-duration timing instead —
**not a faster spring**, which is the distinction `useMotion` already draws and
`verify-motion.mjs` enforces. Only position animates, which is a transform.

**Increments:**

1. The constants and the detent props, with the test that asserts they reach the rendered sheet.
2. The scroll container.
3. The spring, and its reduced-motion branch.

## Files to touch

```
packages/ui/src/overlay.tsx    — Sheet gains detents, a ceiling, a scroll container, a spring
packages/ui/test/overlay.test.tsx (or components.test.tsx) — the assertions
docs/design/DESIGN-SYSTEM.md   — the sheet's shape
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `Sheet` gains detents | the Lens result panel — the only consumer today | the conformance suite renders `Sheet`; `Lens` screen subjects render it open |
| content moves into a scrollable | anything relying on the sheet sizing to content | the detent test, and the Lens screen subjects |

No new effect id. E-007 does not cover this — it is a component-shape change, not a token change
— and the honest answer is that **no effect link covers "a wrapper's defaults changed"**. Noted
in the trace step rather than invented here.

## Test plan

- **Unit:** the rendered sheet carries a `snapPoints` array, `maxDynamicContentSize` strictly
  below the snap point it is paired with, and a scrollable content container. A test that
  asserts the props **reach the tree** is the point: the defect was a default silently winning,
  and a test of our constants alone would not have caught it.
- **Negative, with a decoy:** removing `snapPoints` must make the test fail. Asserted by
  rendering a sheet with the props stripped, so the check is watched failing rather than assumed.
- **Conformance:** `Sheet` in both themes, open and closed.
- **Reduced motion:** the animation config is a timing with duration 0 when reduced, and a
  spring otherwise.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:a11y && pnpm test:contrast
node scripts/verify-motion.mjs
pnpm build
```

`cvd`, `color-golden` and `content` are **not** run: no colour value, no colour maths and no
corpus record changes.

## Risks and open questions

- **The drag itself is not testable here.** jest renders a tree; it does not run Yoga, gestures
  or reanimated's UI thread (ADR-0055). What is checkable is that the detents reach the sheet.
  Whether the drag *feels* right is a device judgement and is attested, not claimed.
- **80% and 90% are chosen, not derived.** They are the first values that satisfy the two
  constraints — never full screen, never colliding — and nobody has watched them on a phone.
- **`BottomSheetScrollView` inside HeroUI's content container** is a nesting HeroUI does not
  document. If its own `BottomSheetView` wrapper interferes with the scroll, the fallback is to
  replace the container rather than nest, and that is a bigger change than this plan carries.

## Out of scope

The Lens's own content (F-178 handles its dismissal), the `Dialog`, and any change to what the
sheet contains.
