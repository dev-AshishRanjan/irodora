# A token that passes can be what holds the others out

**Effect:** [E-098](../../state/effects.json) · `docs/design/design-system.manifest.json` →
the emitted targets, the pairing decoy, the contrast mutation proof · **high**

## What happened

`Status` has taken an `adjacentToSample` prop since F-069. It puts the status on `swatch.well`,
the neutral ground, so a colour sample beside it is not read against a coloured field.

**Two of the three kinds could not legibly sit there.** Light `status.ok` measured 4.21:1 and
`status.warn` 4.32:1 against a text floor of 4.5. `status.bad` cleared comfortably at 8.29:1 —
and `bad` is the only kind any surface draws, which is why the gates stayed green for four
features.

## The part worth keeping

**The one that was comfortably passing was the one blocking the other two.**

F-174's own notes said the obstacle was the salience rank — darkening `ok` makes it measure
equal to `warn` against the light background, and ADR-0053 forbids a rank that differs between
themes. True of darkening `ok` alone, and not the binding constraint.

**CVD separation is.** Darkening `warn` toward the well's requirement moves it toward `bad`'s
lightness, and under simulation amber and red converge — lightness is the only channel left
between them. Every candidate that cleared 4.5:1 with `bad` where it was dropped `warn`/`bad`
to 49–56 against a floor of 60:

| candidate | on the well | worst CVD |
|---|---|---|
| `warn` L 0.510, chroma unchanged | passes | 49.4 (tritan) — and ΔL 0.002 from the sRGB edge |
| `warn` L 0.500 c 0.08 | passes | 45.6 (protan, Viénot) — chroma is where `warn` buys its separation from `ok` |
| `warn` L 0.524, `bad` unmoved | passes | 56.0 (tritan) |

So `bad` had to move below L 0.385 — the kind that was passing at 8.29:1, whose position was
holding the other two out. **A constraint set is not three independent budgets.**

## Two method notes

**The search was judged by the gate's own checkers.** `checkContrast`, `checkSeparation`,
`checkSalience` and `checkChromaCeiling`, run on a mutated manifest through `parseManifest` so
all eight palettes are seen exactly as gate 9 sees them. A search that re-implemented the ratio
would have agreed with itself on day one — the failure F-143's peer gate already recorded, where
a checker that reimplemented `pnpm peers check` got two of its three headline findings wrong.

**The mutation proof refused to run rather than drifting.** It pins the pre-mutation value and
throws: *"the manifest was retuned and this mutation is no longer the change its name describes.
Re-derive it rather than deleting the case."* Re-derived, it is now sharper than it was: the
planted defect is the value `warn` held before this change, which clears the floor on
`background`, `surface.1` and `surface.2` and fails **only** on the well. It proves the ratio and
the gate's *scope* together.

## And a decoy expired

F-171's `pair-undeclared` case used `status.warn` on `swatch.well` as its example of a pairing
the manifest does not declare. **Declaring that pairing made the decoy stop discriminating** —
the rule correctly reported nothing, and the assertion went red.

**A decoy built from a gap in the manifest has a lifetime**, because the gap is the thing a
feature eventually closes.

Its first replacement did not discriminate either, for a subtler reason worth keeping: `link` on
the well looked undeclared, but light `link` and light `foreground` are **the same value**,
`#171411`, and `swatch.well` does declare `foreground`. A rule that reads rendered colours can
only distinguish tokens that differ; two tokens sharing a value are one token to it.

Related: [[a-decoy-that-is-not-broken-proves-nothing]] ·
[[a-rule-can-be-right-about-the-thing-and-wrong-about-the-value]] ·
[[a-check-that-reads-one-of-two-spellings]]
