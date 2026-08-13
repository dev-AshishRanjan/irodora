---
name: camera-lab
description: Measure real capture accuracy across devices and lighting, so an accuracy claim has a row behind it.
---

# Skill: camera-lab

NFR-2 · F-063 ·
[ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md).

> **No number without a row.**

This category's norm is "99% accurate" with no method behind it. The lab exists so our
numbers are different — and so we know what our product can actually do.

## The protocol

### Controlled variables

| | |
|---|---|
| **Reference targets** | A known colour card, plus real fabric samples with measured Lab values |
| **Illuminants** | D65 daylight simulator · warm indoor (~2700 K) · cool indoor (~5000 K) · mixed (two sources) · low light |
| **Geometry** | Fixed distance, fixed angle, fixed target area |
| **Devices** | The reference matrix — flagship and mid-range iOS and Android, plus Safari and Chrome on desktop |
| **Modes** | Live pick · garment scan · precision pick · calibrated |

### Per measurement

```
device · os · browser (if web) · mode · illuminant · target · reference Lab
→ measured Lab · ΔE00 · confidence reported · quality class · timestamp
```

**≥ 10 repeats per combination.** A single reading is not a measurement — sensor noise and
auto-exposure drift are exactly what the repeats are for.

### The output

```
device × mode × illuminant → n · mean ΔE00 · p95 ΔE00 · reported confidence
```

Committed to `tests/color-lab/results/`, versioned, with the engine version.

## Reading the results

**Correlate confidence with accuracy.** The confidence figure is only useful if a
low-confidence result really is less accurate. If it is not, the confidence model is wrong
and that is the finding.

**Look for systematic bias per device.** A consistent offset is correctable and should
become a device profile. Random scatter is noise and should lower confidence instead.

**Check whether calibrated mode delivers.** FR-16 promises ≥ 50 % mean ΔE00 improvement
over uncalibrated. Measured, or the claim comes out.

## What may then be claimed

| Result | Claim |
|---|---|
| Mean ΔE00 ≤ 4.0, precision mode, daylight | "Typically within ΔE00 4 in good light" |
| Calibrated ≤ 2.0 | "Calibrated measurement, typically within ΔE00 2" |
| Anything else | **Nothing.** Publish the table and let it speak |

**Never** convert a ΔE distribution into a percentage. "95% accurate" has no defined
meaning for colour, and inventing one is the exact dishonesty this whole apparatus exists
to avoid.

## Adding a device

Full matrix — every mode, every illuminant, ≥ 10 repeats. A partial row is worse than no
row, because it looks like a measurement.

## When accuracy is worse than hoped

**Publish it anyway, and say what improves it.**

"Mixed lighting roughly doubles mean ΔE00; move to a single light source" is more useful to
a user than a number that hides the effect — and it is the difference between an instrument
and a toy.
