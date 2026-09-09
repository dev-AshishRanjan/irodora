# A static reading catches the shape, not the layout

**Effect:** [E-121](../../state/effects.json) · `packages/ui/src/testing/tree.ts` →
`apps/mobile/test/screens.test.tsx` · **medium**

## What happened

F-211 shipped a blank Atlas past **every gate in this repository** — sixteen of them, plus a
conformance sweep over 72 subjects in 8 conditions reporting zero findings.

```
Screen   <View style={{ flex: 1 }}>            definite
  Appear   <Animated.View>                     auto — its height comes from its content
    Atlas    <FlatList style={{ flex: 1 }}>    a share of nothing
```

jest has no layout engine. A zero-height `FlatList` renders all 120 of its rows into the test
tree, and every assertion about those rows passes — the screen is blank on a device and complete
in the harness [[a-test-tree-has-no-height]].

## The rule is about the parent, and about its direction

`flex` distributes the parent's **main axis**. In a column that is height, and a parent whose
height is auto has nothing to distribute, so the child resolves to zero.

> A node with `flex > 0` is reported when its parent lays out in a **column** and the parent's
> height is not definite.

**The direction test is what makes it usable.** In a row, `flex` is width, and a row's width is
definite by default — without that condition every `Row` in the app is a finding, and *a check
that fires on correct code is a check somebody switches off.*

The subject's own root is exempt: on a device it is mounted in a full-height host, and treating
it as auto would report every screen.

## Three decoys, because zero findings is ambiguous

"No broken chain" and "no chain examined" produce the same word. So:

- the **planted F-211 tree** fires — a gate justified by a bug it cannot be shown to catch is a
  gate justified by a story;
- the **registry is shown to contain flex nodes**, counted, so a green run is a statement about
  screens rather than about an empty walk;
- a **row parent does not fire**, and the identical tree with the direction removed does — so the
  narrowing is a real condition rather than a rule that never triggers.

## The part that can go wrong quietly

Everything it cannot see, and the list belongs in the report rather than in a footnote:

- a height that arrives at runtime — `onLayout`, a measurement, a percentage;
- **overflow**, which is the other half of layout and entirely invisible here;
- the frame of anything a native list draws;
- **any screen absent from the registry**, because this reads a rendered tree and nothing else.

It catches the common shape. That is worth having and it is **not** the claim that layout is
checked, which is exactly the overstatement golden rule 11 is about.

## The general shape

When a class of defect is invisible to the harness, the useful question is not *"can we simulate
the missing engine?"* but *"is there a static shape that the defect almost always has?"* A
narrow check with its limits printed beats a broad one nobody believes — and the decoys are what
separate the two.

Related: [[a-test-tree-has-no-height]], [[a-judgement-nobody-wrote-down-cannot-be-reviewed]]
