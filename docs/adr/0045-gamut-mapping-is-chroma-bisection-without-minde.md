# ADR-0045 — Gamut mapping is OKLCh chroma bisection, without CSS Color 4's MINDE step

## Status

Accepted

## Date

2026-08-15

## Context

FR-8 requires out-of-gamut colours to map "by OKLCh chroma reduction, preserving lightness
and hue within stated bounds". The documented default for that job is **CSS Color 4 §13.2**,
which is chroma bisection **plus MINDE**: at each step it compares the reduced-chroma colour
against its channel-clipped self using `deltaEok`, and stops early once the two are within a
just-noticeable difference — returning the *clipped* colour, which keeps more chroma.

Two things pushed against implementing it as written.

**The package boundary.** `deltaEok` lives in `@irodora/color-difference`, which depends on
`@irodora/color-spaces`. Gamut mapping belongs in `color-spaces` (`feature_list.json`, and
because it is a *rendering* operation, not a metric). So MINDE would require either
re-deriving Euclidean OKLab distance in `color-spaces` — a second implementation of a shipped
function, a defect by definition under `AGENTS.md` §7 — or moving the mapper into the metrics
package.

**And then the measurement, which turned out to matter more.** Comparing our bisection with
`colorjs.io`'s `toGamut({ method: 'css' })` over 30 out-of-gamut colours:

| | ours | CSS Color 4 MINDE |
|---|---|---|
| max hue drift | **2.6 × 10⁻⁵ °** | **11.97 °** |
| max ΔE00 between the two results | — | 5.21 |
| `oklch(0.9 0.35 240)` hue | 240.00 → 240.00 | 240.00 → **228.03** |
| Display-P3 green hue | 145.64 → 145.64 | 145.64 → **143.33** |

MINDE's early stop returns the clipped colour once it is within a JND *in ΔEok* — and ΔEok
tolerates hue movement. So the standard algorithm trades hue for chroma, by up to 12°.

Our result was cross-checked against **culori's `clampChroma`**, an independent implementation
of the same chroma-reduction algorithm: agreement to **0.0063 ΔE00**, which is quantisation
noise. The 5.21 ΔE00 gap is not our error; it is the two algorithms answering different
questions.

## Decision

**`gamutMap` is pure OKLCh chroma bisection: 32 halvings for the largest chroma whose
rendering fits, holding `L` and `H`. No MINDE step.**

1. **`L` and `H` are preserved exactly**, to 7 × 10⁻¹² in OKLCh — the round-trip noise, not
   an approximation. Only `C` is varied, by construction.
2. **The invariant is maintained at every step**: `low` is always a chroma known to fit,
   `high` one known not to, and the answer is `low` — never an unproven midpoint.
3. **The stated bound is after rendering**, and it degrades near the black point because a
   final clamp of at most `GAMUT_EPSILON` (10⁻⁷) per channel is a large *relative* movement
   there, and OKLCh hue at chroma 10⁻³ is not a meaningful angle:

   | result `L` and `C` at least | max \|ΔL\| | max Δhue |
   |---|---|---|
   | 0.05 | 1.2 × 10⁻⁷ | 6.9 × 10⁻⁵ ° |
   | 0.01 | 3.9 × 10⁻⁶ | 7.6 × 10⁻³ ° |
   | unfiltered | 5.7 × 10⁻⁴ | 23 ° |

   The last row is not a defect and is recorded rather than hidden: every one of those cases
   is within 10⁻⁷ of a channel, at a lightness where sRGB has almost no volume.
4. **Three cases are not chroma reduction**, and each is an explicit branch rather than a
   loop that happens to terminate: already in gamut (early return, which is what makes
   idempotence exact), achromatic, and *out of gamut in lightness* — where no chroma fits and
   `lightnessOutOfRange` says so, because a caller reporting "we reduced saturation" would be
   lying.

## Consequences

**Good.** Hue survives to 2.6 × 10⁻⁵ ° where the standard algorithm moves it by up to 12°. On
a product whose claim is that the colour is right, hue is the axis a user notices and chroma
is the one they forgive — "that green is less vivid here" is a different sentence from "that
green is now yellow". The implementation needs no distance metric, so the package boundary
stays clean and `color-spaces` keeps its zero-dependency shape.

**Bad.** **We are not CSS-compliant, and a browser doing its own `oklch()` gamut mapping will
disagree with us by up to 5.21 ΔE00 on the same colour.** That is a real interoperability
cost, and it will show up the first time a P3 value is handed to CSS and rendered by the
browser rather than by us — the same colour, mapped twice, differently. Anywhere both paths
are possible, ours must be the one that runs, and the CSS fallback must be a value we already
mapped. We also return slightly *less* chroma than the standard, which is the price of the
hue we keep.

**Neutral.** `Gamut` is an enum, so Rec.2020 is additive. The 32-step bisection is fixed
rather than adaptive; it is ~32 conversions per out-of-gamut colour, which is irrelevant for
tokens and corpus entries and would need measuring before per-pixel use (F-064).

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Implement CSS Color 4 exactly, moving `gamutMap` into `color-difference`** | Standards-compliant and interoperable. Rejected on the measurement: it drifts hue up to 11.97°, which is the one thing this product cannot trade. It also puts a rendering operation in a metrics package |
| **Implement MINDE by re-deriving OKLab distance in `color-spaces`** | Removes the package problem and keeps compliance. It is a second implementation of `deltaEok` — the defect `AGENTS.md` §7 names — and it would still have the hue cost |
| **Move `deltaEok` down into `color-spaces` as a geometric primitive** | Defensible: Euclidean distance in OKLab is arguably geometry, not colour difference. Would let us implement MINDE later without duplication. Not done now because it moves a shipped, golden-tested export across a package boundary for a feature that then chooses not to use it — and the hue cost stands either way |
| **Per-channel clipping** | What almost everything does. Moves hue by up to **33.6°** on this sample set, measured in the test as the decoy. Not a candidate; recorded because it is the default a future contributor will reach for |
| **CUSP or other lightness-moving mapping** | Keeps more chroma by trading lightness. FR-8 and the acceptance criteria specify chroma reduction, and lightness is what the contrast gates depend on |

## Revisit when

- A surface hands OKLCh to the browser and lets CSS map it. Then either that path is wrong or
  this one is, and the 5.21 ΔE00 becomes a visible defect rather than a recorded difference.
- F-064 (pattern extraction) needs per-pixel mapping, where 32 conversions per pixel is worth
  measuring against an analytic gamut-boundary approximation.
- CSS Color 4's algorithm changes. It has moved before, and this ADR is pinned to the version
  measured here.
