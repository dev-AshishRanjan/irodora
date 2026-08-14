/**
 * Chromatic adaptation — CAT16 by default, Bradford available.
 *
 * A colour measured under a warm bulb and the same fabric measured in daylight have different
 * XYZ. Adaptation is what makes them comparable, and it is why the Lens can say two garments
 * match when they were photographed in different rooms.
 *
 * The construction is von Kries in a cone-response space: convert both white points and the
 * colour into LMS, scale each channel by the ratio of the destination white to the source
 * white, convert back. The only choice is which cone matrix, and the two here are the two
 * that get used:
 *
 * - **CAT16** (Li et al. 2017, CIECAM16) is the default. It replaced CAT02, which could
 *   produce negative tristimulus values for saturated colours near the spectral locus.
 * - **Bradford** is available because it is what most other software uses. Being able to
 *   reproduce someone else's number is worth having even when our own default is better —
 *   and when a professional user's colorimeter software disagrees with us, the first question
 *   is which transform each side used.
 *
 * `adaptationMatrix` is exported separately from `adapt` because the corpus build (F-011)
 * adapts thousands of entries between the same pair of white points, and recomputing the
 * composition per entry would be the same nine multiplies done thousands of times — while
 * also giving results that depend on how many times the matrix was rebuilt.
 */

import { applyMatrix3, multiplyMatrix3 } from './numeric.js';
import {
  LMS_TO_XYZ_BRADFORD,
  LMS_TO_XYZ_CAT16,
  XYZ_TO_LMS_BRADFORD,
  XYZ_TO_LMS_CAT16,
} from './matrices.js';
import type { Matrix3, Xyz } from './types.js';

/** Which cone-response space the von Kries scaling happens in. */
export type AdaptationMethod = 'cat16' | 'bradford';

/** The default. Named rather than repeated, so changing it is one edit and one ADR. */
export const DEFAULT_ADAPTATION: AdaptationMethod = 'cat16';

const CONE_MATRICES: Record<
  AdaptationMethod,
  { readonly toLms: Matrix3; readonly toXyz: Matrix3 }
> = {
  cat16: { toLms: XYZ_TO_LMS_CAT16, toXyz: LMS_TO_XYZ_CAT16 },
  bradford: { toLms: XYZ_TO_LMS_BRADFORD, toXyz: LMS_TO_XYZ_BRADFORD },
};

const sameWhite = (a: Xyz, b: Xyz): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/**
 * The composed XYZ → XYZ matrix that adapts `from` to `to`.
 *
 * The diagonal is computed here rather than stored, and that is not a violation of "inverses
 * are stored explicitly": a diagonal of three ratios is three divisions with no cancellation,
 * whereas a matrix inverse is a determinant and nine cofactors whose rounding depends on the
 * order of operations. The cone matrices themselves — the parts that would be inverted — are
 * both transcribed.
 */
export function adaptationMatrix(
  from: Xyz,
  to: Xyz,
  method: AdaptationMethod = DEFAULT_ADAPTATION,
): Matrix3 {
  const { toLms, toXyz } = CONE_MATRICES[method];

  const source = applyMatrix3(toLms, from);
  const destination = applyMatrix3(toLms, to);

  const scale: Matrix3 = [
    destination[0] / source[0],
    0,
    0,
    0,
    destination[1] / source[1],
    0,
    0,
    0,
    destination[2] / source[2],
  ];

  return multiplyMatrix3(toXyz, multiplyMatrix3(scale, toLms));
}

/**
 * Adapt one colour from one white point to another.
 *
 * Adapting to the same white point returns the input **unchanged**, bit for bit. Without the
 * short circuit it would return the input passed through `M⁻¹ · I · M`, which is the identity
 * in arithmetic and 1 part in 10^16 away from it in float64 — enough to make a no-op show up
 * as a difference in the cross-platform identity digest (NFR-3), and enough to make "adapt
 * everything to D65 on load" quietly perturb a corpus that was already D65.
 */
export function adapt(
  xyz: Xyz,
  from: Xyz,
  to: Xyz,
  method: AdaptationMethod = DEFAULT_ADAPTATION,
): Xyz {
  if (sameWhite(from, to)) return xyz;
  return applyMatrix3(adaptationMatrix(from, to, method), xyz);
}
