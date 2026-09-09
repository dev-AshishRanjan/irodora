# A test tree has no height

**Effect:** [E-113](../../state/effects.json) · **Feature:** F-211 · **Date:** 2026-09-09

The Atlas was blank. Every gate in this repository was green — including a conformance sweep over
**72 subjects in 8 conditions reporting zero findings**, added one feature earlier.

```
<Screen scroll={false}>
  <View flex:1>
    <View flex:1 column>
      <Appear>               ← Animated.View { opacity, transform }, no flex
        <FlatList flex:1 />  ← 100% of nothing
```

`Appear` was added to `Screen` by F-188, three features earlier, to give every screen an
entrance. It is correct for a scrolling screen — a `ScrollView` sizes its content — and fatal for
the one screen that turns scrolling off.

## Why nothing saw it

**jest has no layout engine.** A `FlatList` with zero height still renders all 120 rows into the
test tree. Every assertion about rows, roles, names, tap targets, tokens and contrast passes,
because all of them are about the tree and none of them is about the *box*.

A row count would have passed for the entire time the screen was blank. So the test written for
the fix asserts the **style** — `flex: 1` present on the non-scrolling wrapper, absent on the
scrolling one — because that is the part of this a test can actually see.

## The bargain that broke across a package boundary

The Atlas's own docblock names the hazard exactly:

> *What would reproduce F-104 is turning scrolling off here and NOT giving the list the height to
> scroll in, which is why the list carries `flex: 1` rather than inheriting a size.*

The list kept its half. The **ancestor** stopped keeping its — in a different package, in a
feature about motion, for a reason that had nothing to do with the Atlas. A comment can record a
contract; it cannot make the other party keep it.

## The lesson

**Ask what class of defect your gates are structurally incapable of seeing, and say it in the
artefact.** Layout is one for this repository: everything here reads trees, and a tree has no
height. F-204's sweep already said *"it cannot see a layout that is cramped or unbalanced"* — it
was righter than it knew, one feature before this was found by a person opening the app.

[[evidence-needs-a-count-or-it-is-just-a-word]]
