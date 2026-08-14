/**
 * WCAG 2.x contrast ratio.
 *
 * **This module reproduces a specification, not a model of perception.** WCAG 2.x contrast is
 * known to be a poor predictor of perceived contrast — it over-rewards some dark-on-dark
 * pairings and under-rewards some light ones — and ADR-0021 records the decision to enforce it
 * anyway, with APCA reported alongside. "We used a better algorithm" is not a defence in a
 * procurement questionnaire.
 *
 * So the job here is exactness, not improvement. The constants are WCAG's, the rounding is
 * WCAG's, and the luminance is `wcagLuminance` rather than the engine's — see `luminance.ts`
 * for why those are different functions and what it costs to confuse them.
 */

import type { Rgb } from '@irodora/color-spaces';
import { wcagLuminance } from './luminance.js';

/**
 * The viewing-flare term, added to both luminances before the ratio.
 *
 * WCAG's `0.05` models 5% ambient reflection off the screen. It is what bounds the ratio at
 * 21:1 rather than infinity, and it is why black-on-black is 1:1 rather than undefined.
 */
export const WCAG_FLARE = 0.05;

/**
 * WCAG 2.x contrast ratio between two encoded sRGB colours.
 *
 * **Symmetric**: which colour is the foreground does not affect the result. That is a property
 * of the WCAG formula and not of every contrast algorithm — APCA is deliberately not
 * symmetric, because dark text on light is not the same perceptual problem as its inverse.
 *
 * Returns a number in `[1, 21]` for in-gamut input.
 */
export function wcagContrast(a: Rgb, b: Rgb): number {
  const la = wcagLuminance(a);
  const lb = wcagLuminance(b);

  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);

  return (lighter + WCAG_FLARE) / (darker + WCAG_FLARE);
}
