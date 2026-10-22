# E-213 — The P3 row is the engine's conversion of the record's XYZ

**Link:** `readoutRows` (`apps/mobile/src/detail.ts`) with `displayP3Of` (`apps/mobile/src/engine.ts`) →
`xyzToDisplayP3` (`@irodora/color-spaces`), the colour page's readout, `colour-detail-fidelity.test`
**Guard:** `detail.test` over all 120 entries (P3 = the conversion of `entry.color.xyz`, never the sRGB
bytes ÷ 255; every value names its space; only the out-of-sRGB entry carries its note)
**Severity:** high **Feature:** F-247

---

## Why B changes when A does

`06` prints *Display-P3* beside sRGB, and the triple it prints is its sRGB values divided by 255 — a
number that looks like a P3 reading and is not one. The bundle holds no P3 (`DerivedColor` carries Lab,
LCh, OKLCh, RGB and hex), so the colour page asks the engine for it at render: `displayP3Of` passes the
record's **canonical XYZ** to the golden-tested `xyzToDisplayP3`, through `engine.ts`, the app's one
import site for colour maths (ADR-0146 D4).

Three plausible wrong inputs would each print a convincing triple:

- the sRGB bytes ÷ 255 (`06`'s own error);
- the gamut-mapped sRGB converted onward, which carries the mapping's loss into the wider space;
- XYZ under a different white.

The decoy is the first: a test that only checked "three numbers in [0, 1]" would pass all three.

The same row is where rule 11 shows. One entry of 120 lies outside sRGB, so its hex is the nearest
rendering and not the colour; the row says *nearest sRGB rendering, ΔE00 n.nn* from the bundle's own
`renderDeltaE00`, and no in-gamut entry says it.

## What it does not guard

- **That a phone shows P3.** The row is a number; what a display renders is the display's.
- **The conversion's own correctness** — that is the colour-spaces golden suite's.

Related: [[a-figure-says-what-it-is-and-where-it-was-computed]].
