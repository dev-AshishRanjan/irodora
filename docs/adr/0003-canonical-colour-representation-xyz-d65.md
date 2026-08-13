# ADR-0003 — CIE XYZ (D65) is the canonical internal colour representation

## Status

Accepted

## Date

2026-08-13

## Context

Every colour system needs one representation that everything else derives from. The
tempting default is hex or sRGB, because that is what displays consume and what developers
recognise on sight.

It is the wrong choice for this product, for three reasons:

1. **sRGB is not perceptually uniform.** Equal numeric steps are not equal perceptual
   steps. Any ranking, similarity or harmony computed in sRGB is subtly wrong in ways that
   look plausible.
2. **sRGB is a gamut, not a colour.** Modern phone cameras capture Display-P3. Storing a
   P3 capture as sRGB discards saturated colours irreversibly — and saturated garment dyes
   are exactly where it happens.
3. **Hex has no white point.** The same fabric measured under daylight and under a warm
   bulb produces different hex values with no way to relate them. Chromatic adaptation
   requires a device-independent space.

We also need to accept measured Lab from a colorimeter (FR-28), which has no meaningful
RGB origin at all.

## Decision

**CIE XYZ at the D65 white point is canonical.** Everything else is derived.

```
       hex ─┐                                     ┌─ hex
     sRGB ──┼─→ linear ─→ ┌──────────┐ ─→ linear ─┼─→ sRGB
       P3 ──┘   (EOTF)    │  XYZ D65 │   (OETF)   └─→ P3
                          │CANONICAL │
   measured Lab ─────────→└────┬─────┘
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
             CIELAB          OKLab       CAT16 adaptation
                │              │
                ▼              ▼
              LCh            OKLCh
```

Rules that follow:

- The stored value is XYZ. `lab_*`, `oklch_*` and `hex` are **materialised derivations**
  computed by the engine at write time, never by the database or by a client.
- sRGB and Display-P3 are **input and output spaces only**.
- `Provenance.originSpace` records the space a value arrived in — round-tripping is only
  honest back to that space.
- Manipulation happens in **OKLCh** (hue rotation, chroma reduction, interpolation),
  because it is the most perceptually uniform of the derived spaces. Manipulation results
  are converted back to XYZ for storage.
- Professional comparison uses **CIELAB and ΔE00**, which is the language colorimetry
  already speaks.

## Consequences

**Good.** Every metric is computed in a space where it is actually valid. P3 captures
survive without clipping. Chromatic adaptation between illuminants becomes possible, which
is what makes an indoor and an outdoor measurement comparable at all. A colorimeter's Lab
enters the system as a first-class value.

**Bad.** More conversion arithmetic — every display path costs a transform. Storage
carries redundant derived columns. Developers must learn to reach for OKLCh rather than
HSL, which is a genuine adjustment. And `float64` XYZ is less human-readable in a database
row than `#263B3C`, which makes debugging slightly less immediate.

**Neutral.** The derived columns are a deliberate denormalisation for query performance.
They are consistent only because exactly one implementation writes them — which is the
subject of effect link [E-001](../../.harness/state/effects.json).

## Alternatives considered

| Alternative | Why not |
|---|---|
| **sRGB/hex canonical** | Familiar, compact, directly displayable. But not perceptually uniform, no white point, and lossy for P3 captures. Every downstream metric would inherit the error |
| **CIELAB canonical** | Perceptual and already the professional lingua franca. But it bakes in a white point at storage time, so a re-adaptation to a different illuminant becomes lossy. XYZ keeps that door open |
| **OKLab canonical** | The best perceptual behaviour of the three. But it is newer, less universally interoperable, and derived from XYZ anyway — storing the derivation rather than the source inverts the dependency for no gain |
| **Store the capture space, convert on read** | Avoids one conversion. But then two colours captured in different spaces cannot be compared without knowing both, and every consumer needs conversion logic. The whole point of a canonical space is that comparison is unconditional |

## Revisit when

- A capture space appears that XYZ D65 cannot represent (HDR/Rec. 2100 with a different
  white point would qualify).
- Spectral data becomes available from consumer hardware, at which point spectral
  reflectance — not XYZ — would be the honest canonical form.
