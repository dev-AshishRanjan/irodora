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
 * CIE XYZ (D65) → LMS, OKLab (Ottosson 2020).
 *
 * Ottosson's M1. Published to ten decimal places, which is the precision the derivation was
 * done at; using more digits would be inventing precision the source does not have.
 */
export const XYZ_TO_LMS_OKLAB: Matrix3 = [
  0.8189330101, 0.3618667424, -0.1288597137, 0.032984543, 0.9293118715, 0.0361456387, 0.0482003018,
  0.2643662691, 0.633851707,
];

/** LMS (cube-rooted) → OKLab. Ottosson's M2. */
export const LMS_TO_OKLAB: Matrix3 = [
  0.2104542553, 0.793617785, -0.0040720468, 1.9779984951, -2.428592205, 0.4505937099, 0.0259040371,
  0.7827717662, -0.808675766,
];

/** OKLab → LMS (cube-rooted). Exact float64 inverse of M2; agrees with Ottosson's published inverse to 4.2e-10. */
export const OKLAB_TO_LMS: Matrix3 = [
  0.9999999984505199, 0.39633779217376786, 0.2158037580607588, 1.0000000088817607,
  -0.10556134232365634, -0.0638541747717059, 1.000000054672411, -0.08948418209496577,
  -1.291485537864092,
];

/** LMS → CIE XYZ (D65). Exact float64 inverse of M1; agrees with Ottosson's published inverse to 4.1e-10. */
export const LMS_TO_XYZ_OKLAB: Matrix3 = [
  1.227013850692864, -0.5577999804651378, 0.281256148872337, -0.04058017760442784, 1.11225686924458,
  -0.07167667847790375, -0.07638128481600542, -0.4214819782769511, 1.586163220369668,
];
