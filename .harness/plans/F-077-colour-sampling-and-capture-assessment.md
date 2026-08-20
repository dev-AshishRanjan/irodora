# Plan: F-077 — Colour sampling and capture assessment in the engine

| | |
|---|---|
| **Feature** | F-077 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-15, FR-17, FR-18 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/color-sampling` (new engine package) |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

Turn a region of pixels into one colour, with an honest number attached to how much to trust
it. To a user: the Lens says what it sees *and* how sure it is, and it refuses to sound
confident about a photograph taken in mixed light at arm's length.

Split out of F-040 because the two halves have opposite verification stories: this one is
fully gateable with no device; the camera plumbing is almost entirely a device attestation.

## The rule that governs everything here

> **Averaging happens in linear light.**
> [[averaging-non-linear-srgb-reads-too-dark]] · `AGENTS.md` §7

sRGB is gamma-encoded, so averaging encoded values is not averaging light. It is the most
common colour bug there is and **it always makes the result too dark** — plausibly, by an
amount that looks like a lighting difference rather than a bug.

That is why *"a golden case proves the non-linear route is measurably darker"* is an acceptance
criterion rather than a test someone might think to write. A decoy that is not broken proves
nothing [[a-decoy-that-is-not-broken-proves-nothing]], and here the decoy is the implementation
almost everyone writes first.

## Approach

**New package, `@irodora/color-sampling`**, inside the engine zone. It therefore inherits the
whole constraint set: **zero runtime dependencies, no `node:*`, no DOM, no `process`** — NFR-3,
enforced by `verify-engine-purity.mjs`, which follows `@irodora/*` dependency edges since
F-073. That is not overhead; it is the reason the same fabric measures the same on every
surface, which is what [E-008](../state/effects.json) exists to protect.

**Reused:** `@irodora/color-spaces` for the transfer function and conversions — the linear
round-trip is *its* job, and a second copy here would be the exact defect this feature is
about · `@irodora/color-core` for `Color` and `Provenance`, so a sampled result cannot exist
without its confidence.

### Increments

1. **Rejection rules.** Specular, shadow, transparent, background. Each with a test proving a
   rejected pixel *would have changed the answer* — a rejection rule that removes pixels which
   made no difference is untested, however green it looks.
2. **Robust statistics.** Median, trimmed mean, variance, over ≥1000 samples, **in linear
   light**, with the golden case that proves the encoded route is darker.
3. **Illumination classification** — daylight, warm indoor, cool indoor, mixed, low light,
   unknown — and the confidence reduction for mixed and low light.
4. **Quality classification** — excellent, good, fair, poor — from exposure, blur, illumination
   uniformity, sample area and colour variance, with an actionable instruction on poor.
5. **Record and close.**

## Anticipated effects

**E-008** (`sampling-lives-in-the-engine-not-the-platform`) finally has an implementation to
point at. Until now it protected a rule about code that did not exist; it now names this
package, and the guard is the engine purity gate plus this package's own tests.

**Touches E-002** (`Color` reaches every surface): a sampled result carries
`Provenance.source: 'estimated'` with a confidence, which is the first non-`declared`
provenance anything in this repository produces. That is also what unblocks the
`provenanceLanguage` half of the claims lint, which F-017 moved to F-040 for exactly this
reason — **it can move again to here.**

## Test plan

- **Golden:** the linear-versus-encoded average, with the difference stated as a number rather
  than as "different". A citation for the transfer function, which `color-spaces` already has.
- **Property:** the median of a symmetric distribution equals its centre; a trimmed mean is
  bounded by the median and the mean; adding a pixel already at the median does not move it.
- **Negative, each with a decoy that is genuinely broken:** a specular pixel that shifts the
  mean if kept; a shadow pixel likewise; a region below 1000 samples must reduce confidence
  rather than silently proceeding; a uniform grey region must classify as *unknown*
  illumination rather than guessing daylight.
- **Assertions to reject:** comparing the linear average to itself; asserting confidence "is a
  number"; a rejection test whose rejected pixels were already at the mean.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:golden && pnpm build
node scripts/verify-engine-purity.mjs --prove
```

## Risks and open questions

**Classification thresholds are judgements, not measurements.** "Warm indoor" versus "mixed" is
a cut on a continuum, and any number chosen here is a convention. They are therefore *declared
as data with a stated basis* rather than buried in code, and NFR-2 applies: no number without a
row behind it. Where there is no row yet, the value says so and the confidence it produces is
capped rather than asserted.

**This feature cannot validate itself against real captures.** F-063 (the device colour lab) is
what produces those rows, and it is R5. So the maths is proven here; the *thresholds* remain a
stated convention until measured, and the claims lint already refuses any copy that says
otherwise.

## Out of scope

VisionCamera, frame processors, pixel formats and the bridge (**F-040**) · calibrated capture
with a reference card (F-053) · pattern and multi-colour extraction (F-064) · any accuracy
*claim* — this feature produces a confidence, and ADR-0031 governs what may be said about it.
