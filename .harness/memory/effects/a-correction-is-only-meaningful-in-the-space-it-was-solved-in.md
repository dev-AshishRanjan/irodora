---
kind: effect
title: A correction is only meaningful in the space it was solved in, and nine coefficients do not say which
category: contract
confidence: 0.95
created: 2026-09-03
scope: [packages/color-calibration, apps/mobile, packages/store]
links: [[provenance-in-the-type-is-what-makes-honesty-structural]], [[a-declared-pair-of-slugs-is-a-claim-about-published-values]], [[a-journey-nothing-runs-is-a-file-nothing-checks]]
---

# E-056 — the capture space travels with the matrix, or the matrix is a wrong answer

**`color-calibration/src/solve.ts#Correction` → `apps/mobile/src/lens/calibration.ts` ·
`packages/store/src/schema.ts` · both test suites · ADR-0087 · `gate:test`**

## What the matrix cannot tell you about itself

A correction maps **linear capture RGB → linear sRGB**. Getting the input into "linear capture
RGB" requires two facts that the nine coefficients do not contain:

| fact | what gets it wrong |
|---|---|
| the transfer function | sRGB's curve applied to already-linear values, or not applied at all |
| the primaries | Display P3 values read as sRGB |

Both produce a **plausible colour**. Neither throws, neither is out of range, and the error is
largest in the saturated hues this product exists for and smallest on the greys where somebody
might notice. It is the same failure shape `readCaptureSpace` in `lens/camera.ts` was written
to refuse — *"a P3 frame interpreted as sRGB is wrong in exactly the colours we care most
about"* — arriving one layer down.

So `space` travels with the matrix everywhere it goes:

- on the `Correction` object, set at solve time and never inferred;
- through `calibrate()`, which **refuses** a reading whose space differs from the correction's;
- into the database as `calibration.space`, a `CHECK`ed column rather than free text.

## The `unknown` case is the one that costs something

A camera that will not report its capture space **cannot be calibrated at all**. That is a real
limitation: calibrated scan does not work on every device, and the devices that decline to say
are not rare.

The alternative was assuming sRGB, and it is worse than not correcting. Linearising with the
wrong curve does not produce a smaller error than leaving the reading alone — it produces a
confident one, labelled `calibrated`, which is the label the claims lint treats as permitted
near the word "measured". A wrong answer that has been promoted.

## The second half is the claim, not the colour

`calibrated` is one of two `MeasurementSource` values the claims lint allows near "measured"
(F-025, NFR-21, ADR-0031). Anything that widens what may carry that label widens what the
product may say — which is why the refusals above are structural rather than advisory.

**The confidence deliberately does not move with the label**
([ADR-0087](../../../docs/adr/0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md)).
The label describes the **method**; the confidence describes the **quality**. Raising it because
`source` became `calibrated` would assert NFR-2's improvement, which is `attested` on F-053 and
discharged by F-063's device matrix — a measurement nobody has taken. What is recorded instead
is the **residual**, which is per-reading and can say that one particular correction went badly
where a ceiling could not.

## What the guards actually catch

`gate:typecheck` — `ObservedSpace` has no `unknown` member, so the app's mapping from
`CaptureSpace` has to return `null` and the caller has to handle it. `gate:test` — the two
refusals in `apps/mobile/test/calibration.test.ts`, and the `CHECK (space IN (...))` in
`packages/store/test/calibration.test.ts`, which has a decoy row proving the constraint is what
rejects the bad ones rather than a malformed `INSERT`.

**What no guard here catches:** that the space the platform *reported* is the space the frame
was actually in. That is a claim about the camera, and it is F-063's device matrix.
