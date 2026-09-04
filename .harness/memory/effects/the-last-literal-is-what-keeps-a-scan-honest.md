# The last literal is what keeps a scan honest

**Effect:** [E-078](../../state/effects.json) · `packages/ui/src/Swatch.tsx` →
`off-scale-spacing.json` · **medium**

## What happened

`Swatch` draws its two-tone keyline as a 1px-inset parent, written `padding: 1`. F-161 replaced
that with a named constant, because the same number now also feeds the corner arithmetic.

It reads better. It was also **the last numeric spacing literal in the product**, so the spacing
gate went from one declaration to zero — and refused:

> No spacing declarations found at all. That is not a clean product; it is a broken scan.

## Why that refusal is the whole value

A scanner that finds nothing **cannot tell a clean codebase from a broken regex**. Without the
refusal, the run would have gone green, and every subsequent off-scale value would have gone green
too, because the scan had stopped matching anything at all.

F-140 did the same thing at scale: tokenising the screens took the scan from **161 declarations to
1**, and the fix then was to teach it to read `nativeSpacing.<step>` as a reference. This is the
same failure at the last remaining site.

## Two things depended on that literal being visible

- **The scan needs a subject.** One is enough; zero is indistinguishable from broken.
- **The exemption needs a match.** `off-scale-spacing.json` documents at length why a `1` here is
  a *border width sized to the device pixel* rather than spacing — and an exemption that matches
  nothing fails in the other direction. The check works from both ends, and both ends needed the
  number to be a number.

## The general shape

**A source-scanning gate is a contract with the way the source is written.** Every refactor that
improves readability — extracting a constant, introducing a helper, tokenising a value — is a
candidate for breaking that contract silently, because the code is *better* afterwards and the
gate is *quieter*.

The gates that survive this are the ones that **refuse an empty result**. That single line is what
turned a silent regression into a failure within one run of the change.

Related: [[a-new-engine-can-make-an-old-gate-blind]],
[[a-rule-can-be-right-about-the-thing-and-wrong-about-the-value]]
