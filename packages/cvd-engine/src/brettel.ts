/**
 * Brettel, Viénot & Mollon (1997) — dichromacy.
 *
 * The total absence of one cone class: protanopia, deuteranopia, tritanopia. Rarer than the
 * anomalous trichromacy `machado.ts` models, and the harder case — a dichromat's colour space
 * is genuinely two-dimensional, so simulation is a **projection**, not a distortion.
 *
 * ## The construction
 *
 * A dichromat cannot distinguish any two colours lying on a line through their *copunctal
 * point* — the missing cone's fundamental, in chromaticity terms. Brettel's method projects
 * the colour onto the half-plane spanned by the white point and one of two anchor stimuli,
 * choosing the half by which side of the neutral axis the colour falls on.
 *
 * **Two half-planes, not one.** Viénot's 1999 simplification collapses this to a single plane
 * and publishes two 3×3 matrices, which is accurate for protanopia and deuteranopia because
 * their two half-planes are nearly coplanar. **It is not accurate for tritanopia**, whose
 * half-planes diverge substantially — a single-plane tritan simulation is a different
 * algorithm wearing this one's name.
 *
 * **What is implemented here is Viénot's simplification, for protan and deutan only.** Tritan
 * throws. The full two-half-plane Brettel construction is not written yet, and the honest
 * shape of that is a function that refuses rather than one that returns the nearest plausible
 * answer — a silently-wrong tritan simulation would feed the separation score and produce an
 * accessibility claim nobody could trace back to its cause.
 *
 * ## Why it is not written yet — a negative result, measured
 *
 * The construction needs the **anchor stimuli**: the LMS coordinates of monochromatic lights
 * at 475 and 575 nm (protan, deutan) and 485 and 660 nm (tritan). An attempt was made using
 * recalled values, and it was refuted by two checks rather than shipped:
 *
 * 1. **Against Viénot**, which is the published *single-plane reduction of Brettel* and
 *    therefore a real oracle for protan and deutan: worst disagreement **32.5 ΔE00** (protan)
 *    and **57.4 ΔE00** (deutan), concentrated on blues.
 * 2. **The diagnostic that explains it.** Viénot's simplification is valid precisely because
 *    the two half-planes are nearly coplanar. With the recalled anchors the angle between the
 *    half-plane normals is **88.4°**, where the claim requires ≈0°. The anchors are wrong, or
 *    in a normalisation inconsistent with this white point.
 *
 * **They cannot be derived here.** Computing LMS at a wavelength needs CIE colour-matching
 * functions, and there is no spectral data anywhere in the dependency tree — nor any Brettel
 * implementation in `culori` or `colorjs.io` to check against.
 *
 * So finishing this needs one of: vendoring CIE colour-matching functions (a content and
 * licensing decision, `content/AGENTS.md`), a trustworthy transcription of Brettel's published
 * anchor table, or attesting the criterion under ADR-0038. **That is a decision, not a coding
 * task**, which is why the function refuses rather than approximating.
 *
 * The one thing now certain is the fundamental set: **Smith–Pokorny**, which reproduces all
 * three published copunctal points (protan 0.0007, deutan 0.0002, tritan 0.0048) where
 * Hunt–Pointer–Estévez reproduces only tritan.
 *
 * ## What checks it
 *
 * Neither `culori` nor `colorjs.io` implements Brettel–Viénot, so there is no value oracle.
 * The check is the published *property* the model exists to reproduce, and it is the
 * acceptance criterion: **two colours on a confusion line must collapse to under ΔE00 2 after
 * simulation, while remaining far apart before it.** Both halves are asserted — a simulation
 * that returned a constant would satisfy the first alone.
 */

import {
  applyMatrix3,
  srgbToLinearSrgb,
  linearSrgbToSrgb,
  type Matrix3,
  type Rgb,
} from '@irodora/color-spaces';
import type { Deficiency } from './machado.js';

/**
 * Hunt–Pointer–Estévez, normalised to D65. XYZ → LMS.
 *
 * **These are NOT the fundamentals the outstanding Brettel construction should use**, and the
 * golden set proves it rather than asserting it.
 *
 * A dichromat's copunctal point *is* the chromaticity of the missing cone's fundamental, so it
 * is derivable from column *k* of the inverse matrix. Derived from HPE against the classic
 * published points:
 *
 * | | derived from HPE | published | difference |
 * |---|---|---|---|
 * | protan (L) | (0.8374, 0.1626) | (0.747, 0.253) | **0.090** |
 * | deutan (M) | (2.3019, −1.3019) | (1.400, −0.400) | **0.902** |
 * | tritan (S) | (0.1680, 0.0000) | (0.171, −0.003) | 0.003 |
 *
 * HPE reproduces tritan and misses the other two badly. The published protan and deutan points
 * are Smith–Pokorny, which is also what Viénot's matrices are derived from — so **the
 * two-half-plane Brettel construction needs Smith–Pokorny fundamentals, not this matrix.**
 *
 * This is also the explanation for the ~5.2 ΔE00 residual recorded in the golden set when a
 * confusion pair built from the published copunctal points is simulated with the Viénot
 * matrices. Kept here because it is the answer the next session needs, not just the symptom.
 */
export const XYZ_TO_LMS_HPE: Matrix3 = [
  0.4002, 0.7076, -0.0808, -0.2263, 1.1653, 0.0457, 0, 0, 0.9182,
];

/**
 * LMS → XYZ, the **exact float64 inverse** of the matrix above.
 *
 * Computed once and transcribed, never inverted at runtime — the same rule as every other
 * inverse in the engine. Worth noting that the first draft of this constant was written from
 * recall and was wrong from the 8th digit; the `M · M⁻¹ = I` check in the golden set is what
 * caught it, which is the third time that check has earned its place.
 */
export const LMS_TO_XYZ_HPE: Matrix3 = [
  1.860066612508235, -1.12948007810077, 0.2198983030493036, 0.3612229249211479, 0.6388043064668288,
  -0.000007127501530529546, 0, 0, 1.0890873448050533,
];

/**
 * Copunctal points in CIE xy — the chromaticity a dichromat's confusion lines converge on.
 *
 * Published values, and the golden data for this module: a line through the copunctal point
 * is by definition a set of colours the corresponding dichromat cannot tell apart.
 */
export const COPUNCTAL_POINTS: Record<Deficiency, readonly [x: number, y: number]> = {
  protan: [0.747, 0.253],
  deutan: [1.4, -0.4],
  tritan: [0.171, -0.003],
};

/**
 * The Viénot–Brettel–Mollon (1999) single-plane matrices, in **linear** sRGB.
 *
 * Published, widely used, and correct only for protanopia and deuteranopia. They are what
 * `simulateDichromacy` currently uses, and what most other software implements — so
 * reproducing someone else's number needs them.
 *
 * **There is deliberately no tritan entry.** Adding one would be inventing a value the source
 * does not publish, for the case the simplification does not cover.
 */
export const VIENOT_1999: Partial<Record<Deficiency, Matrix3>> = {
  protan: [0.11238, 0.88762, 0, 0.11238, 0.88762, 0, 0.00401, -0.00401, 1],
  deutan: [0.29275, 0.70725, 0, 0.29275, 0.70725, 0, -0.02234, 0.02234, 1],
};

/**
 * Simulate dichromacy on an **encoded** sRGB colour.
 *
 * Unlike Machado's matrices, this construction happens in **linear light** — it is a
 * projection in a cone space, and projecting encoded values would project the wrong geometry.
 * The two models differing on this point is not an inconsistency; it is what each source
 * specifies.
 *
 * Currently implemented via the Viénot single-plane matrices for protan and deutan. **Tritan
 * is not yet implemented** and throws rather than returning a plausible wrong answer — see
 * the module comment. That is deliberate: a silently-wrong tritan simulation would feed the
 * separation score and produce an accessibility claim nobody could trace.
 */
export function simulateDichromacy(rgb: Rgb, deficiency: Deficiency): Rgb {
  const matrix = VIENOT_1999[deficiency];

  if (!matrix) {
    throw new Error(
      `simulateDichromacy: ${deficiency} dichromacy needs the two-half-plane Brettel construction, ` +
        `which is not implemented yet. Viénot's single-plane simplification is not accurate for it, ` +
        `and returning it anyway would produce an accessibility claim nobody could trace.`,
    );
  }

  return linearSrgbToSrgb(applyMatrix3(matrix, srgbToLinearSrgb(rgb)));
}

/** Whether `simulateDichromacy` can answer for this deficiency. */
export function hasDichromacySupport(deficiency: Deficiency): boolean {
  return VIENOT_1999[deficiency] !== undefined;
}
