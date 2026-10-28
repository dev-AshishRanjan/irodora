# E-233 — A clear is an action, and is drawn only with something to clear

**Link:** `packages/ui/src/SearchField.tsx` (`bare`, `clear`) and `ChoiceGroup`'s pills (`restFill`, `radius`) → `09`'s Finder
**Guard:** `search-field.test`, `pill-selection.test`, the conformance subjects, the `09.screen` sweep's clear and chip decoys **Severity:** medium **Feature:** F-250

---

## The two shapes

- **The clear** is an `IconButton` with no `selected`: it empties the words and announces nothing as
  on or off. It is drawn only while the field holds words — Apple's convention; a control with nothing
  to do is noise. Its target is the platform's, inside the field: the field's box reaches past its drawn
  end by what the target overhangs the glyph, because Android delivers no touch outside a view's parent.
- **The chips** are filled level 3 at rest with an edge in their own fill, so choosing one never moves
  its outline; the chosen one is edged and carries its dot (ADR-0141), a highlight and a mark.

## What it does not guard

- The bare field's zero inset is declared off the scale with its reason (`off-scale-spacing.json`).
- Fixed-height chips clip at 200 % (F-344, expected).
