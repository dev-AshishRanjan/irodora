---
kind: lesson
title: In a token system lightness is triple-booked; buy CVD margin from hue and chroma
created: 2026-08-15
feature: F-003
severity: medium
scope: [docs/design, packages/design-tokens]
links: [[cvd-is-scoring-not-rendering]]
---

# Lightness is triple-booked; hue and chroma are free

When the design system's `status.*` trio failed both its WCAG gate and its CVD separation
gate, the obvious fix was to spread the tokens apart in OKLCh `L`. Under protan and deutan
the hue difference collapses, so separation has to come from somewhere — and lightness is
where it is left.

That reasoning is correct and the fix it produces is wrong, because in a token system **`L`
is already carrying three jobs**:

1. **WCAG contrast** against every surface the token is declared on.
2. **Salience rank** — which state looks loudest against the theme's own ground.
3. **Gamut headroom** — how far the token can move before a channel clips.

Spending the CVD margin on `L` therefore silently spends contrast margin, salience ordering
and gamut headroom too. The first correction in F-003 did exactly that: dark `status.warn`
went to `L 0.88`, which passed every gate and landed **1.32:1 from the primary foreground
with 7° of hue between them** — caution that reads as emphasised body text, and 2.5× louder
than error.

**Hue is booked for nothing. Chroma is booked for one thing.** And they are the axes CVD
separation actually keys on; `L` is the axis it keys on least. The replacement moved warn's
hue 78 → 70 and chroma 0.100 → 0.125, took `L` back to 0.77, and cleared every constraint
with more room than the version that had spent 0.07 of lightness.

## The rule

Put `L` at the contrast minimum plus a modest margin. Buy the perceptual margin from hue and
chroma. If a chroma rise needs an exception, record it — a recorded exception is cheaper than
a token that is quietly wrong on three axes at once.

## And check the gate margin, not just the gate

A value that clears a threshold by one point is a value the next nudge re-breaks. Both
corrections here targeted ~5 points of headroom deliberately. That is not gold-plating: the
alternative is re-litigating the palette every time anything moves.
