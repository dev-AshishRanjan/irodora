# ADR-0061 — NFR-3 guarantees the observable value, not the double

## Status

Accepted

## Date

2026-08-24

## Context

NFR-3 said: *"Same inputs + same versions → identical outputs on every platform"*, verified by
*"a cross-platform test … asserts bitwise equality of the serialised output"*.
[`AGENTS.md`](../../AGENTS.md) calls it **"the one guarantee that cannot bend"**.

**It is false, and it cannot be made true by anything short of replacing the standard
library.** The first CI run that reached gate 4 measured it:

| | |
|---|---|
| Whole-run digest | `9801fa1ab561ec61` (Linux) vs `31d18557233bbe42` (Windows) |
| Node version | **24.19.0 on both** — pinned by `.nvmrc` |
| Metrics affected | 8 of 8 |
| Conversion stages affected | 12 of 12 |
| Samples affected | ~0.2 % (13–19 of 100 chunks contain one) |
| **Magnitude** | **2 ULP (`apcaLc(black, c)`), 4 ULP (`apcaLc(white, c)`)** |

Four ULP at Lc ≈ 26.5 is **1.4 × 10⁻¹⁴** — the fifteenth significant digit.

ECMAScript specifies `Math.pow`, `Math.cbrt`, `Math.atan2`, `Math.sin`, `Math.cos` and
`Math.exp` as **implementation-approximated**. Node ships Windows builds compiled with MSVC
and Linux builds with GCC/Clang. `srgbToLinear` is `Math.pow(x, 2.4)`, and it is upstream of
every metric — through `srgbToXyz` to Lab, Oklab and every ΔE, and directly inside
`wcagContrast` and `apcaLc`. There is no arrangement of our code that avoids it.

Meanwhile a permanently red gate is a gate nobody reads, and since F-080 it also blocked every
release: `release.yml` calls `ci.yml`, and gate 4 stopped it.

**The repository had already answered this question once, correctly, somewhere else.**
[`verify-content.mjs`](../../scripts/verify-content.mjs) compares a published corpus bundle
against the current engine: **exact** on `hex`, `inSrgbGamut` and `lightnessOutOfRange` — the
quantised outputs — and `Math.abs(a - b) > 1e-12` on `lab`, `lch`, `oklch` and `rgb`. That
tolerance is roughly a thousand times the noise measured above, which is why gate 11 passes on
Linux and why **the corpus was never at risk.** Only NFR-3's wording never caught up.

## Decision

**NFR-3 guarantees the value a person can observe, not the double behind it.**

1. **The canonical digest is the gate.** Every metric is rounded to the product's display
   precision — two decimal places — and *that* is digested and asserted **exactly**. It is
   what NFR-3 now promises: what the product shows is identical on every platform.
2. **The raw double digest is recorded and reported, never asserted.** It is printed on every
   run so a change is visible, because a change is interesting even when it is not a defect.
3. **Two decimal places is a correctness property, not a preference.** Rounding does not
   remove a disagreement, it moves it: two values `d` apart differ after rounding to a grid
   `g` only if they straddle a boundary, with probability `d/g`. At 2 dp that is
   4×10⁻¹⁵/10⁻² ≈ 4×10⁻¹³ per value, or 3×10⁻⁸ across the whole run. **At 12 significant
   digits — the obvious choice — it would be 10⁻³ per value and the digest would differ
   constantly.** Coarse rounding works; fine rounding does not.
4. **A ULP bound is the magnitude tripwire.** Every one of 500 probes must agree with the
   committed value to within **16 ULP**. Observed worst is 4. The bound leaves room for a
   different libm and none for anything a person could see.
5. **Correctness is still gated exactly, elsewhere and unchanged.** Gate 5's six cited
   datasets check the engine against published references with their own tolerances. This
   decision is about *determinism*, and nothing here relaxes *accuracy*.

## Consequences

**Good.** The gate is green and can still go red — the only state in which it is worth
having. Releases are unblocked. The guarantee the product makes is now one it keeps, which
golden rule 11 requires and the old wording did not. The canonical digest is a *better*
regression test for anything user-visible than the raw digest was, because a raw-digest
failure could not distinguish "the engine changed" from "the runner is Linux today".

**Bad.**

- **A deliberate engine change smaller than 0.005 in every displayed metric, affecting only
  samples outside the 500 probes, is no longer caught here.** Gate 5's golden datasets are
  what catch a change that small, and they compare against published references rather than
  against ourselves.
- **The ULP bound is a judgement.** 16 is comfortably above 4 and far below anything visible,
  and it is still a number somebody chose.
- **The probes cover 5 % of the run exactly.** A divergence confined to the other 95 % is
  visible in the chunk counts but its magnitude is not measured.
- **"Two decimal places" ties the gate to a display decision.** If the product ever shows more
  precision, this must be revisited — and the straddle arithmetic above is what decides
  whether the new precision is safe.

**Neutral.** F-006's and F-039's attestations are re-scoped rather than discharged: the
browser and Hermes legs still owe a run, and what they will be asked to reproduce is now the
canonical digest.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Ship deterministic transcendentals** — our own `pow`, `cbrt`, `atan2`, `sin`, `cos`, `exp` | The only thing that makes bitwise identity literally true. Correctly-rounded elementary functions are a research-grade undertaking, they would be slower than the engine's own budget allows, and the entire benefit is agreement in a digit no output carries. Revisit only if a real defect is traced to this |
| **Leave the gate red** | The purist reading, and it is what was happening. It blocks every release and teaches people to read past a failure, which is worse than the risk being accepted deliberately |
| **Assert a tolerance on the raw digest** | Not possible: a digest has no metric. Tolerance requires value-by-value comparison, which is why the ULP bound is over probes and the digest is over canonical values |
| **Round to 12 significant digits and digest that** | The instinctive choice, and wrong. The straddle probability is ~10⁻³ per value, so the digest would differ constantly and we would have replaced one flaky gate with another |
| **Commit all 80 000 values and compare with a tolerance** | Airtight, and a ~2.5 MB fixture regenerated as a 2.5 MB diff. The probes give the same answer at 5 % of the size; revisit if the sampled coverage ever proves inadequate |
| **Pin one platform for all builds** | Would make the digest reproduce — by never testing the claim. NFR-3 exists because the engine runs in Node, a browser and Hermes, and a guarantee verified on one of them is not verified |

## Revisit when

- **The product displays more than two decimal places** of any metric. The straddle
  arithmetic in §3 decides whether the new precision is still safe.
- **A ULP bound is exceeded.** That is not platform noise and needs explaining before it is
  accepted.
- **The Hermes leg runs** (F-039). A JavaScript engine that is not V8 may diverge by more than
  4 ULP, and if it exceeds 16 this decision needs re-costing against deterministic
  implementations.
- **A defect is ever traced to floating-point disagreement** rather than to arithmetic we
  wrote. Nothing so far suggests it, and it would change the calculus entirely.
