/**
 * ΔE00 → a similarity percentage.
 *
 * `color-engine.md` requires that similarity is "reported as a percentage derived from ΔE00
 * against a **stated scale**, and the ΔE00 value itself is always available — a percentage alone
 * invites over-reading". This file is that stated scale
 * ([ADR-0048](../../../docs/adr/0048-similarity-percentage-is-a-stated-scale.md)).
 *
 * ## It is a definition, not a measurement
 *
 * The curve was chosen; it was not fitted to anything, and no experiment produced it. It must
 * never be described as a probability, a confidence, or a percentage of agreement — those are
 * claims about the world, and this is a presentation of a distance. `deltaE00` remains the
 * number that means something, and it is returned beside this one on every candidate.
 *
 * ## Why an exponential and not a clamped ramp
 *
 * `separationDetail` in `@irodora/cvd-engine` maps ΔE00 to a bounded score with a linear ramp
 * that saturates. That is right for its question — *are these two distinguishable at all* — and
 * wrong for this one. A ramp reads 0 for everything past its ceiling, which
 *
 * - **loses the ordering**, so two candidates ranked 4th and 40th would display identically; and
 * - **displays a legitimate third candidate as "0 % similar"**, which reads as a claim that the
 *   colour is unrelated rather than as "this is the third-closest thing we hold".
 *
 * ## It never inverts the ranking — and it is not a sort key
 *
 * The curve is monotone, so it can never put a *further* colour above a nearer one. It is **not
 * injective in float64**, though, and that distinction is load-bearing: two distinct ΔE00 values
 * close enough together map to the same `Number`, so sorting by similarity can *tie* where ΔE00
 * does not.
 *
 * A property test found this immediately — the first version of this file claimed "strictly
 * decreasing" and fast-check produced a counterexample on run 1. The claim is now the weaker,
 * true one: **monotone non-increasing, never inverting.**
 *
 * This is an argument *for* the existing design rather than against it. `deltaE00` is the
 * ranking authority (E-003) and the percentage is presentation; had similarity been used as the
 * sort key, near-identical candidates would have reordered non-deterministically depending on
 * input order. It is not, and `rank.ts` sorts on `deltaE00` with an id tiebreak.
 */

/**
 * The ΔE00 at which similarity halves.
 *
 * **Not calibrated.** No study produced this number. It is an editorial anchor: 10 is roughly
 * where two colours stop reading as variants of one another and start reading as different
 * colours, which puts 50 % at a boundary a person would recognise.
 *
 * It is deliberately NOT justified by a just-noticeable-difference figure. The nearby constant
 * in `cvd-engine/src/separation.ts` cites "~2.3", which is the classic **ΔE\*ab** JND (Mahy et
 * al. 1994) attached to a **ΔE00** threshold — two different metrics. Nothing computed there is
 * wrong, because that constant is uncalibrated too, but the rationale conflates them and this
 * file does not inherit it.
 *
 * Where it eventually belongs is versioned content alongside the rule weights (F-029), so it can
 * be changed with a version bump rather than a deploy. Not moved now: a scale tuned before any
 * consumer exists is fitted to nothing.
 */
export const SIMILARITY_HALF_LIFE_DELTA_E = 10;

/**
 * `100 × 2^(−ΔE00 / 10)`.
 *
 * - `similarityPercent(0)` is exactly `100`.
 * - Strictly decreasing, so ordering by similarity is ordering by ΔE00 reversed.
 * - Positive for every ΔE00 a real colour pair can produce (the largest attainable in CIELAB is
 *   around 150, giving ≈ 0.003 %). It underflows to 0 only far outside that range, which is
 *   noted rather than guarded — a guard would be dead code pretending to be a safety net.
 *
 * Rounding for display is the caller's, and F-022's.
 */
export function similarityPercent(deltaE00Value: number): number {
  if (!Number.isFinite(deltaE00Value) || deltaE00Value < 0)
    throw new TypeError(
      `similarityPercent: expected a finite non-negative ΔE00; got ${String(deltaE00Value)}`,
    );
  return 100 * Math.pow(2, -deltaE00Value / SIMILARITY_HALF_LIFE_DELTA_E);
}
