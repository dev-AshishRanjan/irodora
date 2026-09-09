# Plan: F-213 — Nothing in this repository can see a broken flex chain

| | |
|---|---|
| **Feature** | F-213 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-25 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The shape that shipped

```
Screen         <View style={{ flex: 1 }}>          ← definite height
  Appear         <Animated.View>                   ← NO height: auto, from its content
    Atlas          <FlatList style={{ flex: 1 }}>  ← flex of an auto-height parent = 0
```

The Atlas rendered 120 rows into a box with no height. **Every gate was green**, including a
conformance sweep over 72 subjects in 8 conditions reporting zero findings, because jest has no
layout engine: a zero-height `FlatList` still renders every row into the test tree, and every
assertion about those rows passes.

## The rule, and why it is about the PARENT

`flex` distributes the parent's **main axis**. In a column container that is height, and a
parent whose height is auto has no remaining space to distribute — so a `flex: 1` child resolves
to zero.

> A node with `flex > 0` is reported when its parent lays out in a **column** and the parent's
> height is not definite.

Definite means: `flex > 0`, `height`, `minHeight`, `aspectRatio`, or absolute positioning with
both insets. The subject's own root counts as definite — on a device it is mounted in a
full-height host, and treating it otherwise would report every screen.

**The `flexDirection` test is what keeps this usable.** In a row, `flex` is about width, and a
row's width is definite by default; without that condition every `flex: 1` in a `Row` would be a
finding, and a check that fires on correct code is a check people switch off.

## Where it lives

`packages/ui/src/testing/tree.ts`, beside `flattenStyle` and the other tree readers, and run
over every registered subject from `screens.test.tsx` — the only place the registry exists.

## Criterion 3 is the one that matters

*"It would have caught F-211, asserted by planting that exact shape."* A unit test in
`packages/ui/test/` builds the three-node tree above and watches the check fire, then anchors the
middle node and watches it stop. A gate justified by a bug it cannot be shown to catch is a gate
justified by a story.

## Criterion 2: what it cannot see, printed

- **A height that arrives at runtime** — `onLayout`, a measured value, a percentage against a
  parent this reading treats as definite.
- **Overflow.** A chain can be perfectly anchored and still push content off the screen.
- **Anything inside a component that renders its children through a native list.** The rows are
  in the tree; their box is not.
- **The other direction entirely**: this reads a rendered tree, so a screen absent from the
  registry is a screen it never looks at.

## Test plan

- The planted F-211 shape fires; the fixed shape does not.
- **A row parent does NOT fire**, which is the decoy that stops the rule being "any flex".
- An anchored chain through several wrappers does not fire.
- Every registered subject is checked, and the count of subjects is asserted non-zero.

## Verification

`state · lint · format:check · test`.

## Risks

- **False positives make a gate worthless.** If the current tree produces findings that are not
  defects, the rule is wrong and gets narrowed here rather than exempted later.
- **It is a static reading.** Criterion 2 exists because the honest version of this feature is
  "catches the common shape", not "catches broken layouts".

## Out of scope

A real layout engine. Yoga in jest is a different feature and a much larger one.
