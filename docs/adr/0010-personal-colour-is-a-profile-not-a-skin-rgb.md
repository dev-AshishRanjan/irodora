# ADR-0010 — A personal colour profile is a set of ranges, never a skin colour value

## Status

Accepted

## Date

2026-08-13

## Context

The obvious implementation of personal colour analysis: take a selfie, sample the face,
get a skin RGB value, classify into a seasonal palette.

It is obvious, it is what most competitors do, and it is wrong on four counts:

1. **Skin is not one colour.** Forehead, cheek and jaw differ. Blood flow varies within a
   day. Sun exposure varies within a season. There is no single value to sample.
2. **The camera dominates the measurement.** Automatic white balance, exposure and
   vendor-specific "beauty" processing alter skin tones by more than the differences we
   would be trying to detect. Under a warm bulb, the *lighting* is what gets measured.
3. **A single RGB value is false precision.** `#E8C4A0` looks like a measurement. It is
   one sample of a varying surface through an uncalibrated sensor under unknown light,
   presented with six significant figures.
4. **It invites classification we refuse to make.** A skin colour field is one product
   meeting away from ethnicity inference, and a database column is a standing invitation.
   NFR-22 forbids that outcome; the surest way to enforce it is to make the input
   unavailable.

What actually predicts whether a garment colour works is not a skin coordinate. It is a
set of *relationships*: whether the wearer suits warm or cool casts, how much chroma they
tolerate, what lightness range flatters, how much contrast they want. Those are ranges with
uncertainty, and they are what a trained colour analyst actually determines.

## Decision

**The profile is a multidimensional set of ranges with per-dimension confidence. There is
no skin colour field, and there cannot be one.**

```
PersonalColorProfile
├── lightness       min … max      + confidence
├── temperature     warm ↔ cool bias  + confidence
├── chroma          min … max      + confidence
├── contrast        preference     + confidence
├── neutrals[]      preferred
├── accents[]       preferred
├── avoid[]         difficult colours
└── method          guided | photo-assisted | professional
```

1. **No `skin_color` column exists.** A schema check rejects any migration that adds one
   (NFR-22). This is not a policy note; it is a test.
2. **Guided setup is the primary path** (FR-26): swatch comparisons, ~90 seconds, no
   camera. Deterministic, private, and it works for someone who does not want to
   photograph their face.
3. **Photo-assisted setup populates ranges, not points** (FR-27), and every derived
   dimension is presented as editable with its confidence. The image is processed
   on-device and discarded; only the corrected profile is stored.
4. **Professional entry** accepts measured Lab and marks the profile `reference` (FR-28).
5. **Confidence is per dimension.** Guided setup may establish contrast preference with
   high confidence and chroma tolerance with low, and the compatibility engine weights
   accordingly rather than treating a guess as a fact.
6. **The user's correction always wins.** No re-derivation overwrites a value the user
   set.
7. **Never in telemetry.** Profile dimensions cannot reach a log or trace; asserted by a
   redaction test.

## Consequences

**Good.** Honest about what is knowable. Works without a camera, which is both a privacy
and an accessibility win. Editable, so a wrong estimate is a correction rather than a
dead end. Structurally forecloses the ethical failure in NFR-22 — you cannot infer
ethnicity from a field that does not exist. Confidence flows into scoring, so uncertain
dimensions influence recommendations less.

**Bad.** Slower onboarding than "take a selfie, get your season" — 90 seconds against 5.
Harder to market, because the competitor's version sounds more magical. More complex data
model and a more complex compatibility engine than comparing two RGB values.

**Neutral.** The product does not produce a seasonal label ("you are a Deep Autumn"). It
can *map* to seasonal vocabulary for users who want it, but the underlying model is
continuous ranges.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Single skin RGB from a selfie** | Fast, familiar, demos beautifully. Measures the lighting and the camera as much as the person, presents false precision, and creates the exact data field NFR-22 exists to prevent |
| **Seasonal classification only** (12-season system) | Established vocabulary users already know. Discards information — two people in the same season have genuinely different chroma tolerance, and the model cannot express it |
| **Camera-only, no manual path** | Less UI to build. Excludes anyone unwilling to photograph their face, and has no recovery when the estimate is wrong |
| **No personal colour at all** | Avoids the whole problem. But "does this suit me" is one of the six core journeys, and the product would be materially less useful without it |

## Revisit when

- Calibrated capture ([ADR-0006](0006-camera-capture-vision-camera-and-getusermedia.md),
  FR-16) makes photo-assisted estimation genuinely reliable — which would raise its
  confidence, not change the model.
- Bias validation (NFR-23) shows a dimension performing unevenly across ITA° bands, in
  which case the dimension's derivation changes, not its representation.
