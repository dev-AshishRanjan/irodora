---
kind: lesson
title: Test a word on the quantity its figure measures, not on the category the word names
created: 2026-10-27
feature: F-249
severity: medium
scope: [apps/mobile, content/rules]
links: [[a-fixture-that-shares-a-defect-cannot-find-it]], [[a-word-beside-a-figure-is-the-printed-figures-word]]
---

# Test a word on the quantity its figure measures, not on the category the word names

08 prints a hue difference and, beside it, *towards ‹B's hue term›* from the published lexicon — only
where A is not already in that term, because *towards blue* when A is already blue says it was not.
F-249 tested "A is not in the term" with the lexicon's region match, and the review found it wrong in
644 English pairs:

- *brown* constrains lightness as well as hue. A light orange A at 48° is outside *brown* only because
  it is too light, so the page said *towards brown* beside a brown B 6° away — the hue had not moved
  into brown's arc; the lightness had.
- A near-grey A at 245° lies in no hue term (the lexicon names no grey's hue), so the page said
  *towards blue* beside a blue B at 251°, though A's angle was already blue's.

Each sentence was true of the lexicon's categories and false of the figure it sat beside: a
hue-ANGLE difference. The every-pair test passed, because it asked the same question the code asked.

## The rule

- **Ask what the figure beside the word measures, and test the word on that quantity.** A word beside
  a hue angle speaks of angles: A's angle inside the term's arc means no movement towards it, whatever
  the other axes say.
- **A category with several axes is several questions.** When a lexicon term constrains more than the
  axis the word is about, test only the axis the word is about.
- **Pin the counts the rule produces**, so a changed term or arc is seen as a moved number rather than
  passing quietly.

## How to check

For each word printed beside a figure, write down the figure's quantity and unit, then check that every
condition deciding the word is a condition on that quantity — and add a decoy pair where the other axes
disagree with it (here: a brown B with a light A at brown's angle).
