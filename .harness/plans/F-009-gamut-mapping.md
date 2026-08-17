# Plan: F-009 — Gamut mapping

| | |
|---|---|
| **Feature** | F-009 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/color-spaces` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-15 |

---

## Intent

A colour that does not fit the display's gamut has to become one that does, and the choice
of *which* in-gamut colour is a product decision. Clipping each RGB channel independently —
the default everywhere — changes hue: Display-P3 red clipped to sRGB is a different red, not
a duller one. **Reducing chroma in OKLCh holds hue and lightness and gives up only
colourfulness**, which is the one axis a user forgives.

To a user this is the difference between "that green is a bit less vivid on this screen" and
"that green is now yellow" — on a product whose entire claim is that the colour is right.

---

## What has to be true before writing any code

**The engine deliberately does not clamp.** `xyzToSrgb` returns `[1.093, −0.227, −0.150]`
for Display-P3 red, and `rgb.ts` says in as many words that F-009 needs the real value to
know how far outside the colour is. So the input to this feature is already correct and
nothing upstream needs changing.

**`deltaEok` lives in `@irodora/color-difference`, which depends on this package.** That is
the constraint that shapes the design, and it is worth stating before it looks like an
oversight — see *Approach*.

---

## Approach

**Reused.** `oklchToXyz`, `xyzToOklch`, `xyzToSrgb`, `xyzToDisplayP3`, `srgbToXyz`,
`displayP3ToXyz` — every conversion is the engine's. This feature adds **no colour maths**;
it adds a search over a predicate.

**New**, all in `packages/color-spaces/src/gamut.ts`:

- `isInGamut(rgb, epsilon)` — the predicate. One place, because "in gamut" with a tolerance
  is exactly the kind of thing that gets re-decided differently in three call sites.
- `gamutMap(xyz, space)` — chroma bisection in OKLCh, holding `L` and `H`.
- `Gamut` — the target space (`srgb` | `display-p3`), so the same function serves both.
- `GAMUT_EPSILON`, `GAMUT_BISECTION_STEPS` — named, so the bounds are stated rather than
  implied by a loop.

**The algorithm, and the one deviation from CSS Color 4.**

CSS Color 4 §13.2 specifies chroma bisection **plus MINDE**: at each step it compares the
reduced-chroma colour against its channel-clipped self using `deltaEok`, and stops early
once they are within a just-noticeable difference, which returns slightly more chroma than
pure bisection.

**We implement the bisection and not the MINDE step**, because `deltaEok` is in
`@irodora/color-difference` and that package depends on this one. The alternatives are worse:
re-deriving Euclidean OKLab distance here is a second implementation of a shipped function —
a defect by definition under `AGENTS.md` §7 — and moving `gamutMap` into `color-difference`
contradicts the package recorded in `feature_list.json` and puts a *mapping* operation in a
*metrics* package.

This is a deviation from a documented default, so it lands as an **ADR with the difference
measured**, not as a silent simplification. The measurement is part of the deliverable: how
far our result sits from `colorjs.io`'s `toGamut({ method: 'css' })`, in ΔE00 and in chroma,
across the out-of-gamut set. If that difference turns out to be large, the ADR is where the
decision gets re-argued rather than where it gets buried.

**Increments.** Each leaves the build green.

1. `isInGamut` + the `Gamut` type + tests, including the near-boundary cases.
2. `gamutMap` by bisection, with L and H preservation asserted exactly.
3. Golden dataset, cross-checked against `culori` and `colorjs.io`.
4. Property tests: idempotence, in-gamut identity, hue and lightness preservation.
5. The ADR, with the measured MINDE difference.
6. Gate 5 entry, records, effects.

---

## Files to touch

```
packages/color-spaces/src/gamut.ts           — new
packages/color-spaces/src/index.ts           — exports
packages/color-spaces/src/rgb.ts             — comment only: F-009 exists now
packages/color-spaces/golden/gamut.golden.json    — new dataset
packages/color-spaces/test/golden/gamut.test.ts   — golden + oracle cross-check
packages/color-spaces/test/gamut.test.ts          — unit and property
docs/adr/00NN-gamut-mapping-is-chroma-bisection-without-minde.md — new
.harness/verification/gates.json             — gate 5's description gains the dataset
```

---

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **A new public function in `@irodora/color-spaces`** | every dependent: color-difference, cvd-engine, design-tokens | `pnpm build` + `verify-engine-purity.mjs`. Additive, so nothing breaks |
| **`gamutMap` becomes the definition of "the closest displayable colour"** | F-014 requires every generated harmony colour to pass through it; F-064 extraction; any P3→sRGB fallback | **A new effect link is owed** — this is a shared definition with no import edge to see it, the same shape as E-003 (ΔE00 as ranking authority) and E-005 (one separation score). To be added in the effect-trace step, not assumed |
| **`GAMUT_EPSILON`** | anything asking "is this displayable" | One exported constant; a second local tolerance elsewhere is the failure mode |

**No existing golden value changes.** This feature reads the conversions; it does not touch
them. If a gate-5 dataset moves, I broke something.

---

## Test plan

- **Golden.** Out-of-gamut colours whose mapped result is checkable: the Display-P3 and
  Rec.2020 primaries into sRGB, and OKLCh coordinates well outside any RGB gamut. Derivation
  is `published-formula` — the gamut boundary is defined by the conversion matrices, and each
  entry shows the arithmetic. Cross-checked against **both** oracles, so a transcription error
  in the fixture is caught separately from an implementation error
  [[two-oracles-agreeing-against-you-is-evidence-about-you]].
- **Property.**
  - *Idempotence*: `gamutMap(gamutMap(c)) === gamutMap(c)`, bit-identical, over stratified
    samples. This is acceptance criterion 2.
  - *In-gamut identity*: an in-gamut colour comes back unchanged.
  - *Hue and lightness*: preserved within a **stated** bound. Not "approximately" — the bound
    is measured, exported and asserted, because the final clamp perturbs both slightly and a
    silent tolerance is where this kind of feature rots.
  - *Monotone*: more out-of-gamut in, no more chroma out.
- **Negative — with decoys.**
  - **Per-channel clipping must fail the hue test.** The wrong algorithm, implemented in the
    test, asserted to shift hue by a measured amount on P3 red. Without it, "we preserve hue"
    is untested — nothing distinguishes it from clipping until something is clipped.
    [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
  - A mapped colour asserted **in** gamut afterwards; an unmapped one asserted **out**, so
    the predicate is not vacuous.
  - Bisection step count asserted, so a future "optimisation" to a coarser loop is loud.
- **Not applicable.** e2e, a11y, contrast, cvd — no surface and no new pairing.

---

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:golden && pnpm build
```

Evidence: the pass line for each, the golden entry count, the measured hue/lightness bound,
the measured difference from CSS Color 4 MINDE, and the decoy's exit status **with the
baseline beside it** [[a-decoy-that-is-not-broken-proves-nothing]].

Gate 9 and 10 must stay green — they are blocking now and this package is under them.

---

## Risks and open questions

- **The MINDE deviation is the whole risk.** If the measured difference is perceptible, the
  right answer may be to move `gamutMap` to `color-difference` after all, or to move
  `deltaEok` down into `color-spaces` as a geometric primitive. **Measure first, then decide,
  then write the ADR** — in that order, and record the number either way.
- **The engine's `xyzToOklch` returns NaN hue for achromatic input** (`atan2(0, 0)` is 0, but
  chroma 0 makes hue meaningless). A grey that is out of gamut only in lightness has no hue to
  preserve. Handle explicitly rather than letting NaN propagate into a bisection bound.
- **A colour can be out of gamut in lightness, not chroma** — `L > 1` has no chroma reduction
  that helps. Reducing chroma to 0 and still failing must be a defined outcome, not a loop
  that exits on step count and returns something arbitrary.
- **No `OQ-*` blocks this feature.**

---

## Out of scope

- Perceptual gamut mapping that moves lightness (CUSP, HPMINDE). Chroma reduction is what
  FR-8 and the acceptance criteria specify.
- Rec.2020 or CMYK as *target* gamuts. `Gamut` is an enum so adding one is additive; adding
  one now is scope nobody reviewed against a requirement.
- Applying `gamutMap` anywhere. F-014 is the first consumer; wiring it here would be building
  a caller that does not exist yet.
