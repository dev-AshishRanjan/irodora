# A shadow exists only where a mockup draws one

**Effect:** [E-132](../../state/effects.json) · `manifest.elevation.shadow` → `elevationShadow` →
`Card`, `Surface` · gates 4 and 10 · **high**

## Why the link exists

Depth in this product is TINT. A shadow tints what it surrounds, and a colour sample must not be
judged against a tinted surround, so the manifest refused one at parse time (ADR-0044). Mockup `25`
draws a soft downward shadow under its light cards, and golden rule 14 says build what is drawn.
ADR-0103 allows exactly that one — light mode, elevation level 1 — and the parser refuses everything
else.

**The refusal is the kind that erodes.** Once a shadow exists anywhere, the case for one more is easy
to make and hard to argue against, and what stands in the way is a parser that throws and a test that
names the levels.

## What holds it

- The parser: a dark mode naming a shadow, a level that is not one, an opacity past a half, or a
  shadow spelled as a CSS string — each watched failing, with a decoy accepting the drawn one and a
  plain `"none"`.
- `elevation.test.tsx`: the light card carries the declared numbers; a dark card and light levels 2
  and 3 carry none; a vacuity guard fails if the manifest ever declares `"none"` again.

## What it does not hold

That the shadow matches `25` pixel for pixel. Its numbers — 2 dp offset, 8 dp blur, a tenth of the
ink — are read off a JPEG whose edges also carry ringing, and they are recorded as derived. A person
comparing F-221's captures beside the mockup is where they get refined.
