/**
 * Reference white points, as CIE XYZ with `Y = 1`.
 *
 * Each is derived from its published CIE chromaticity, and the derivation is one line —
 * `[x/y, 1, (1 − x − y)/y]` — so the value in the comment can be checked against the value in
 * the code without a calculator. The golden set asserts the derivation rather than trusting
 * the transcription.
 *
 * D65 is canonical (ADR-0003). D50 exists because chromatic adaptation needs a second white
 * point to be testable at all, and because CIELAB is D50-referenced almost everywhere outside
 * this repository — which is the specific way a Lab comparison against another library goes
 * quietly wrong.
 */

import type { Xyz } from './types.js';

/** CIE standard illuminant D65, 2° observer. x = 0.3127, y = 0.3290. */
export const D65: Xyz = [0.3127 / 0.329, 1, (1 - 0.3127 - 0.329) / 0.329];

/** CIE standard illuminant D50, 2° observer. x = 0.3457, y = 0.3585. */
export const D50: Xyz = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

/**
 * The canonical white point, named so a call site can say what it means rather than
 * repeating `D65` and hoping it is still the canonical one after ADR-0003 is revisited.
 */
export const CANONICAL_WHITE: Xyz = D65;
