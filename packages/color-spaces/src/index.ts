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
  type Xyz,
} from './types.js';

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
