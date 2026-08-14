/**
 * Colour space conversions.
 *
 * CIE XYZ (D65) is canonical; everything else derives from it (ADR-0003). ZERO runtime
 * dependencies, NO platform APIs — this must produce byte-identical results in Node, the
 * browser and React Native (NFR-3) and port to WASM.
 *
 * Enforced by `pnpm lint`: the ESLint colour-engine zone blocks `node:*` and the platform
 * globals, and `scripts/verify-engine-purity.mjs` blocks a third-party import or a runtime
 * dependency. Both have been watched fire.
 */

export {
  CANONICAL_ILLUMINANT,
  type ColorSpace,
  type Lab,
  type LCh,
  type LinearRgb,
  type Matrix3,
  type OkLab,
  type OkLCh,
  type Rgb,
  type Triple,
  type Xyz,
} from './types.js';

export {
  applyMatrix3,
  degreesToRadians,
  hueDelta,
  multiplyMatrix3,
  normalizeHue,
  radiansToDegrees,
} from './numeric.js';

export { CANONICAL_WHITE, D50, D65 } from './whitepoints.js';

export {
  LINEAR_P3_TO_XYZ,
  LINEAR_SRGB_TO_XYZ,
  LMS_TO_OKLAB,
  LMS_TO_XYZ_BRADFORD,
  LMS_TO_XYZ_CAT16,
  LMS_TO_XYZ_OKLAB,
  OKLAB_TO_LMS,
  XYZ_TO_LINEAR_P3,
  XYZ_TO_LINEAR_SRGB,
  XYZ_TO_LMS_BRADFORD,
  XYZ_TO_LMS_CAT16,
  XYZ_TO_LMS_OKLAB,
} from './matrices.js';

export {
  displayP3ToLinearP3,
  displayP3ToXyz,
  linearP3ToDisplayP3,
  linearP3ToXyz,
  linearSrgbToSrgb,
  linearSrgbToXyz,
  srgbToLinearSrgb,
  srgbToXyz,
  xyzToDisplayP3,
  xyzToLinearP3,
  xyzToLinearSrgb,
  xyzToSrgb,
} from './rgb.js';

export {
  LAB_EPSILON,
  LAB_KAPPA,
  labToLch,
  labToXyz,
  lchToLab,
  lchToXyz,
  xyzToLab,
  xyzToLch,
} from './lab.js';

export {
  oklabToOklch,
  oklabToXyz,
  oklchToOklab,
  oklchToXyz,
  xyzToOklab,
  xyzToOklch,
} from './oklab.js';

export {
  linearToSrgb,
  srgbToLinear,
  SRGB_EOTF_CUTOFF,
  SRGB_GAMMA,
  SRGB_JOIN_GAP,
  SRGB_LINEAR_SLOPE,
  SRGB_OETF_CUTOFF,
  SRGB_OFFSET,
} from './transfer.js';

/** Semver of the engine. Recorded in every reproducibility envelope (FR-10). */
export const ENGINE_VERSION = '0.1.0' as const;
