# The Irodora Colour Engine

| | |
|---|---|
| **Status** | Specification — implemented across F-006 … F-014 |
| **Implements** | FR-1 … FR-12, NFR-1, NFR-3 |
| **Decisions** | [ADR-0003](../adr/0003-canonical-colour-representation-xyz-d65.md) · [ADR-0004](../adr/0004-own-the-colour-engine-culori-as-test-oracle.md) · [ADR-0005](../adr/0005-measurement-provenance-is-a-type.md) · [ADR-0009](../adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md) |

This is the product. Everything else is an interface to it.

---

## 1. Principles

1. **CIE XYZ (D65) is canonical.** RGB and hex are input and output. Nothing derives from
   hex; hex derives from XYZ.
2. **Pure, platform-free, dependency-free.** No `node:*`, no DOM, no `process`, no runtime
   dependencies. Lint-enforced. This is what makes NFR-3 achievable rather than aspirational.
3. **Reference-validated, not snapshot-validated.** Golden datasets come from published
   sources. A snapshot test only proves the code still agrees with itself.
4. **Provenance travels with the value.** A colour without its measurement class is not
   representable.
5. **Reproducible.** Same inputs and versions → identical outputs, on every platform,
   forever.
6. **Explainable.** Every score decomposes into named factors with direction and magnitude.

---

## 2. Numerical policy

Colour maths is floating-point maths, and the difference between a correct and an almost-
correct implementation is invisible without discipline:

- **`float64` throughout.** No `Math.fround`, no deliberate precision reduction.
- **No transcendental shortcuts.** Approximations of `pow`, `cbrt`, `atan2` are forbidden
  in the core. If a hot path needs one, it goes behind a flag with its own golden test
  proving the error bound.
- **Matrices are stored to full published precision**, never rounded for readability, and
  their inverses are stored explicitly rather than computed at runtime — a runtime inverse
  introduces platform-dependent error into the one place we cannot afford it.
- **Rounding happens only at the boundary**, when producing a hex string or a display
  value. Never mid-pipeline.
- **Averaging happens in linear light.** Averaging non-linear sRGB values is the single
  most common colour bug in software, and it always makes the result too dark.
- **Hue is an angle.** Interpolation and averaging use the shortest arc; `(350° + 10°)/2`
  is `0°`, not `180°`. Property-tested.

---

## 3. Conversion graph

```
    hex ─┐                                    ┌─ hex
  sRGB ──┼─→ linear ─→ ┌─────────┐ ─→ linear ─┼─→ sRGB
    P3 ──┘   (EOTF)    │  XYZ    │   (OETF)   └─→ P3
                       │  D65    │
  measured Lab ───────→│CANONICAL│
                       └────┬────┘
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           CIELAB        OKLab       (adaptation)
              │             │          CAT16
              ▼             ▼
            LCh          OKLCh
```

**Standards implemented** (formulae from published description; the standards documents
themselves are not redistributed — see [`../../NOTICE.md`](../../NOTICE.md)):

| Transform | Source |
|---|---|
| sRGB transfer function and primaries | IEC 61966-2-1 |
| Display-P3 primaries, sRGB transfer curve | SMPTE RP 431-2 / CSS Color 4 |
| XYZ ↔ CIELAB | CIE 15:2018 |
| CIELAB ↔ LCh | CIE 15:2018 |
| XYZ ↔ OKLab | Ottosson (2020) |
| Chromatic adaptation | CAT16 (default), Bradford (available) |

**The linearisation cutoff matters.** The sRGB EOTF has a linear segment below
`0.04045`. Implementations that use the pure power function throughout are visibly wrong
in dark colours — and dark colours are exactly where this product lives, because indigo,
sumi and charcoal are half the corpus. The golden set contains near-black values
specifically to catch this.

---

## 4. The `Color` value type

Provenance is not metadata attached later. It is part of the value (FR-9,
[ADR-0005](../adr/0005-measurement-provenance-is-a-type.md)):

```ts
interface Color {
  readonly xyz: readonly [x: number, y: number, z: number]; // canonical, D65
  readonly provenance: Provenance;
}

interface Provenance {
  /** How this value came to exist. Determines what may be claimed about it. */
  readonly source: 'reference' | 'calibrated' | 'estimated' | 'declared';
  /** [0,1]. A bounded quality signal from stated inputs — NOT a probability. */
  readonly confidence: number;
  /** Present when `source` is 'estimated' or 'calibrated'. */
  readonly conditions?: CaptureConditions;
  /** The space the value ARRIVED in. Round-tripping is only honest back to this. */
  readonly originSpace: ColorSpace;
  readonly capturedAt?: string;
}

interface CaptureConditions {
  readonly illuminant: 'daylight' | 'warm-indoor' | 'cool-indoor' | 'mixed' | 'low-light' | 'unknown';
  readonly quality: 'excellent' | 'good' | 'fair' | 'poor';
  readonly sampleCount: number;
  readonly variance: number;
  readonly device?: DeviceProfile;
}
```

**The consequence, which is the point:** a UI component that takes a `Color` cannot render
it without also having its provenance. There is no code path that displays a hex value
while dropping the fact that it was estimated under a warm bulb, because there is no way
to construct one.

Colours from an unknown or untracked origin are constructible only through
`Color.unsafeFromHex()`, which sets `source: 'declared'` and `confidence: 0.5`, and whose
every call site is reviewed.

---

## 5. Sampling pipeline (FR-13 … FR-18)

A fabric is not one pixel. Texture, weave, shadow and specular highlight mean a single
sample is a coin toss.

```
frame + platform colour-space metadata
        │
        ├─ exposure and white-balance stability check ────→ quality signal
        │
        ├─ sampling region (crosshair, user selection, or detected)
        │
        ├─ spatial sampling: ≥1000 px on a jittered grid
        │      (a grid alone aliases against woven texture — jitter breaks the beat)
        │
        ├─ reject: specular highlights (top luminance percentile)
        │          extreme shadows (bottom luminance percentile)
        │          transparent / clipped pixels
        │          pixels beyond the region boundary
        │          chromatic outliers (> 2.5 MAD from the median in ab)
        │
        ├─ convert survivors to LINEAR light
        │
        ├─ robust average: component-wise median + 20% trimmed mean
        │      (median resists specks; trimmed mean uses more of the data.
        │       We report both, and disagreement between them is itself a
        │       texture signal that lowers confidence.)
        │
        ├─ variance → confidence contribution
        │
        └─→ Color { xyz, provenance: { source: 'estimated', confidence, conditions } }
```

**Confidence inputs** (FR-18), each bounded and stated: sample count · post-rejection
variance · illumination uniformity across the region · exposure stability across recent
frames · blur estimate · region area in pixels · median/trimmed-mean agreement.

Confidence is a **product of bounded factors**, so any single bad input caps the result.
It is deliberately *not* a sum — a sum lets four good signals hide one disqualifying one.

**Calibrated mode** (FR-16) adds: detect the reference card → locate patches → solve a
3×3 (or polynomial) correction from observed to known patch values → apply to the
garment sample → set `source: 'calibrated'` and raise the confidence ceiling. The
correction matrix and its residual error are stored with the result, so a calibrated
measurement can be audited after the fact.

---

## 6. Colour difference (FR-2)

| Metric | Use |
|---|---|
| **ΔE00 (CIEDE2000)** | Default for every user-facing claim, ranking and duplicate detection |
| ΔEok | Fast pre-ranking of large candidate sets; never a stated result |
| ΔE94 | Legacy interoperability |
| ΔE76 | Available for comparison and teaching; never a default |

**ΔE00 is the classic implementation trap.** The hue-difference term has a discontinuity
at ±180°, the `Rt` rotation term is easy to sign-wrong, and both errors produce results
that look plausible. The golden set therefore includes **all 34 Sharma–Wu–Dalal test
pairs**, which exist precisely to catch these, asserted to 4 decimal places. An
implementation that does not reproduce them is wrong regardless of how it looks.

---

## 7. CVD engine (FR-4, FR-5)

Two model families, chosen for what each is actually good at:

- **Brettel–Viénot–Mollon (1997) / Viénot (1999)** — dichromacy (protanopia,
  deuteranopia, tritanopia). Projection onto the reduced colour plane.
- **Machado–Oliveira–Fernandes (2009)** — anomalous trichromacy at severity 0…1. The
  common case, and the one a severity slider needs.

**Separation score** — one definition, used identically by the UI and the recommendation
engine, because two definitions would eventually disagree and nobody would notice:

```
separation(a, b, deficiency, severity) =
    simulate both colours under (deficiency, severity)
    → combine post-simulation ΔE00 with the post-simulation lightness difference
    → map to [0,100] against published discriminability thresholds
```

Lightness difference is included deliberately: two colours that a dichromat cannot
distinguish by hue may still be perfectly separable by value — and telling someone their
outfit fails when it does not is its own accessibility failure.

**The engine, not a filter.** CVD simulation is available to the UI, but its primary
consumer is the recommendation engine, which scores separation for every candidate outfit
(FR-35). A CVD "mode" that only recolours the screen helps nobody choose trousers.

---

## 8. Naming (FR-7)

```
input Color
  → CIELAB
  → candidate retrieval: Lab buckets visited in increasing LOWER BOUND on ΔE00,
    stopping once the next bucket cannot beat the k-th best found  (@irodora/color-naming)
  → rank by ΔE00, ties broken by id
  → contextual filter (family, era, classification per request)
  → return ≥ 3 ranked candidates with ΔE00 and similarity
```

**The retrieval is indexed. The ranking is not, and cannot be.** ΔE00 is not a metric, so no
spatial structure can order by it — what is indexed is *position in CIELAB*, and every candidate
that survives retrieval is then ranked by the real thing.

The distinction is not pedantic, because the natural implementation of "spatially indexed for
speed" — a fixed radius — is wrong in a way that passes its own test: a radius sufficient for one
corpus is insufficient for another, and adding one entry can change an answer. Measured, a radius
of 10 Lab units returns the wrong answer on **317 of 360** queries.

What makes the two-stage result **provably identical to a full scan** is the lower bound plus the
stopping rule, not the bucket size: `bucketStep` affects speed only, and the test suite asserts
identical results from one Lab unit per cell up to a single bucket holding the whole corpus. See
[E-015](../../.harness/state/effects.json), which is the link to read before changing any of it.

**A filter must not be applied to the result.** Filtering after the search silently breaks the
stopping rule, because the k-th best that terminated it may not survive the filter. Build the
index over a filtered record set, or test the predicate inside the candidate loop.

**Language is a hard constraint.** Output is *always* "closest digital reference", never
"this is 藍鼠". A rendered hex is a modern approximation of a colour that was historically
produced by a dye on a fibre under daylight; asserting identity would be false and
disrespectful to the material. This is enforced by the claims copy lint (NFR-21, F-025),
not by reviewer memory.

Similarity is reported as a percentage derived from ΔE00 against a stated scale, and the
ΔE00 value itself is always available — a percentage alone invites over-reading. The scale is
[ADR-0048](../adr/0048-similarity-percentage-is-a-stated-scale.md): `100 × 2^(−ΔE00/10)`,
uncalibrated and labelled as such. It is **monotone but not injective**, so it can never invert
the ranking and must never *be* the ranking — ΔE00 sorts, the percentage presents.

**Three candidates is a floor, enforced structurally.** `limit < 3` throws, and an index of fewer
than three records is refused at build. FR-7's "at least 3" and ADR-0031's "never asserts
identity" are the same requirement: a single answer is an identification, whatever the surface
calls it.

---

## 9. Harmony (FR-6)

Generators operate in **OKLCh**, because rotating hue in HSL produces perceptually
inconsistent results (a 30° rotation from yellow and from blue are not the same
perceptual step, and users notice even when they cannot say why).

Two families, kept explicitly distinct:

- **Geometric** — monochromatic, tonal, analogous, complementary, split, triadic,
  tetradic, neutral, near-neutral, and the contrast families. Computable from first
  principles.
- **Editorial** — curated Japanese and contemporary relationships from the corpus. Not
  derivable from geometry, which is exactly why they are valuable. Sourced, versioned and
  attributed.

Every generated colour passes gamut mapping (FR-8) before it is returned, so nothing
suggests a colour the display cannot show and the user could never buy.

---

## 10. Scoring and explanation (FR-11, FR-29, FR-32)

```
score = Σ (weightᵢ × factorᵢ)     where Σ weightᵢ = 1
```

Default weights, all of which are **content, not code** (FR-67), and versioned:

| Factor | Default |
|---|---|
| Colour harmony | 0.30 |
| Personal compatibility | 0.25 |
| Lightness balance | 0.15 |
| Chroma balance | 0.10 |
| Japanese editorial fit | 0.10 |
| Preference fit | 0.05 |
| CVD separation | 0.05 |

Every score returns its decomposition:

```ts
interface Explanation {
  readonly score: number;
  readonly factors: readonly {
    readonly factor: string;          // 'lightness-balance'
    readonly contribution: number;    // signed, in score points
    readonly direction: 'supports' | 'opposes' | 'neutral';
    readonly detail: string;          // an i18n key, never a rendered sentence
  }[];
  readonly envelope: ReproducibilityEnvelope;
}
```

`detail` is a message key rather than text. Explanations must render in English and
Japanese from the same object, and a sentence assembled at scoring time cannot.

---

## 11. Reproducibility envelope (FR-10)

```ts
interface ReproducibilityEnvelope {
  readonly engine: string;   // '1.0.0'      semver of @irodora/color-core
  readonly corpus: string;   // '2026.08.1'  immutable published corpus version
  readonly rules: string;    // '2026.08.4'  immutable published rule version
  readonly profile?: string; // 'p_01H…:v3'  profile identity and revision
}
```

Stored with every persisted recommendation. Replaying an envelope against the same inputs
reproduces the result byte-identically — asserted by a regression test that pins several
historical envelopes and re-runs them on every build.

This is what makes "why did it suggest that?" answerable six months later, and it is the
difference between a professional tool and a toy.

---

## 12. Verification

### Golden datasets

Committed under `packages/*/golden/`, each entry carrying its source:

| Set | Contents | Catches |
|---|---|---|
| `srgb-xyz` | sRGB ↔ XYZ across the gamut, **including near-black** | Transfer-function cutoff errors |
| `xyz-lab` | XYZ ↔ Lab, including the ε/κ boundary region | Piecewise-function errors |
| `oklab` | Ottosson's published reference values | Matrix transcription errors |
| `ciede2000` | All 34 Sharma–Wu–Dalal pairs | Hue discontinuity, `Rt` sign |
| `cvd` | Published confusion-line pairs | Model transcription |
| `gamut` | Known out-of-gamut colours and their mapped results | Hue drift during mapping |
| `contrast` | WCAG worked examples | Luminance formula errors |

**Changing a golden value is changing our claim about physical reality.** It requires an
ADR, not a commit message. The `color-golden` gate runs the whole set on every build.

### Property-based tests (`fast-check`)

- Round-trip: `to(from(c)) ≈ c` within tolerance, over the whole gamut
- Symmetry: `ΔE(a,b) = ΔE(b,a)`; identity: `ΔE(a,a) = 0`
- Monotonicity: increasing L\* monotonically increases relative luminance
- Bounds: every output component stays within its space's valid range
- Hue wrap: interpolation across 0°/360° takes the short arc
- Idempotence: gamut mapping an in-gamut colour changes nothing

### Cross-platform identity (NFR-3)

The same 10 000 inputs are computed in Node, in a browser via Playwright, and in React
Native on device. Serialised outputs must be **bitwise identical**. This is the test that
proves the central architectural claim, and it is the one that would catch a
platform-specific `Math` difference or an accidentally-introduced platform dependency.

### Independent oracles

`culori` and `colorjs.io` are **dev dependencies used to cross-validate our maths** and
are never shipped ([ADR-0004](../adr/0004-own-the-colour-engine-culori-as-test-oracle.md)).
Where we and an oracle disagree, we determine which is right against the published
standard before changing anything — a disagreement is a finding, not automatically our bug.

### Device colour lab (NFR-2, F-063)

Physical measurement across a reference device matrix, under controlled illuminants, with
known colour cards and real fabrics. Produces a published table of mean and p95 ΔE00 per
device, per mode, per lighting condition.

**We publish no accuracy number that does not have a row in that table behind it.** "95%
accurate" with nothing behind it is the industry norm here, and refusing to do it is part
of the product.
