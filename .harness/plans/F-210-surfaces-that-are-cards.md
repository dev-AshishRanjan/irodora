# Plan: F-210 — The Surfaces that are cards become Cards

| | |
|---|---|
| **Feature** | F-210 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-25 |
| **Service** | `mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The audit, done mechanically rather than from memory

47 `<Surface>` sites, classified by whether a `heading` `Text` opens the body:

```
24  heading + body   →  Card, with that heading in the header slot
23  not a card       →  stays a Surface, reason recorded per site
```

The feature's own notes said *"nine surfaces … the sites are known"* and named four. **That
figure was wrong**, which is the argument for classifying by reading the tree rather than by
recalling it.

## The rule for the conversion, and it is one rule

> **`Card padding` = the `Surface` padding it replaces. The content is not touched.**

`Surface` defaults to `md` and `Card` to `lg`, so a conversion that drops the prop silently moves
every unpadded site by 4pt. Every converted site therefore carries an explicit `padding`, including
the ones that were relying on the default.

## What the audit found on the way: ten sites are double-padded

```
<Surface level="1">                                  ← md = 12, from the default
  <View style={{ padding: nativeSpacing.md }}>       ← md = 12, again
```

`Surface` always applies its padding; these sites add their own inside it, so they render a 24pt
inset where they read as 12. Ten of them: `AddGarment:344`, `Measure:160/208/277`,
`OutfitBuilder:215/368`, `Shopping:265/293/323/361`.

**Not fixed here.** It is a spacing defect rather than a Surface-vs-Card question, it is
unverifiable without a device, and folding it in would be the exact stacking this feature was
split out of F-203 to avoid. Recorded as a feature. The three of them that have headings still
convert, under the one rule above: the Card takes the Surface's `md`, and the inner `View` goes
into `children` untouched — so the body keeps the 24 it rendered before.

## Criterion 3, captured before the edit rather than asserted after it

"Before" only exists in git, so it is written down first:

1. Render every affected screen and record every inset value in the tree.
2. Commit that as `.harness/verification/card-conversion-padding.json`.
3. Convert.
4. A test re-renders and asserts the same multiset.

A fixture generated **from the pre-change tree** is the only version of this assertion that can
fail. One written after the edit would agree with whatever the edit did
[[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].

## Criterion 2, as data rather than prose

`.harness/verification/surface-not-card.json` — one entry per retained `Surface`, each with the
reason it is not a card, in the shape `unreached-tokens.json` and `unreachable-routes.json`
already use (ADR-0088). A scanner in `lint` fails on a `<Surface>` site that is not declared, and
on a declaration whose site no longer exists.

Prose in a plan rots and nothing reads it. Twenty-three reasons is exactly the size at which that
matters.

## Test plan

- **The padding multiset per screen**, against the pre-change capture.
- **The scanner refuses an undeclared site**, and refuses a stale declaration — both watched.
- **A converted card puts its heading in the header slot**, asserted on one screen against the
  rendered tree rather than the source.
- The conformance suite and the a11y and contrast gates, unchanged, over screens that all moved.

## Verification

`state · typecheck · lint · format · test · a11y · contrast`.

## Risks

- **Nobody can see this.** 24 cards change from one padded box to a header box, a hairline and a
  body box. The inset is asserted; the rhythm is not, and no gate here renders a layout
  [[a-test-tree-has-no-height]]. This is recorded as an attestation rather than claimed.
- **The hairline is new.** `Card` draws one between header and body; these sites had a `Stack`
  gap. That is the component doing its job, and it is still a visible change on 24 surfaces.

## Out of scope

The double-padding defect, and any change to `Card` or `Surface` themselves.
