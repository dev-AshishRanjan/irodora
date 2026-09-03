/**
 * Solve a correction from what the camera observed to what the publisher says the card is.
 *
 * ## The fit happens in LINEAR LIGHT, and this is the whole correctness question
 *
 * A camera's response is approximately linear in *light*, and sRGB is not linear in light —
 * it has a transfer function with a linear segment near black and a power curve above it. A
 * least-squares 3×3 solved on encoded values is fitting a straight line to a curve. It
 * converges, it produces a matrix, and **the matrix is wrong everywhere**.
 *
 * An earlier draft said "wrong in the darks", and the package's own measurement contradicts it.
 * Per-patch ΔE00 of the encoded fit on the constructed card's grey ramp:
 *
 * ```
 * 0.96 → 2.729    0.62 → 1.945    0.28 → 0.834
 * 0.79 → 2.344    0.45 → 1.495    0.12 → 0.593
 * ```
 *
 * The error is **largest in the lights**. The signed L\* error is negative throughout (−1.82 to
 * −0.24), so "too dark" is right and is where the resemblance to the averaging trap ends: that
 * one is Jensen bias on a convex transform, this is model misspecification spread across the
 * range. Two different mechanisms with the same direction, and conflating them made a claim
 * about localisation that the numbers do not support.
 *
 * So both sides are linearised first, the matrix is solved there, and nothing is encoded until
 * the boundary. `test/golden/correction.golden.test.ts` asserts the difference is measurable rather than
 * theoretical — it solves the same system both ways and requires the encoded fit to be worse
 * by a margin nobody could call noise. The wrong answer is written out inside that test rather
 * than exported from here, because the wrong answer should not be importable.
 *
 * ## What the matrix absorbs, and what it does not
 *
 * The fit maps **linear capture RGB → linear sRGB**, so one matrix absorbs the camera's
 * spectral response, its white balance, and the primaries mismatch between the capture space
 * and sRGB. That is what a colour-correction matrix is for and why the capture space does not
 * need a separate conversion step.
 *
 * It does **not** absorb a per-channel gamma or a tone curve, which are non-linear. Nor does
 * it absorb a **black-level lift or veiling flare**, which is neither non-linear nor harmless:
 * it is an OFFSET, and the standard remedy for it is a 3×4 — the matrix plus a constant column
 * — rather than a polynomial. An earlier draft of this paragraph listed flare among the
 * non-linear terms and pointed at polynomials as the successor, which named the wrong fix for
 * the term whose error lands hardest on the colours this corpus is made of:
 *
 * ```
 * flare   after.mean   after.max   ΔE00 on L*≈41 grey   ΔE00 on L*≈98 grey
 * 0.002      0.122       0.850            0.85                 0.07
 * 0.005      0.298       1.988            1.99                 0.16
 * 0.010      0.571       3.625            3.63                 0.33
 * 0.020      1.066       6.287            6.29                 0.66
 * ```
 *
 * A 1 % veiling lift — routine when photographing a card indoors — costs 3.6 ΔE00 on a dark
 * patch. **A 3×4 removes it exactly**, and that is the successor this module should have.
 *
 * Whatever the model misses leaves a residual, and the residual is REPORTED rather than hidden.
 * That is the honest half — a 3×3 is a linear model of a system that is not exactly linear, and
 * the number that says how badly is the number NFR-2 will eventually be argued from.
 *
 * ## No claim is made here
 *
 * `Correction` reports mean and max ΔE00 before and after. It does not compute an
 * "improvement", does not compare against a threshold, and does not say whether the result is
 * good. NFR-2's 50 % criterion is `attested` on F-053 and discharged by F-063's device matrix
 * (ADR-0038); a function returning `improved: true` here would be this package deciding a
 * question a measurement session has not yet answered.
 */

import { deltaE00 } from '@irodora/color-difference';
import {
  CANONICAL_WHITE,
  displayP3ToLinearP3,
  linearP3ToXyz,
  linearSrgbToXyz,
  srgbToLinearSrgb,
  xyzToLab,
  xyzToLinearSrgb,
  type Triple,
} from '@irodora/color-spaces';

import { CardError, assertCard, type ReferenceCard } from './card.js';

/**
 * The space an observation arrived in.
 *
 * `linear` is for a caller that has already linearised — a raw pipeline, or a test. It is not
 * a default: a caller who does not know which of these applies has an `unknown` capture space,
 * and guessing sRGB there is the assumption `apps/mobile/src/lens/camera.ts` refuses to make.
 *
 * **`linear` is interpreted with sRGB PRIMARIES for the BEFORE residual**, and a raw pipeline's
 * linear RGB is in camera-native primaries. That is defensible — `before` is by definition the
 * uncorrected interpretation, and the primaries are part of what has not been corrected — but
 * it is an interpretation rather than a fact, and it is stated here because `space` is a
 * persisted audit value and somebody will read that column back.
 */
export const OBSERVED_SPACES = ['srgb', 'display-p3', 'linear'] as const;
export type ObservedSpace = (typeof OBSERVED_SPACES)[number];

/** What the camera read for one patch. */
export interface Observation {
  /** Must match a `ReferencePatch.id` on the card. */
  readonly id: string;
  /** The observed RGB, in `space`. */
  readonly rgb: Triple;
}

/** A 3×3 matrix, row-major. */
export type Matrix3 = readonly [Triple, Triple, Triple];

/** A mutable row, for the accumulators. `Triple` is readonly and these are summed in place. */
type Row = [number, number, number];

/** How far the corrected patches still are from the published values. */
export interface Residual {
  /** Mean ΔE00 across the patches. */
  readonly mean: number;
  /** The worst single patch. A good mean with a terrible max is a card half in shadow. */
  readonly max: number;
}

/**
 * How many observations the fit had left over after determining its nine unknowns.
 *
 * `patchCount × 3 − 9`. **At zero, `after` is not evidence** — a 3-patch fit reproduces its
 * three patches exactly and reports a residual of ~1e-14 for a matrix that may be arbitrarily
 * wrong about every colour that was not on the card. Measured: a 3-patch fit reports
 * `after.mean = 1.5e-14` and is 0.482 ΔE00 out on a fourth colour.
 *
 * It is on the `Correction` and in the database because the doc comment saying so was not
 * enough: the store would otherwise persist that 1.5e-14 and an audit surface would render
 * "0.00 ΔE00 after correction" for a fit with nothing to check it. Review caught this as an
 * over-claim produced by this package's own return value.
 */
export type DegreesOfFreedom = number;

/** A solved correction, and everything an audit needs to reproduce it. */
export interface Correction {
  /** Linear capture RGB → linear sRGB. */
  readonly matrix: Matrix3;
  /** The space the observations were given in, so the matrix's input is not ambiguous. */
  readonly space: ObservedSpace;
  readonly cardId: string;
  /** How many patches the fit used. */
  readonly patchCount: number;
  /** `patchCount × 3 − 9`. Zero means `after` is arithmetic rather than evidence. */
  readonly degreesOfFreedom: DegreesOfFreedom;
  /** ΔE00 of the observations against the published values, BEFORE correction. */
  readonly before: Residual;
  /** ΔE00 after. Not compared to `before`, and not judged. */
  readonly after: Residual;
}

/** Thrown when a correction cannot be solved at all, as opposed to solved badly. */
export class CorrectionError extends Error {
  constructor(detail: string) {
    super(`correction: ${detail}`);
    this.name = 'CorrectionError';
  }
}

/**
 * Three observations is the mathematical floor, not a recommendation.
 *
 * A 3×3 has nine unknowns and each patch supplies three equations, so three independent
 * patches determine it exactly — with no degrees of freedom left, which means **no residual**,
 * which means the fit cannot tell you it is wrong. A real card has far more, and the extra
 * patches are what make `after` informative rather than decorative.
 */
export const MINIMUM_PATCHES = 3;

/** Linearise one observation into the space the fit happens in. */
function linearise(rgb: Triple, space: ObservedSpace): Triple {
  if (space === 'linear') return rgb;
  if (space === 'srgb') return srgbToLinearSrgb(rgb);
  // Display P3 shares sRGB's transfer function but not its primaries. Linearising with the
  // right curve is this step's job; the primaries difference is what the matrix absorbs.
  return displayP3ToLinearP3(rgb);
}

/** The observation's XYZ, for the BEFORE residual — before any correction exists. */
function observedXyz(rgb: Triple, space: ObservedSpace): Triple {
  const linear = linearise(rgb, space);
  return space === 'display-p3' ? linearP3ToXyz(linear) : linearSrgbToXyz(linear);
}

/**
 * Solve `A x = b` for a symmetric 3×3 by Gaussian elimination with partial pivoting.
 *
 * Partial pivoting is not optional decoration: without it a zero on the diagonal divides by
 * zero, and a small one amplifies rounding into the answer. `A` here is `Σ oᵢoᵢᵀ`, which is
 * badly scaled whenever the patches are clustered — which is exactly the case a card in poor
 * light produces.
 */
function solve3(a: readonly Triple[], b: Triple): Triple | null {
  const m = [
    [a[0]?.[0] ?? 0, a[0]?.[1] ?? 0, a[0]?.[2] ?? 0, b[0]],
    [a[1]?.[0] ?? 0, a[1]?.[1] ?? 0, a[1]?.[2] ?? 0, b[1]],
    [a[2]?.[0] ?? 0, a[2]?.[1] ?? 0, a[2]?.[2] ?? 0, b[2]],
  ];

  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1)
      if (Math.abs(m[row]?.[column] ?? 0) > Math.abs(m[pivot]?.[column] ?? 0)) pivot = row;

    const pivotRow = m[pivot];
    const currentRow = m[column];
    if (pivotRow === undefined || currentRow === undefined) return null;
    m[pivot] = currentRow;
    m[column] = pivotRow;

    const head = m[column]?.[column] ?? 0;
    // Exactly zero means the observations do not span three dimensions — every patch the same
    // colour, or three that are collinear in RGB. There is no correct matrix to return.
    if (head === 0 || !Number.isFinite(head)) return null;

    for (let row = column + 1; row < 3; row += 1) {
      const factor = (m[row]?.[column] ?? 0) / head;
      for (let k = column; k < 4; k += 1) {
        const target = m[row];
        if (target === undefined) return null;
        target[k] = (target[k] ?? 0) - factor * (m[column]?.[k] ?? 0);
      }
    }
  }

  const x: number[] = [0, 0, 0];
  for (let row = 2; row >= 0; row -= 1) {
    let sum = m[row]?.[3] ?? 0;
    for (let column = row + 1; column < 3; column += 1)
      sum -= (m[row]?.[column] ?? 0) * (x[column] ?? 0);
    const head = m[row]?.[row] ?? 0;
    if (head === 0) return null;
    x[row] = sum / head;
  }

  if (!x.every((value) => Number.isFinite(value))) return null;
  return [x[0] ?? 0, x[1] ?? 0, x[2] ?? 0];
}

/** Apply a correction matrix to a linear RGB triple. */
export function applyMatrix(matrix: Matrix3, rgb: Triple): Triple {
  return [
    matrix[0][0] * rgb[0] + matrix[0][1] * rgb[1] + matrix[0][2] * rgb[2],
    matrix[1][0] * rgb[0] + matrix[1][1] * rgb[1] + matrix[1][2] * rgb[2],
    matrix[2][0] * rgb[0] + matrix[2][1] * rgb[1] + matrix[2][2] * rgb[2],
  ];
}

/**
 * Apply a correction to an observed value, in the space it was observed in.
 *
 * **Nothing clamps.** A corrected value outside `[0, 1]` is a colour the display cannot show,
 * and reporting it as `1.0` would silently turn an out-of-gamut result into an in-gamut claim.
 * `gamutMap` in `@irodora/color-spaces` is where that decision belongs, made deliberately by a
 * caller who knows what the value is for.
 */
export function applyCorrection(correction: Correction, rgb: Triple): Triple {
  return applyMatrix(correction.matrix, linearise(rgb, correction.space));
}

/** ΔE00 between two XYZ values, under the card's own white. */
function difference(a: Triple, b: Triple, white: Triple): number {
  return deltaE00(xyzToLab(a, white), xyzToLab(b, white));
}

/** Mean and max over a list, with the empty case impossible by construction. */
function residual(values: readonly number[]): Residual {
  const total = values.reduce((sum, value) => sum + value, 0);
  return { mean: total / values.length, max: Math.max(...values) };
}

/**
 * Solve the correction.
 *
 * Every observation must name a patch the card publishes; an id that does not match is an
 * error rather than a skipped row, because a quietly-dropped patch changes the fit and nobody
 * would see it happen.
 */
export function solveCorrection(
  observations: readonly Observation[],
  card: ReferenceCard,
  space: ObservedSpace,
): Correction {
  assertCard(card);

  /*
   * The card's values must already be under the engine's white. Adapting here would mean
   * choosing an adaptation method inside a correction solver — see `ReferenceCard.white`.
   */
  const drift = Math.max(
    ...card.white.map((value, index) => Math.abs(value - (CANONICAL_WHITE[index] ?? 0))),
  );
  if (drift > 1e-6)
    throw new CardError(
      `the card's values are relative to a white point that is not this engine's canonical ` +
        `one (largest component difference ${drift.toExponential(2)}). Adapt them first with ` +
        '`adapt` from @irodora/color-spaces — which adaptation method is a decision this ' +
        'solver must not make silently.',
    );

  const byId = new Map(card.patches.map((patch) => [patch.id, patch]));
  const paired = observations.map((observation) => {
    const patch = byId.get(observation.id);
    if (patch === undefined)
      throw new CorrectionError(
        `observation "${observation.id}" names no patch on card "${card.id}". A dropped patch ` +
          'changes the fit, so this is an error rather than a row to skip.',
      );
    for (const component of observation.rgb)
      if (!Number.isFinite(component))
        throw new CorrectionError(`observation "${observation.id}" has a non-finite component`);
    return { observation, patch };
  });

  const seen = new Set<string>();
  for (const { observation } of paired) {
    if (seen.has(observation.id))
      throw new CorrectionError(`patch "${observation.id}" was observed twice`);
    seen.add(observation.id);
  }

  if (paired.length < MINIMUM_PATCHES)
    throw new CorrectionError(
      `${String(paired.length)} patch(es) cannot determine a 3x3 — ${String(MINIMUM_PATCHES)} ` +
        'independent observations are the floor, and at the floor there is no residual left ' +
        'to tell you the fit is wrong.',
    );

  const sources = paired.map(({ observation }) => linearise(observation.rgb, space));
  const targets = paired.map(({ patch }) => xyzToLinearSrgb(patch.xyz));

  /*
   * The normal equations, written out rather than looped.
   *
   * `gram` is `Σ oᵢoᵢᵀ` and is shared across the three output channels; only the right-hand
   * side differs. Three explicit rows instead of `for (i) for (j)` because indexing a `Triple`
   * with a loop variable is `number | undefined` under `noUncheckedIndexedAccess`, and the
   * `?? 0` that silences it would be a silent zero in the middle of a least-squares fit —
   * exactly the kind of plausible wrong answer this zone exists to refuse.
   */
  const gram: [Row, Row, Row] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const [s0, s1, s2] of sources) {
    gram[0][0] += s0 * s0;
    gram[0][1] += s0 * s1;
    gram[0][2] += s0 * s2;
    gram[1][0] += s1 * s0;
    gram[1][1] += s1 * s1;
    gram[1][2] += s1 * s2;
    gram[2][0] += s2 * s0;
    gram[2][1] += s2 * s1;
    gram[2][2] += s2 * s2;
  }

  const rows: Triple[] = [];
  for (const channel of [0, 1, 2] as const) {
    const b: Row = [0, 0, 0];
    for (const [index, source] of sources.entries()) {
      const target = targets[index];
      if (target === undefined) continue;
      const weight = target[channel];
      b[0] += weight * source[0];
      b[1] += weight * source[1];
      b[2] += weight * source[2];
    }
    const row = solve3(gram, b);
    if (row === null)
      throw new CorrectionError(
        'the observations do not span three dimensions — every patch read as the same colour, ' +
          'or they are collinear in RGB. That is a card not in frame, not a fit to improve.',
      );
    rows.push(row);
  }

  const matrix: Matrix3 = [rows[0] ?? [0, 0, 0], rows[1] ?? [0, 0, 0], rows[2] ?? [0, 0, 0]];

  const before = paired.map(({ observation, patch }) =>
    difference(observedXyz(observation.rgb, space), patch.xyz, card.white),
  );
  const after = paired.map(({ observation, patch }) =>
    difference(
      linearSrgbToXyz(applyMatrix(matrix, linearise(observation.rgb, space))),
      patch.xyz,
      card.white,
    ),
  );

  return {
    matrix,
    space,
    cardId: card.id,
    patchCount: paired.length,
    degreesOfFreedom: paired.length * 3 - 9,
    before: residual(before),
    after: residual(after),
  };
}
