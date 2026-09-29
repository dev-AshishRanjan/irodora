/**
 * What is drawn against a colour sample: the ink of the text on it, and the line around it
 * (F-233, ADR-0116).
 *
 * Both are R9 §4 E3 applied per sample, by `onSample` in `@irodora/design-tokens`: the value the
 * mockup draws where it passes, and otherwise the smallest OKLab lightness step that does, hue and
 * chroma held.
 *
 * - **`sampleInk`** starts from C8's two inks, `foreground` and `inverse.foreground`, and takes the
 *   better one unmoved when it clears 4.5:1. That is `inkOnSample`'s choice exactly; only where
 *   NEITHER passes does an ink move.
 * - **`sampleEdge`** starts from the README keyline as it shows over the well, or from the well
 *   itself where an element draws no keyline, and holds 3:1 against the sample. So an element
 *   without a keyline gets a line only where its sample would otherwise lose its edge.
 *
 * The search can take hundreds of steps, so a result is remembered per palette and sample. The
 * palette object is the key, held weakly: a device palette that is rebuilt takes its cache with it.
 */

import { ON_SAMPLE_FLOOR, onSample, paintedOver } from '@irodora/design-tokens';
import type { ThemeColors } from './theme.js';

/** The two inks C8 chooses between, in the order `onSample` reports them. */
const INKS = ['foreground', 'inverse.foreground'] as const;

export interface SampleInk {
  /** The colour to set the text in, `#RRGGBB`. */
  readonly hex: string;
  /** The ink it is, or the ink it was moved from. */
  readonly ink: (typeof INKS)[number];
  /** Its WCAG contrast against the sample: at least 4.5. */
  readonly contrast: number;
  /** Whether neither ink passed, so this one moved (ADR-0116). */
  readonly moved: boolean;
}

export interface SampleEdge {
  /** The colour to draw the line in, `#RRGGBB`. Opaque: the composite is already taken. */
  readonly hex: string;
  /** Its WCAG contrast against the sample: at least 3. */
  readonly contrast: number;
  /** Whether what is drawn failed, so the line moved (ADR-0116). */
  readonly moved: boolean;
}

const remembered = new WeakMap<ThemeColors, Map<string, SampleInk | SampleEdge>>();

function remember<T extends SampleInk | SampleEdge>(
  colors: ThemeColors,
  key: string,
  compute: () => T,
): T {
  let cache = remembered.get(colors);
  if (cache === undefined) {
    cache = new Map();
    remembered.set(colors, cache);
  }
  const hit = cache.get(key);
  if (hit !== undefined) return hit as T;
  const value = compute();
  cache.set(key, value);
  return value;
}

/** The ink for text set on the sample `hex`, in this palette. */
export function sampleInk(hex: string, colors: ThemeColors): SampleInk {
  return remember(colors, `ink ${hex.toUpperCase()}`, () => {
    const on = onSample({
      candidates: INKS.map((ink) => colors[ink]),
      sampleHex: hex,
      floor: ON_SAMPLE_FLOOR.text,
    });
    const ink = INKS[on.from];
    if (ink === undefined)
      throw new Error(`sampleInk: onSample chose candidate ${String(on.from)}`);
    return { hex: on.hex, ink, contrast: on.contrast, moved: on.moved };
  });
}

/**
 * The line around the sample `hex`, in this palette. `keyline` is whether the element draws the
 * README keyline; where it does not, the line starts as the well and shows only where it must.
 */
export function sampleEdge(hex: string, colors: ThemeColors, keyline: boolean): SampleEdge {
  return remember(colors, `edge ${String(keyline)} ${hex.toUpperCase()}`, () => {
    const drawn = keyline
      ? paintedOver(colors['swatch.keyline'], colors['swatch.well'])
      : colors['swatch.well'];
    const on = onSample({ candidates: [drawn], sampleHex: hex, floor: ON_SAMPLE_FLOOR.edge });
    return { hex: on.hex, contrast: on.contrast, moved: on.moved };
  });
}
