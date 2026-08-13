# ADR-0031 — Every accuracy claim must have a measurement behind it, enforced by a lint

## Status

Accepted

## Date

2026-08-13

## Context

This category has a norm, and the norm is dishonest. Camera colour products routinely claim
"99% accurate colour detection" with nothing behind the number. Nobody publishes a method,
a device matrix, an illuminant, or a ΔE distribution. The number is a marketing artefact.

Being honest here is a differentiator, but only if it is enforced. The pressure to overstate
is constant and comes from everywhere — a marketing page needs a headline, an app-store
listing needs a bullet, a support reply wants to reassure, a UI label is shorter without the
qualifier. Every individual instance is small and reasonable. The aggregate is a product
that claims what it cannot demonstrate.

Reviewer vigilance does not survive this. There will be a launch week where nobody checks.

## Decision

**No user-facing claim about colour accuracy may exist without a published measurement
behind it. Enforced by a copy lint, not by review.**

### 1. Claims are bound to provenance

`Provenance.source` ([ADR-0005](0005-measurement-provenance-is-a-type.md)) determines the
permissible language:

| Source | May say | Must never say |
|---|---|---|
| `reference` | "reference value", "standard" | — |
| `calibrated` | "calibrated measurement", "measured" | "exact", "perfect" |
| `estimated` | "estimated", "approximately", "closest reference" | "measured", "exact", "actual colour" |
| `declared` | "selected", "entered" | "measured", "detected" |

### 2. A copy lint (NFR-21, F-025)

Banned constructions across UI strings, marketing copy, app-store text and documentation:

```
"exact colour"        "100% accurate"      "perfect match"
"AI-powered"          "measures the colour"  (for estimated sources)
"the true colour"     "professional-grade"   (outside calibrated mode)
"lab-accurate"        "guaranteed"
```

The allowlist is explicit, small, and requires a linked measurement.

### 3. Numbers require a table

Any published accuracy figure must trace to a row in the device colour lab results
(NFR-2, F-063): device, mode, illuminant, sample size, mean ΔE00, p95 ΔE00.

> **No number without a row.**

### 4. Naming is never identity

FR-7 output is "closest digital reference", never "this is 藍鼠". A rendered hex is a modern
approximation of a colour historically produced by a dye on a fibre under daylight.
Asserting identity would be false, and disrespectful to the material
([ADR-0007](0007-colour-corpus-provenance-and-licensing.md)).

### 5. Confidence is shown, never hidden

Every estimated result displays its confidence and illumination class. A low-confidence
result says so, and says what to do about it.

### 6. The disclaimer is in the licence

Colour values from consumer camera hardware are estimates and must not be relied upon where
physical colour accuracy has legal, commercial, safety or medical consequence. Stated in
[`LICENSE`](../../LICENSE), not buried in a settings screen.

## Consequences

**Good.** Trust, which is the actual product. Professional users can evaluate whether the
tool suits their work instead of guessing. Reduced legal exposure from misrepresentation.
The discipline is structural, so it survives a launch week when nobody is checking. And the
honest position is genuinely distinctive in a category where everyone else rounds up.

**Bad.** Marketing copy is harder to write and less punchy than a competitor's. "Estimated,
81% confidence, mixed lighting" is a worse headline than "instant accurate colour", and we
will lose some users at the comparison. The device colour lab is a real, recurring cost
that exists mostly to justify claims. The lint will occasionally block legitimate copy and
require a reviewed allowlist entry.

**Neutral.** Calibrated mode (FR-16) is the path to stronger claims — earned by
measurement rather than asserted.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Industry-normal claims** | Better conversion, easier marketing, everyone does it. It is untrue, it is legally exposed, and it forfeits the one position no competitor currently holds |
| **Honest by review, no lint** | Less tooling, more flexibility. Vigilance fails precisely when pressure is highest, which is launch week — and a claim that ships is hard to retract |
| **Disclaimers only** | Cheap and legally standard. Nobody reads a disclaimer under a headline that contradicts it, and a contradiction between the two is worse than either alone |
| **No accuracy claims at all** | Maximally safe. Professional users genuinely need to know what the tool can do; refusing to say is unhelpful and reads as evasive |

## Revisit when

- Calibrated mode has enough device-matrix data to support a stronger, still-measured
  claim.
- Hardware integration (a Bluetooth spectrocolorimeter) makes genuine colorimetric
  measurement available — at which point `source: 'reference'` becomes reachable from a
  user's own device, and the language table above gains a new row.
