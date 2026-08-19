# ADR-0053 — Dark-theme status salience matches light, and error gets lighter to reach it

## Status

Accepted

## Date

2026-08-19

## Context

Two defects in the approved palette, found by the F-003 design and colour-science reviews,
pre-existing rather than introduced by that feature, and recorded as F-067 rather than fixed
because the fix is a design decision.

### 1. The salience hierarchy inverts between themes

Measured as |APCA Lc| against each theme's own background — background passed **first**, because
APCA is directional:

```
light:   bad 89.3   >  warn 73.4  >  ok 72.7      error is loudest
dark:    warn 60.8  >  ok   56.8  >  bad 38.6     error is QUIETEST
```

A person toggling the theme gets an inverted status hierarchy — the state the product is
shouting about changes with a display preference.

The cause is precise: the approved system held the rank of **OKLCh L** constant across the two
themes, and the two grounds have **opposite polarity**. Against a light ground, contrast rises
as L falls; against a dark ground, it rises as L climbs. **L rank does not survive that flip.**

> The invariant that makes two themes one system is the rank of **contrast against own
> ground**, not the rank of lightness.

### 2. `dark.status.bad` is below the APCA large-text floor

Lc −38.6 / −38.3 / −37.5 against `background`, `surface.1` and `surface.2` — under the Lc 45
*large-text* floor of APCA 0.98G-4g. WCAG reads 4.92–5.58 and passes, which is exactly the
disagreement APCA exists to surface.

[ADR-0044](0044-status-tokens-corrected-and-status-colour-is-text.md) classifies `status.*` as
`usage: "text"` **because the product tints the label itself**. So this is body copy below even
the large-text floor, in the default theme.

Requirements at stake: **NFR-8** (accessibility), **NFR-9** (colour is never the sole channel).

## Decision

**Adopt the jointly feasible dark palette. Error becomes the loudest state in both themes, and
becomes lighter to get there.**

| token | from | to |
|---|---|---|
| `dark.status.ok` | L0.73 C0.09 H158 `#75B992` | **L0.67 C0.12 H158 `#49AB79`** |
| `dark.status.warn` | L0.77 C0.13 H70 `#E9A44E` | **L0.70 C0.14 H70 `#D58D25`** |
| `dark.status.bad` | L0.64 C0.14 H26 `#D4665E` | **L0.82 C0.10 H18 `#FEAAAC`** |

Measured against the shipped engine, not asserted:

| | before | after | floor |
|---|---|---|---|
| worst \|APCA Lc\| across all nine pairings | 37.5 | **46.5** | 45 |
| worst CVD separation, three deficiencies at severity 1 | 65.2 | **63.1** | 60 |
| `dark.status.bad` salience | 38.6 | **68.8** | must be highest |
| dark salience | warn > ok > bad | **bad > warn > ok** | must match light |
| light salience | bad > warn > ok | unchanged | — |

**The headroom is 1.5 Lc, not more.** Worst-case 46.5 against a floor of 45 is a real pass and
a thin one; `ok` and `warn` both sit within 3 Lc of the floor. Any future darkening of the dark
background, or any chroma increase on those two, needs re-measuring rather than eyeballing.

**The rank is recorded in the manifest and asserted by gate 9**, so it cannot drift back. It is
recorded rather than inferred from the values: inferring it makes the check tautological, and
the defect was precisely that nobody had stated which order was intended.

`srgb` values are engine-derived per
[ADR-0043](0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md) — the hexes above are
outputs, not inputs, and a hand-edited one fails the gate.

## Consequences

**Good**

- The APCA failure is gone: every status token clears the large-text floor against every surface
  it declares, in both themes.
- The two themes become one system under the invariant that actually holds across a polarity
  flip. Toggling the theme no longer re-ranks what the product is shouting about.
- The rank is now a *checked* property rather than an emergent one. It was emergent before, and
  it emerged wrong.
- CVD separation stays above 60 — 63.1 at worst, across three deficiencies, eleven Machado
  severities and both Machado and Viénot.

**Bad**

- **Error reads as a pale pink in the dark theme.** `#FEAAAC` is not what anyone pictures when
  they hear "error colour", and a designer arriving later will want to darken it. That impulse
  is the thing this record exists to stop: darkening it puts it straight back under the floor.
- It **inverts a convention** — in most dark interfaces error is a saturated red, and matching
  the rest of the ecosystem has value we are giving up.
- Chroma on `bad` drops from 0.14 to 0.10. At L0.82 there is less room for chroma inside sRGB,
  so the error state is less vivid as well as lighter.
- Three tokens changed means every generated output regenerates, and any screenshot or design
  file showing the dark palette is now stale.

**Neutral**

- Light theme is untouched.
- No engine code, no golden dataset, and no claim about physical reality moves. This is a
  product palette decision measured against published metrics.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep a deep red and fix only the contrast** | Good at: preserving the convention everyone expects. **Not possible.** Against a dark ground APCA contrast rises with lightness, so a deep red cannot reach Lc 45 there. It is geometry. Measured: holding `ok` and `warn` at their current values, no value of `bad` reaches even Lc 40 while keeping CVD separation ≥ 60. |
| **Accept the inversion, fix only APCA** | Good at: keeping error dark-ish, and defensible — NFR-9 guarantees status is never colour-only, so an error always carries an icon and text, and loudness differs while meaning does not. Not enough: it leaves the product asserting two different hierarchies and calling them one design system, and the acceptance criterion would have to be rewritten to permit exactly the defect it was written to catch. |
| **Restrict `dark.status.bad` to non-text use** | Good at: the acceptance criterion explicitly allows a recorded, machine-checkable restriction. Not enough: ADR-0044 classified `status.*` as `usage: "text"` *because the product tints the label*. A status colour that may not tint a label is not this token, and the restriction documents the defect rather than fixing it. |
| **Re-rank the light theme to match dark** | Good at: it would also make the ranks agree, without touching the dark palette. Not enough: it makes error the quietest state in both themes rather than the loudest, which is worse than the inversion it fixes. |
| **Leave it, keep the red band** | Good at: gate 9 already prints the three failing pairings separately on every run, so nothing is hidden. Not enough: R1 cannot close, and every surface built in R2 would be built on a palette with a known accessibility failure in its default theme — which is far more expensive to unwind after components exist. |

## A note on how these numbers were nearly wrong

The first independent re-measurement of this decision used `apcaLc(foreground, background)`.
**APCA is directional and takes the BACKGROUND first**, so every value came out reverse-polarity
and slightly different: the defect read as Lc 39.5 rather than 37.5, and the fix as 48.3 rather
than 46.5.

The conclusion survived — the defect was real and the fix clears the floor either way — but the
stated margin was 3.3 Lc when it is actually 1.5. It was caught because the gate's own output
disagreed with the probe, and because F-067's original record already said −37.5 to −38.6, which
turned out to be correct.

Two things worth keeping from that: **the recorded value was right and the fresh measurement was
wrong**, and a directional metric silently returns a plausible number when its arguments are
swapped. `checkSalience` takes the magnitude for exactly that reason, and `checkContrast`
carries a comment about the argument order that predates this.

## Revisit when

- APCA leaves draft, or the 0.98G-4g coefficients change. Every number here is tied to that
  version and would need re-measuring.
- The dark background lightens materially. `bad` is light because the ground is dark; a lighter
  ground changes the whole calculation and may permit a redder error.
- A measured user study shows the pale error is misread as a non-urgent state. That is the
  failure mode this decision risks, and it is the one worth watching for — the icon and label
  are what NFR-9 relies on to prevent it.
