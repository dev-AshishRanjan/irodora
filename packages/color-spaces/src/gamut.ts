/**
 * Gamut mapping — finding the closest *displayable* colour when the one you have is not.
 *
 * ## Why not clip
 *
 * Clipping each RGB channel into `[0, 1]` independently is what almost everything does, and
 * it **changes hue**. Display-P3 red is `[1.093, −0.227, −0.150]` in sRGB; clipped it becomes
 * pure sRGB red, which is a different hue and a different lightness, not a duller version of
 * the same colour. On a product whose claim is that the colour is right, that is the wrong
 * trade.
 *
 * Reducing **chroma** in OKLCh holds lightness and hue exactly and gives up only
 * colourfulness — the one axis a user forgives, and the one they can be told about.
 *
 * ## What this is, precisely
 *
 * Binary search on OKLCh chroma between 0 and the colour's own chroma, for the largest
 * chroma whose sRGB (or Display-P3) representation fits in `[0, 1]`. `L` and `H` are carried
 * through untouched; only `C` moves.
 *
 * **This is CSS Color 4 §13.2 without its MINDE step**, deliberately, and the difference is
 * measured rather than assumed — see
 * [ADR-0045](../../../docs/adr/0045-gamut-mapping-is-chroma-bisection-without-minde.md).
 *
 * ## The three cases that are not "reduce chroma until it fits"
 *
 * - **Already inside.** Returned unchanged, bit for bit. Idempotence depends on this being
 *   an early return and not a bisection that happens to converge.
 * - **Achromatic.** Chroma is already 0, so there is nothing to reduce and hue is
 *   meaningless (`atan2(0, 0)` is 0, not an angle). Falls through to the clamp.
 * - **Out of gamut in lightness.** `L > 1` or `L < 0` does not fit at *any* chroma. Chroma
 *   reduction cannot help, and pretending otherwise would return whatever the loop last
 *   held. The clamp is the defined answer, and it is reached explicitly.
 */

import type { Rgb, Xyz } from './types.js';
import { oklchToXyz, xyzToOklch } from './oklab.js';
import { xyzToDisplayP3, xyzToSrgb } from './rgb.js';

/** A target gamut. An enum rather than a boolean, so Rec.2020 is additive later. */
export type Gamut = 'srgb' | 'display-p3';

/**
 * How far outside `[0, 1]` a component may sit and still count as displayable.
 *
 * A tolerance on the floating-point round trip through XYZ, not on colour accuracy. `1e-7`
 * is well below the `1/255` a byte can express, so it cannot hide a colour that is genuinely
 * outside — and it is above the ~1e-16 noise of the conversion, so a colour that IS inside
 * does not fail the predicate because of its last bit.
 */
export const GAMUT_EPSILON = 1e-7;

/**
 * Bisection steps.
 *
 * 32 halvings take the chroma interval below 1e-9 for any real starting chroma (OKLCh chroma
 * for visible colours does not exceed ~0.4), which is far finer than the 8-bit output it
 * feeds. Exported and asserted so that "optimising" this to a coarser loop is a test failure
 * rather than a quiet loss of precision.
 */
export const GAMUT_BISECTION_STEPS = 32;

const RENDER: Record<Gamut, (xyz: Xyz) => Rgb> = {
  srgb: xyzToSrgb,
  'display-p3': xyzToDisplayP3,
};

/** Every component within `[0, 1]`, to `GAMUT_EPSILON`. */
export function isInGamut(rgb: Rgb, epsilon: number = GAMUT_EPSILON): boolean {
  return rgb.every((v) => v >= -epsilon && v <= 1 + epsilon);
}

/** Whether a canonical XYZ colour is displayable in `gamut`. */
export function isXyzInGamut(xyz: Xyz, gamut: Gamut = 'srgb'): boolean {
  return isInGamut(RENDER[gamut](xyz));
}

const clampChannel = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The final clamp. Only ever applied to a colour already within `GAMUT_EPSILON` of legal. */
const clampRgb = (rgb: Rgb): Rgb => [
  clampChannel(rgb[0]),
  clampChannel(rgb[1]),
  clampChannel(rgb[2]),
];

/** What the mapping did, for a caller that has to explain itself to a user. */
export interface GamutMapping {
  /** The displayable colour. */
  readonly rgb: Rgb;
  /** Whether the input was already displayable — then `rgb` is untouched. */
  readonly wasInGamut: boolean;
  /** OKLCh chroma before and after. Equal when `wasInGamut`. */
  readonly chromaBefore: number;
  readonly chromaAfter: number;
  /**
   * True when no chroma at all fits — the colour is outside in **lightness**, and the result
   * is the clamp rather than a chroma reduction. A caller reporting "we reduced saturation"
   * would be wrong here, which is why this is a separate flag and not an inference from
   * `chromaAfter === 0`.
   */
  readonly lightnessOutOfRange: boolean;
}

/**
 * Map a canonical XYZ colour into `gamut`, reducing OKLCh chroma only.
 *
 * Returns the decomposition rather than a bare colour, because a product that tells people
 * their screen cannot show a colour has to say *what it did* — and because
 * `lightnessOutOfRange` is not derivable from the result.
 */
export function gamutMapDetail(xyz: Xyz, gamut: Gamut = 'srgb'): GamutMapping {
  const render = RENDER[gamut];
  const direct = render(xyz);
  const [l, chroma, h] = xyzToOklch(xyz);

  // Already displayable. Returned untouched — not re-derived through OKLCh, because a round
  // trip is lossy and idempotence has to be bit-exact, not merely close.
  if (isInGamut(direct))
    return {
      rgb: direct,
      wasInGamut: true,
      chromaBefore: chroma,
      chromaAfter: chroma,
      lightnessOutOfRange: false,
    };

  // Nothing to reduce: either there is no chroma, or even zero chroma does not fit — which
  // means the colour is outside in lightness and no amount of desaturation will help.
  const achromatic = render(oklchToXyz([l, 0, h]));
  if (chroma <= 0 || !isInGamut(achromatic))
    return {
      rgb: clampRgb(achromatic),
      wasInGamut: false,
      chromaBefore: chroma,
      chromaAfter: 0,
      lightnessOutOfRange: !isInGamut(achromatic),
    };

  // Bisection. `low` is always a chroma known to fit and `high` one known not to, so the
  // invariant holds at every step and the answer is `low` — the largest chroma proven
  // displayable, never an unproven midpoint.
  let low = 0;
  let high = chroma;
  for (let step = 0; step < GAMUT_BISECTION_STEPS; step++) {
    const mid = (low + high) / 2;
    if (isInGamut(render(oklchToXyz([l, mid, h])))) low = mid;
    else high = mid;
  }

  return {
    rgb: clampRgb(render(oklchToXyz([l, low, h]))),
    wasInGamut: false,
    chromaBefore: chroma,
    chromaAfter: low,
    lightnessOutOfRange: false,
  };
}

/** The displayable colour alone, for callers that do not need the decomposition. */
export function gamutMap(xyz: Xyz, gamut: Gamut = 'srgb'): Rgb {
  return gamutMapDetail(xyz, gamut).rgb;
}
