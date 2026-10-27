# E-225 — A word beside a figure is the printed figure's word

**Link:** `apps/mobile/src/compare-readout.ts#pairReadout` → `08`'s two tables (`Compare.tsx`), and what
they read: `compare.ts`, `delta-readings.ts`, `finder.ts#lexicon`
**Guard:** `compare-readout.test` (every invariant over all 14,280 ordered pairs, one pair worked by hand
and pinned, with decoys); `compare-fidelity.test`; `compare-states.test`; the `08.screen` sweep
**Severity:** high **Feature:** F-249

---

## Why B changes when A does

`08` prints a figure and words beside it on every row. The figure is printed at a precision (ΔE00 two
places, the axes one, the ratio floored to two), and the words are chosen from the PRINTED figure: the
band of the printed ΔE00, the direction of the printed sign, the threshold the floored ratio reaches.
So a change on either side — a precision, a rounding for a floor, a band edge, the lexicon — can leave
the row saying something its own figure does not:

- a ratio rounded rather than floored reads 3.00:1 beside *Non-Text* for 14 corpus pairs that do not
  reach 3:1;
- a ΔL\* that prints 0.0 reads *Slightly Lighter* if the direction is taken from the unrounded value
  (16 corpus pairs);
- *towards blue* when A is already blue says A was not.

## What the test holds

Every ordered pair of the corpus, not a fixture (F-248's lesson): each figure equals the engine's at its
precision; each word is the printed figure's; *towards* appears exactly when the hue band is at least
slight, B lies in a hue term of the locale's language and A does not, and names B's term; swapping A
and B keeps every magnitude and relation and turns every direction; no catalogue value it reads
claims a verdict. Decoys the data allows are asserted present: the pairs where rounding crosses 3:1,
the printed zeros over non-zero differences, pairs with and without *towards*.

## What it does not guard

- **A component band above the total's.** ADR-0125 accepts it, and it needs a total under
  *perceptible*; every corpus pair prints a perceptible ΔE00, so the test asserts there are none and a
  corpus that adds one is noticed.
- **The Japanese hue reading's coverage**: the Japanese lexicon names five hues to the English nine
  (F-353).

Related: [[a-fixture-that-shares-a-defect-cannot-find-it]].
