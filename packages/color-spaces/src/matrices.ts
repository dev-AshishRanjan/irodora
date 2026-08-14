/**
 * Every matrix the engine uses, at full published precision, with its inverse stored
 * explicitly.
 *
 * **The inverses are transcribed, not computed.** A runtime matrix inversion is three
 * divisions and nine multiply-adds whose rounding depends on the order the implementation
 * chooses, which puts platform-dependent error in the one place NFR-3 cannot absorb it. The
 * golden set asserts `M · M⁻¹ = I` to 2.3e-16, so a transcription error in either direction
 * fails the build rather than becoming a 0.3 ΔE00 bias nobody attributes to a matrix.
 *
 * **Nothing here is rounded for readability.** Every value is 16–17 significant digits
 * because that is what a float64 holds; a matrix trimmed to 8 digits "because it reads
 * better" is a decision to be less accurate than the hardware, made for the benefit of
 * whoever is reading rather than whoever is wearing the result.
 *
 * Sources: the sRGB and Display-P3 matrices are the values published in CSS Color Module
 * Level 4's conversion sample code, which are in turn derived from the primaries in
 * IEC 61966-2-1 (sRGB) and SMPTE RP 431-2 (DCI-P3 primaries, D65 white). The golden set
 * re-derives both from those published chromaticities and asserts agreement, so the citation
 * is checked rather than asserted.
 */

import type { Matrix3 } from './types.js';

/**
 * Linear sRGB → CIE XYZ (D65).
 *
 * The columns are the XYZ of the primaries: column 0 is red, and `srgbToXyz([1, 0, 0])`
 * must return it exactly. That is what makes a transposed matrix impossible to miss.
 */
export const LINEAR_SRGB_TO_XYZ: Matrix3 = [
  0.41239079926595934, 0.357584339383878, 0.1804807884018343, 0.21263900587151027,
  0.715168678767756, 0.07219231536073371, 0.01933081871559182, 0.11919477979462598,
  0.9505321522496607,
];

/** CIE XYZ (D65) → linear sRGB. Transcribed, not inverted at runtime. */
export const XYZ_TO_LINEAR_SRGB: Matrix3 = [
  3.2409699419045226, -1.537383177570094, -0.4986107602930034, -0.9692436362808796,
  1.8759675015077202, 0.04155505740717559, 0.05563007969699366, -0.20397695888897652,
  1.0569715142428786,
];

/**
 * Linear Display-P3 → CIE XYZ (D65).
 *
 * The `0` at position `[2][0]` is exact, not rounded: the P3 red primary is at
 * x = 0.680, y = 0.320, so `1 − x − y` is exactly zero and the primary has no Z component.
 * Deriving the matrix in float64 from those chromaticities produces −3.97e-17 there instead,
 * which is why the published value is used and the derivation is only a cross-check.
 */
export const LINEAR_P3_TO_XYZ: Matrix3 = [
  0.4865709486482162, 0.26566769316909306, 0.1982172852343625, 0.2289745640697488,
  0.6917385218365064, 0.079286914093745, 0, 0.04511338185890264, 1.043944368900976,
];

/** CIE XYZ (D65) → linear Display-P3. Transcribed, not inverted at runtime. */
export const XYZ_TO_LINEAR_P3: Matrix3 = [
  2.493496911941425, -0.9313836179191239, -0.40271078445071684, -0.8294889695615747,
  1.7626640603183463, 0.023624685841943577, 0.03584583024378447, -0.07617238926804182,
  0.9568845240076872,
];

/**
 * CIE XYZ → LMS, CAT16 (Li, Luo, Hunt, Ohta et al. 2017, CIECAM16).
 *
 * The default chromatic adaptation transform. CAT16 replaced CAT02, which could produce
 * negative tristimulus values for saturated colours near the spectral locus.
 */
export const XYZ_TO_LMS_CAT16: Matrix3 = [
  0.401288, 0.650173, -0.051461, -0.250268, 1.204414, 0.045854, -0.002079, 0.048952, 0.953127,
];

/**
 * LMS → CIE XYZ, CAT16.
 *
 * The **exact float64 inverse** of the matrix above, computed once and transcribed — not the
 * 8-decimal inverse the literature prints beside it. The two agree to 5.4e-9, which is fine
 * for a single conversion and is not fine for a round trip: the printed inverse leaves a
 * residual of 3.8e-14 in `M · M⁻¹`, forty times worse than what the hardware can do, for no
 * reason other than that it was typeset. The golden set asserts both — that this is the
 * inverse, and that it still matches the published one to the precision the published one has.
 */
export const LMS_TO_XYZ_CAT16: Matrix3 = [
  1.8620678550872327, -1.0112546305316843, 0.14918677544445175, 0.3875265432361371,
  0.6214474419314753, -0.00897398516761252, -0.015841498849333856, -0.03412293802851556,
  1.0499644368778493,
];

/**
 * CIE XYZ → LMS, Bradford (Lam 1985; published in the form used here by Lindbloom).
 *
 * Available rather than default. Bradford is the transform most other software uses, so it
 * is what a cross-check against another tool needs — and being able to reproduce someone
 * else's number is worth having even when we believe our own default is better.
 */
export const XYZ_TO_LMS_BRADFORD: Matrix3 = [
  0.8951, 0.2664, -0.1614, -0.7502, 1.7135, 0.0367, 0.0389, -0.0685, 1.0296,
];

/** LMS → CIE XYZ, Bradford. Exact float64 inverse of the matrix above; agrees with Lindbloom's published 7-decimal inverse to 4.9e-8. */
export const LMS_TO_XYZ_BRADFORD: Matrix3 = [
  0.9869929054667123, -0.14705425642099013, 0.15996265166373122, 0.43230526972339456,
  0.5183602715367776, 0.0492912282128556, -0.008528664575177328, 0.04004282165408487,
  0.9684866957875501,
];

/**
 * CIE XYZ (D65) → LMS, OKLab.
 *
 * **These are the CSS Color 4 matrices, not the ten-decimal ones in Ottosson's 2020 article,
 * and the difference is not cosmetic** (ADR-0039). Ottosson derived his against a slightly
 * different white point than the one the rest of the pipeline uses, so composing them here
 * leaves D65 white at chroma **1.25e-4** instead of zero — a neutral that is very slightly
 * not neutral, at the top of the lightness range where it is least forgivable. CSS Color 4
 * recalculated the same transform for a consistent reference white
 * (csswg-drafts issue 6642); with these values white lands on `(1, 0, 0)` to **5e-16**.
 *
 * Ottosson's published test table still reproduces to the three decimals he prints it at, so
 * the golden set keeps its `published-value` entries — those check the transform, and these
 * constants are a more precise statement of the same transform rather than a different one.
 */
export const XYZ_TO_LMS_OKLAB: Matrix3 = [
  0.819022437996703, 0.3619062600528904, -0.1288737815209879, 0.0329836539323885,
  0.9292868615863434, 0.0361446663506424, 0.0481771893596242, 0.2642395317527308,
  0.6335478284694309,
];

/** LMS (cube-rooted) → OKLab. CSS Color 4, recalculated for a consistent reference white. */
export const LMS_TO_OKLAB: Matrix3 = [
  0.210454268309314, 0.7936177747023054, -0.0040720430116193, 1.9779985324311684,
  -2.4285922420485799, 0.450593709617411, 0.0259040424655478, 0.7827717124575296,
  -0.8086757549230774,
];

/** OKLab → LMS (cube-rooted). CSS Color 4's published inverse, which is the exact float64 inverse to 2.2e-16. */
export const OKLAB_TO_LMS: Matrix3 = [
  1, 0.3963377773761749, 0.2158037573099136, 1, -0.1055613458156586, -0.0638541728258133, 1,
  -0.0894841775298119, -1.2914855480194092,
];

/** LMS → CIE XYZ (D65). CSS Color 4's published inverse, which is the exact float64 inverse to 2.2e-16. */
export const LMS_TO_XYZ_OKLAB: Matrix3 = [
  1.2268798758459243, -0.5578149944602171, 0.2813910456659647, -0.0405757452148008,
  1.112286803280317, -0.0717110580655164, -0.0763729366746601, -0.4214933324022432,
  1.5869240198367816,
];
