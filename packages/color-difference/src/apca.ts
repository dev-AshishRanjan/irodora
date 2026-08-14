/**
 * APCA — Accessible Perceptual Contrast Algorithm, version **0.0.98G-4g**.
 *
 * Reported alongside WCAG, never substituted for it (ADR-0021). APCA models perceived
 * contrast considerably better than WCAG 2.x — it is the basis of the WCAG 3 work — but it is
 * not a normative standard, and a disagreement between the two is a signal for design review
 * rather than an override.
 *
 * **The version is part of the answer.** APCA has been revised repeatedly and the constants
 * below are specific to 0.0.98G-4g. "APCA Lc 62" without a version is not a reproducible
 * claim, so `APCA_VERSION` is exported and belongs in anything that records an Lc.
 *
 * Four things about this algorithm surprise people, and all four are deliberate:
 *
 * 1. **It is not symmetric.** `apcaLc(background, text)` and `apcaLc(text, background)` are
 *    different numbers. Dark text on light is not the same perceptual problem as light text
 *    on dark, and APCA models them with different exponents.
 * 2. **The sign carries meaning.** Positive Lc is dark text on a light background; negative is
 *    light text on dark. Taking the absolute value throws away half the answer.
 * 3. **It linearises with a pure power function**, with no linear segment near black — see
 *    `luminance.ts`. Reusing the engine's piecewise transfer function changes Lc for every
 *    dark colour.
 * 4. **There are two clamps and a noise gate**, and each has a reason: `fclamp` compensates
 *    for flare at the dark end, `deltaYmin` suppresses answers for luminances too close to
 *    distinguish, and `loClip` suppresses very low contrast entirely rather than reporting a
 *    number nobody should act on.
 */

import type { Rgb } from '@irodora/color-spaces';
import { apcaLuminance } from './luminance.js';

/** The exact algorithm revision these constants belong to. Record it with any Lc. */
export const APCA_VERSION = '0.0.98G-4g' as const;

/** Exponent applied to the background luminance for dark-text-on-light. */
export const APCA_NORM_BG = 0.56;

/** Exponent applied to the text luminance for dark-text-on-light. */
export const APCA_NORM_TXT = 0.57;

/** Exponent applied to the text luminance for light-text-on-dark. */
export const APCA_REV_TXT = 0.62;

/** Exponent applied to the background luminance for light-text-on-dark. */
export const APCA_REV_BG = 0.65;

/** Luminance below which the soft black clamp applies. */
export const APCA_BLACK_THRESHOLD = 0.022;

/** Exponent of the soft black clamp. */
export const APCA_BLACK_CLAMP = 1.414;

/** Contrast magnitudes below this report as 0 rather than as a small number. */
export const APCA_LOW_CLIP = 0.1;

/** Luminance difference below which the result is a noise gate rather than a measurement. */
export const APCA_DELTA_Y_MIN = 0.0005;

/** Scale factor, both polarities. */
export const APCA_SCALE = 1.14;

/** Offset subtracted after scaling, both polarities. */
export const APCA_LOW_OFFSET = 0.027;

/**
 * The soft clamp at the dark end.
 *
 * Below `APCA_BLACK_THRESHOLD` the luminance is raised, modelling the flare that stops a real
 * screen from reaching true black. Not a hack: without it Lc grows without bound as the
 * darker colour approaches zero, and reports a contrast no display can deliver.
 */
function clampDark(y: number): number {
  return y >= APCA_BLACK_THRESHOLD ? y : y + Math.pow(APCA_BLACK_THRESHOLD - y, APCA_BLACK_CLAMP);
}

/**
 * APCA lightness contrast `Lc`, in roughly `[-108, 106]`.
 *
 * **Argument order matters and the sign is meaningful.** Background first, text second —
 * matching the reference implementation. A positive result is dark text on a light background;
 * a negative result is light text on dark.
 */
export function apcaLc(background: Rgb, text: Rgb): number {
  const backgroundY = clampDark(apcaLuminance(background));
  const textY = clampDark(apcaLuminance(text));

  // The noise gate. Two luminances this close are not distinguishable, and reporting a
  // contrast for them would be reporting a measurement that was not made.
  if (Math.abs(backgroundY - textY) < APCA_DELTA_Y_MIN) return 0;

  const darkTextOnLight = backgroundY > textY;

  const contrast = darkTextOnLight
    ? (Math.pow(backgroundY, APCA_NORM_BG) - Math.pow(textY, APCA_NORM_TXT)) * APCA_SCALE
    : (Math.pow(backgroundY, APCA_REV_BG) - Math.pow(textY, APCA_REV_TXT)) * APCA_SCALE;

  if (Math.abs(contrast) < APCA_LOW_CLIP) return 0;

  return (contrast > 0 ? contrast - APCA_LOW_OFFSET : contrast + APCA_LOW_OFFSET) * 100;
}
