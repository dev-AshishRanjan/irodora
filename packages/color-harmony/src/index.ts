/**
 * Harmony generation.
 *
 * All generation happens in **OKLCh**: rotating hue in HSL produces perceptually inconsistent
 * steps, and users notice even when they cannot say why. That is an assertion this package rests
 * on, so `test/geometry.test.ts` measures it rather than repeating it.
 *
 * **Every returned colour is gamut-mapped** (FR-8, criterion 4), and carries what the mapping
 * cost — so nothing suggests a colour the display cannot show, and "less vivid" is a measurement
 * rather than a disclaimer.
 *
 * **Two families, never blended.** Geometric harmonies are computable from first principles.
 * Editorial ones are curated corpus relationships, valuable precisely because they are not
 * derivable from geometry — and they carry attribution, enforced.
 *
 * No colour maths is implemented here: every conversion is `@irodora/color-spaces` and every
 * measurement `@irodora/color-difference`.
 */

export { HarmonyError } from './errors.js';

export {
  HARMONY_FAMILIES,
  HARMONY_KINDS,
  isHarmonyKind,
  VARIES,
  type HarmonyFamily,
  type HarmonyKind,
} from './kinds.js';

export {
  assertOklch,
  hueDistance,
  lightnessRamp,
  NEAR_NEUTRAL_CHROMA,
  rotateHue,
  scaleChroma,
  withChroma,
  withLightness,
  wrapHue,
  type Oklch,
} from './geometry.js';

export {
  COOL_HUE,
  generateHarmony,
  WARM_HUE,
  type Harmony,
  type HarmonyColor,
  type HarmonyOptions,
} from './generate.js';

export { editorialHarmoniesFrom, type EditorialSource } from './editorial.js';

/** Semver of the harmony engine. Moves when a generated relationship changes. */
export const HARMONY_VERSION = '0.1.0' as const;
