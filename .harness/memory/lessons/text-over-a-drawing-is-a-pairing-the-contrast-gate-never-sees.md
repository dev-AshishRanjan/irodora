---
kind: lesson
title: Text over a drawing is a pairing the contrast gate never sees, so fitting a region can break it silently
created: 2026-10-22
feature: F-247
severity: medium
scope: [mockups, apps/mobile, packages/ui]
links: [[an-ink-gap-loses-the-line-inset-and-a-negative-one-is-a-finding]], [[art-is-the-foreground-at-a-measured-opacity]]
---

# Text over a drawing is a pairing the contrast gate never sees, so fitting a region can break it silently

The contrast gate measures the pairings a surface **declares**: a text token on the surface it sits
on. A drawing behind the text is not a surface. Gate 9 reads `foreground.2` on `surface.1` at 7.16:1 and
passes, while every word that crosses a stroke reads at the stroke's colour.

F-247 fitted 06's provenance card to the screen (ADR-0145). 06 draws its plum branch **beside** the
words, in the callout column. Fitted, the branch landed **behind** their end. Every gate stayed
green. The review computed the real pairing, the text over the art at `opacity.artCard`: 2.65:1 on
Sumi, 3.02 on Washi, 2.64 on Slate, 2.82 on Obsidian. Lowering the art's opacity does not rescue it:
even the backdrop's 0.15 leaves Washi at 4.40:1 and Slate at 4.08:1. The only fix that holds in every
palette is the text keeping clear of the strokes.

The same reading found a second fault the boxes had hidden. The product's plum branch is drawn on a
60 × 52 grid, squarer than 06's crop (231 × 134 px), so at 06's drawn width it drew 162 dp tall,
past its card. The inventory recorded the crop's box; the component draws its own aspect.

## The rule

- **Wherever text and a drawing overlap, compute the text's contrast over the drawing's ink**, at
  the drawing's opacity, in every palette. That number is the pairing, not the card's. Below 4.5:1 for
  body text it is a defect, whatever the gate says.
- **A layout change that moves text or art (fitting, wrapping, a narrower phone) re-opens the
  question.** Fitting is where it breaks, because the drawing kept its relation to the box, not to
  the words.
- **Size a drawing by the dimension the mockup measures, and let the other follow its own aspect.**
  Then check that it fits the box it is drawn in. A drawn crop's box is not the component's box.

## How to check

For each surface with art behind or beside text: find every `Illustration` (or image) in a card that
also holds words. Mix the ink over the card's ground at the art's opacity, and compute contrast
against every text token in that card, in all four palettes. Then compare the art's rendered height
(its width × its grid's aspect) with the card's height.
