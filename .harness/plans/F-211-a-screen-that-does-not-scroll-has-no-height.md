# Plan: F-211 — The Atlas is empty

| | |
|---|---|
| **Feature** | F-211 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-20, NFR-25 |
| **Service** | `packages/ui` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The defect

Reported from a running app: **"the Colour atlas is empty."**

```
<Screen scroll={false}>
  <View  flex:1 >                    ← the ground
    <View  flex:1, column >          ← the rhythm
      <Appear>                       ← Animated.View { opacity, transform }   NO FLEX
        <FlatList flex:1 />          ← 100% of a parent with no height = 0
```

**F-188 caused it.** It wrapped `Screen`'s content in `<Appear>` so every screen gains an
entrance, and `Appear` renders an `Animated.View` styled with `opacity` and `translateY` and
nothing else. For `scroll={true}` that is harmless — a `ScrollView` sizes its content. For
`scroll={false}` the flex chain breaks at that node.

The Atlas is **the only screen using `scroll={false}`**, which is why it is the only one
reported.

## Why nothing caught it

**jest has no layout engine.** The conformance suite renders all 120 rows and every assertion
passes; the a11y gate is happy; the sweep reports zero findings over 72 subjects. A `FlatList`
with zero height still renders its data into a test tree.

The Atlas's own docblock names the hazard for F-104:

> *What would reproduce F-104 is turning scrolling off here and NOT giving the list the height to
> scroll in, which is why the list carries `flex: 1` rather than inheriting a size.*

The list kept its half of that bargain. The **ancestor** stopped keeping its.

## The fix, and why it is on `Appear` rather than on `Screen`

`Appear` deliberately refuses a `style` prop — *"an allow-list cannot be enforced at a call site
that can pass anything"* — so the fix is **not** an escape hatch. It is a named, enumerated
capability:

```ts
<Appear fill>   // adds flex: 1, and nothing else
```

`Screen` passes it exactly when `scroll={false}`, which is the case where its content must fill
rather than size to itself. One boolean, one meaning, and no way to pass a colour.

The alternative — `Screen` dropping `Appear` for the non-scroll case — loses the entrance on the
one screen that most benefits from it, and would leave the same trap for the next screen that
turns scrolling off.

## The test has to assert the chain, not the rows

**A row count passes today.** The assertion must be about the rendered *style*: the wrapper
between a non-scrolling `Screen` and its children carries `flex: 1`, and the scrolling one does
not. That is the thing jest can actually see, and it is the thing that was wrong.

## Files to touch

```
packages/ui/src/motion.tsx        — Appear gains `fill`
packages/ui/src/layout.tsx        — Screen passes it when scroll={false}
packages/ui/test/layout.test.tsx  — the chain, both ways
packages/ui/test/motion.test.tsx  — `fill` adds flex and nothing else
```

## Test plan

- **A non-scrolling `Screen`'s content wrapper carries `flex: 1`.**
- **A scrolling one does NOT** — the decoy. Adding `flex: 1` everywhere would fix the Atlas and
  change every other screen's layout, and a one-sided assertion would not notice.
- **`fill` adds flex and nothing else**: opacity and transform are still what they were, so the
  entrance is unchanged.
- The Atlas's own conformance subject continues to render, which says the change broke nothing
  it could see — stated as the weak evidence it is.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · build`.

## Risks

- **No layout engine here means the fix is verified structurally, not visually.** The chain is
  asserted; that the Atlas *looks* right on a device is attested, and it is the same gap that
  let this ship.

## Out of scope

A gate that catches broken flex chains in general. That is a real want and a hard one — it needs
a layout engine — and it is recorded rather than attempted here.
