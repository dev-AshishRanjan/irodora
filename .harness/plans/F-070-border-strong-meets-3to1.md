# Plan: F-070 — `border.strong` meets 3:1 as an outlined control boundary

| | |
|---|---|
| **Feature** | F-070 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` · `@irodora/ui` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

The boundary of an outlined control **is** the border, so WCAG 1.4.11 applies to it directly
and 3:1 is not a preference.

## The defect, measured

`border.strong` was translucent — `rgba(0,0,0,0.15)` light, `rgba(255,255,255,0.14)` dark — and
carried an `uncheckedReason`, so gate 9 never looked at it. Composited over every surface, both
models, worse taken:

```
light   1.17 against every surface        (1.02 against inverse)
dark    1.41 – 1.56                       (1.01 against inverse)
```

A line you can see only because you know it is there.

## Approach

**Opaque and mid-neutral**, the same conclusion as F-068 and for the same reason: a translucent
line's contrast is hostage to whatever is behind it.

**Searched in OKLCh, not sRGB.** The manifest's `oklch` field is authoritative and `srgb` is
derived ([ADR-0043](../../docs/adr/0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md)),
so searching in sRGB and back-converting would author the wrong field. The search takes the
**quietest** value clearing the target — a boundary should be a boundary, not a frame — with
margin above 3:1 so a surface nudge does not silently break it.

**It does not pair with `inverse`.** A filled control's boundary is its *fill* against the page,
not a line. Listing `inverse` would demand one colour clear 3:1 against both a near-white and a
near-black ground, which nothing can — so `Button`'s filled variant drops its border instead.

## Anticipated effects

**E-007** — a manifest change: four targets regenerate, and both colour gates re-read it.
Removing the `uncheckedReason` moves this token from "exempt" to "checked", which is the point.

## Test plan

Gate 9 itself, once the token is declared rather than exempt — that is the whole feature. The
worst case is recomputed here as evidence, and the gate is what keeps it true.

## Out of scope

`border` (the hairline) · the swatch keyline (F-068) · status adjacency (F-069).
