/**
 * OKLCh design tokens, compiled to CSS, TypeScript, React Native and Tailwind.
 *
 * Four targets from one manifest, so web and mobile cannot drift (ADR-0020). That single
 * property is why Astryx was not adopted (ADR-0033).
 *
 * `docs/design/design-system.manifest.json` is the source. Its `oklch` field is
 * authoritative and its `srgb` field is derived by the engine (ADR-0043) — nothing in this
 * package reads a hand-written hex, and the `contrast` gate fails if one appears.
 *
 * **No filesystem access in `src`.** `apps/mobile` bundles this package, and a `node:fs`
 * import here is a crash on a phone. Reading the manifest is `generate.mjs`'s job, and it
 * is not shipped.
 */

export {
  ManifestError,
  parseManifest,
  THEMES,
  USAGES,
  type ChromaException,
  type ColorToken,
  type ContrastGateConfig,
  type CvdPairs,
  type Manifest,
  type ManifestOklch,
  type StatusEntry,
  type Theme,
  type Usage,
} from './manifest.js';

export {
  compositeOver,
  derivedSrgb,
  GAMUT_EPSILON,
  isInGamut,
  oklchToRgb,
  OutOfGamutError,
  resolveAll,
  toHex,
  toOklchString,
  toRgbaString,
  tokenRgb,
} from './derive.js';

export {
  checkChromaCeiling,
  checkContrast,
  checkSeparation,
  checkStructure,
  CVD_SEVERITIES,
  CVD_SEVERITY,
  DEFICIENCIES,
  requirementFor,
  type Finding,
  type PairingResult,
  type SeparationResult,
} from './check.js';

export {
  statusPresentation,
  type LargeTextToken,
  type StatusKind,
  type StatusPresentation,
  type TextToken,
} from './status.js';

export { emitCss, cssVarName } from './emit/css.js';
export { emitTailwind } from './emit/tailwind.js';
export { emitTypescript } from './emit/typescript.js';
export { emitReactNative } from './emit/react-native.js';

export { COLOR, RADIUS, SPACING, STATUS_PAIRING, TAP_TARGET } from './generated/tokens.js';

/** Semver of the token set. Recorded alongside the engine in a reproducibility envelope. */
export const TOKENS_VERSION = '0.1.0' as const;
