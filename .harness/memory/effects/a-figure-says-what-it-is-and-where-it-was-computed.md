# E-169 — A figure says what it is and where it was computed

**Link:** the `Figure` contract in `packages/ui/src/figures.tsx` (`figureText`, `figureName`,
`FigureValue`) → every figure a display prints and every name a screen reader says
**Guard:** `figures.test` (an empty quantity, space or noun is refused; U+2212 against the
hyphen-minus `toFixed` prints) and the conformance suite's `ragged-figure` rule over every subject
**Severity:** medium **Feature:** F-235

---

## Why B changes when A does

FR-61 asks for the space each value was computed in to be named beside it. Most drawings print a
bare figure (`−0.8`, `84%`), so the printed text and the spoken name are built from one `Figure`:
`figureText` prints what the drawing prints, and `figureName` always says the quantity, the value,
its unit and the space — *ΔL\* −0.8, CIELAB*. A change to either function changes every display at
once, and a display that prints a number without a `Figure` has no name for it.

The kinds carry their own naming: a `measure` names its quantity and space, a `share` what it is a
share of, a `count` its noun. Components that print one value build the figure themselves from what
they are given — the dial from its `fraction` and `label`, the tile from its `value` and `label`, a
factor row from its `score` — so the number printed and the number said cannot drift.

The `ragged-figure` rule reads every text node that carries a figure and requires the tabular
setting. Its scan (`testing/tree.ts`) knows what is not a figure: a name with digits (`CIEDE2000`,
`D65`), prose, and a numeral bound to a Japanese counter (`2色`). Widening that list is how a false
finding is answered; a finding on a real figure is answered with `numeric`.

Related: [[a-setting-that-changes-what-text-means]]
