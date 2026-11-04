---
kind: lesson
title: A word with a digit is a figure to the sweep, so a button that says one must set it tabular
created: 2026-11-04
feature: F-252
severity: low
scope: [packages/ui, apps/mobile]
links: [[test-a-word-on-the-quantity-its-figure-measures-not-on-the-category-the-word-names]]
---

# A word with a digit is a figure to the sweep, so a button that says one must set it tabular

The conformance sweep reports any text carrying a digit in proportional figures (FR-48, C9).
19's action reads *Build Complete 4-Piece Outfit* (in Japanese 4点…), and the sweep reported it on all
eight subjects in both themes. `Text` takes `numeric`; `Button`, which draws its own label, had no
way to pass it.

## What to do

- A control whose words carry a digit passes `numeric` (`Button`, and the `ActionBar` actions
  that are Buttons), as a `Text` would.
- `button-forms.test` holds both ways: set, the sweep finds nothing; unset, it reports the label.
