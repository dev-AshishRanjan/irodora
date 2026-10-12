# E-197 — A length may move where a colour may not

**Link:** `design-system.manifest.json#motion.animatableLength` → the React Native emitter,
`nativeMotion`, `verify-motion`, `ArcFill`, the progress ring and the coverage dial
**Guard:** `typography.test` (the field exact; `animatable` unchanged as the decoy) ·
`verify-motion --prove` · `generate-design-tokens --check` **Severity:** high **Feature:** F-266

---

## Why B changes when A does

The manifest's `animatable` keeps colour still: `opacity` and `transform`, nothing else. F-266
needed one more channel — a stroke's dash offset, where the stroke's LENGTH is the reading (the
working ring, the coverage dial) — and admitted it beside the list rather than into it, for animated
props only (ADR-0133 §4). `verify-motion` reads both lists from the build, so editing the field
changes what the gate permits on the next build, and the ring and the dial depend on it.

## Why a dash, and its cost

The arc is drawn once, as its whole span, and `strokeDasharray [L, L]` with `strokeDashoffset
L·(1 − v)` shows exactly the first `L·v`: one number moves, never the path or the ink. It lays
nothing out, but it is not compositor-only — the SVG re-paints each frame — which is F-268's to
measure. At 0 the fill's opacity is 0: a zero-length dash with round caps paints a dot.
