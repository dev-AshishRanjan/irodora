---
kind: lesson
title: A line box is not its ink
category: design
confidence: 0.9
created: 2026-10-06
scope: [packages/ui, typography]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# A line box is not its ink

**Centring a Text by its box centres its line, not its letters.** A face's ascender carries caps and
ascenders, and its descender a tail a given word may never use, so a word's ink sits off its line
box's centre by the face's asymmetry. For "Irodora" in Gelasio at 31.6 dp, that is
2.5 dp — five pixels at `01`'s scale, and sixteen times what `01` draws between the mark's centre
and the name's.

## What to do

- Align what is drawn: compute each member's ink inside its box from the face's metrics (units per em,
  `hhea`'s ascender and descender, the word's ink box), placed the way EACH platform's renderer
  places a line, and give each member margins that take its box to its ink.
- Read the renderer's source for each platform, not a convention. React Native 0.86 centres a line
  in its box on Android whatever its height (`CustomLineHeightSpan`), and on iOS only when the line
  is at least the face's own (`RCTApplyBaselineOffsetForRange`); below that, iOS sets the glyphs on
  the line's foot and clips a tall line's top.
- Check the arithmetic independently: lay the margins out as a row or a column in the test and
  recover the drawn inks, with the test's placement written from the platforms' sources, not from the
  component. F-230's first version assumed half-leading on both platforms in the component AND in the
  test, so the test agreed with the mistake; its one review found it in iOS's source.
- Read the constants back from the font file in a test, so a font update cannot leave them stale.
- Say what jest cannot see. Where a platform actually puts the baseline is a device attestation.

F-230's lockups (ADR-0123).
