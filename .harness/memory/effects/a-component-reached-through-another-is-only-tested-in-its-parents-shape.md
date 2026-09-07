# A component reached through another is only tested in its parent's shape

**Effect:** [E-091](../../state/effects.json) · `packages/ui/src/Pair.tsx` →
`packages/ui/test/conformance.test.tsx`, `scripts/a11y-scope.mjs`, the three instrument screens ·
**medium**

## What happened

F-151 needed two colours touching, then needed the same edge rule for a palette of five — so the
rule moved into `Strip` and `Pair` became `Strip` with two members and labels beneath. One copy
of the argument, which is right: *no line and no corner where two samples meet* is the whole of
both components, and a second copy of it is a second place for it to be lost.

`a11y-scope.mjs` then refused the build:

```
✗ @irodora/ui: Strip (Pair.tsx)
    Not in the conformance registry and not reachable from anything that is.
```

Which looked wrong. `Pair` is registered, `Pair` renders `Strip`, so `Strip` is rendered on every
run of the suite.

## The gate was right, and for a better reason than the one it gave

**`Pair` renders `Strip` with two equal members. That is the shape that cannot go wrong.**

Everything `Strip` exists for is in the other shapes: unequal weights, a middle segment with no
rounded corner on either side, a member list that is not two. The first and last segments carry
the radius and the outer keyline; every segment between them carries neither, and there had never
been a segment between them. A rounding error, a stray `borderWidth`, a corner applied to the
wrong end — none of it had a subject.

So the finding is not *this component is unreached*. It is:

> **A component reached only through another is exercised only in the shape its parent happens to
> use** — and from the outside that is indistinguishable from full coverage, because the suite
> genuinely does render it, in both themes, every time.

Registering it directly took four lines and rendered three members at `[1, 0.9, 0.6]`.

## Why this is a different shape from the ones already recorded

Everything in this directory so far is a **checker** that could not see its subject: a style
engine resolving in Metro, colour arriving as an SVG prop, a signature reading the wrong axis,
patterns written in one language.

This is the mirror. The checker is fine. The **subject** reached it in one shape out of many, and
nothing measured which shapes had arrived. "It is rendered" and "its behaviour is rendered" are
different claims, and the first is the one a registry can answer.

## The other three things this feature ran into

**F-171's pairing rule fired on the new component within minutes**, on `foreground.2` drawn on
`swatch.well` — two good tokens in a combination gate 9 has never measured. That rule is one
feature old and has now caught something that did not exist when it was written, which is the
best evidence available that [E-086](two-thorough-checks-and-neither-looked-at-a-pair.md) was
worth the work. The fix was to move the labels out of the well entirely, which is better design
anyway: the well is the neutral the *samples* are read against.

**The tabular check had only one direction.** It asserted that everything marked `numeric` is
selectable, and never that a figure is marked — so a `<Text>` rendering `4.23` with no prop passed
every assertion and rendered with proportional digits. Same family as
[E-090](a-check-must-report-its-scope-not-only-its-verdict.md), found the same way: by re-reading
a green test rather than by anything failing.

**And the new check was vacuous on two screens out of three**, which the non-vacuity assertion
caught immediately — one hour after writing E-090 about exactly that. One of the two turned out
to be legitimate: a palette draft with no CVD finding renders no numbers at all, so demanding one
would be demanding the fixture render something the product does not. The other was a pattern
that did not know an en dash: `0.200 – 0.450` is a figure, and leaving the dash out silently
skipped the screen whose numbers are hardest to read in a ragged column.

Related: [[a-check-must-report-its-scope-not-only-its-verdict]] ·
[[two-thorough-checks-and-neither-looked-at-a-pair]] ·
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
