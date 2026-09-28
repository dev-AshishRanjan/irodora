/**
 * Text drawn ON a colour sample, and the ink it takes (F-232, C8).
 *
 * `24` tints each ΔE00 badge with its row's sample and sets the figure on it. A sample is data, not
 * a token, so no declared pairing covers text on it, and the contrast gate's `pair-undeclared` rule
 * cannot see it. This chooses the ink here instead and says, in the result, whether it passes.
 *
 * It picks between the two text tokens that are one light and one dark in every palette:
 * `foreground`, and `inverse.foreground`, which is the ground's value. It takes whichever has the
 * higher WCAG contrast against the sample, and reports whether that clears 4.5:1.
 *
 * A mid-tone clears it with NEITHER. `24`'s own tints are mid-tones, so its badges fail with both
 * inks; that is F-259's to settle, and this is where the failure shows rather than being hidden.
 */

import type { Color } from '@irodora/color-core';
import { wcagContrast } from '@irodora/color-difference';
import type { ThemeColors } from './theme.js';

/** A colour drawn as data: its rendered hex, derived by the engine, and its provenance (ADR-0005). */
export interface Sample {
  /** The rendered value. Derived by the engine at the call site, never typed by hand. */
  readonly hex: string;
  /** Carries provenance in its type. This is the ADR-0005 enforcement. */
  readonly color: Color;
}

/** WCAG 2.2's floor for text (SC 1.4.3). */
export const TEXT_CONTRAST = 4.5;

export interface InkOnSample {
  readonly ink: 'foreground' | 'inverse.foreground';
  readonly contrast: number;
  /** Whether the chosen ink clears {@link TEXT_CONTRAST}. `false` means neither ink does. */
  readonly passes: boolean;
}

/** The ink for text on `hex`, and whether it passes. */
export function inkOnSample(hex: string, colors: ThemeColors): InkOnSample {
  const sample = rgbOf(hex);
  const light = wcagContrast(sample, rgbOf(colors.foreground));
  const dark = wcagContrast(sample, rgbOf(colors['inverse.foreground']));
  const [ink, contrast] =
    light >= dark ? (['foreground', light] as const) : (['inverse.foreground', dark] as const);
  return { ink, contrast, passes: contrast >= TEXT_CONTRAST };
}

/** A `#rrggbb` as the engine's 0–1 triple. Six digits only, as every sample here is. */
function rgbOf(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
