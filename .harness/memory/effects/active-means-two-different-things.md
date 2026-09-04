# "Active" means two different things

**Effect:** [E-080](../../state/effects.json) · `conformance.ts` → the registry · **medium**

## What happened

The conformance suite required `disabled` and `loading` to be announced and said **nothing about
`active`**. So a component could render a selected state that a screen reader could not tell from
the default.

The tree-difference assertion did not cover it: it requires *some* difference between states, and
a changed background satisfies that while telling a non-sighted user nothing at all.

## The first draft of the rule was wrong, and the suite said so immediately

Requiring `accessibilityState.selected` for every `active` subject flagged **`Button`,
`SearchField` and `TextField`** — where `active` means *being pressed or typed into*, not
*chosen*.

Three false positives on components doing nothing wrong. That is not a rule that needs tuning;
that is a rule that gets deleted, and the real protection goes with it.

## `active` is overloaded and no tree can disambiguate it

So the **registry declares it**: `selectable: true`, one word beside the subject. The same shape
as `sampleValues` and `forbiddenNames`, which are also facts about a component that a rendered
tree cannot report.

The cost is honest and worth stating: **a component whose author forgets the flag is exempt by
omission.** The alternative was a rule nobody kept.

## The second correction, in the same feature

I first marked the wardrobe gallery cell as *selected*. That state **can never be seen**: tapping
a cell sets `selectedId`, and the screen then renders the editor, which **replaces** the grid.

It would have shipped as unreachable code with a passing test — the worst combination, because the
test makes it look considered.

What the cell was actually missing was the *other* half of the report: **a tap should visibly
register**. It is a hand-rolled `Pressable` with a static style, so nothing happened until the
editor appeared.

## What to carry forward

**"Mark what is selected" and "show that a tap registered" are different requests** that arrive in
the same sentence. The first needs state; the second needs feedback. Building the first for
something that is not selectable produces code nobody can reach.

Related: [[a-component-can-satisfy-the-letter-of-its-own-proof]]
