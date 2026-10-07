/**
 * The words beside a ΔE00 and beside its components (F-222, ADR-0125).
 *
 * `@irodora/color-difference` holds the one band table and reads a total or a component into a
 * band; this file maps a band to the catalogue key that says it, in both languages. Every map is
 * TOTAL by type (`satisfies Record<…, MessageKey>`), so a band added to the table without its words
 * does not compile, and every key is written here as a literal, so the unused-key scan sees its
 * reader without an exclusion.
 *
 * `04` (F-245) and `08` (F-249) read these; the band is ADR-0125's, never a screen's own.
 */

import {
  deltaE00Band,
  printedDeltaE00,
  type AxisReading,
  type DeltaE00Band,
} from '@irodora/color-difference';
import type { MessageKey } from './i18n';

/** The word beside a total ΔE00. */
export const BAND_KEYS = {
  veryClose: 'delta.band.veryClose',
  close: 'delta.band.close',
  perceptible: 'delta.band.perceptible',
  clear: 'delta.band.clear',
} as const satisfies Record<DeltaE00Band, MessageKey>;

/** The words beside a lightness component: lighter, darker, or level. */
export const LIGHTNESS_KEYS = {
  more: {
    veryClose: 'delta.lightness.more.veryClose',
    close: 'delta.lightness.more.close',
    perceptible: 'delta.lightness.more.perceptible',
    clear: 'delta.lightness.more.clear',
  },
  less: {
    veryClose: 'delta.lightness.less.veryClose',
    close: 'delta.lightness.less.close',
    perceptible: 'delta.lightness.less.perceptible',
    clear: 'delta.lightness.less.clear',
  },
  level: 'delta.lightness.level',
} as const satisfies {
  readonly more: Record<DeltaE00Band, MessageKey>;
  readonly less: Record<DeltaE00Band, MessageKey>;
  readonly level: MessageKey;
};

/** The words beside a chroma component: more vivid, less vivid, or level. */
export const CHROMA_KEYS = {
  more: {
    veryClose: 'delta.chroma.more.veryClose',
    close: 'delta.chroma.more.close',
    perceptible: 'delta.chroma.more.perceptible',
    clear: 'delta.chroma.more.clear',
  },
  less: {
    veryClose: 'delta.chroma.less.veryClose',
    close: 'delta.chroma.less.close',
    perceptible: 'delta.chroma.less.perceptible',
    clear: 'delta.chroma.less.clear',
  },
  level: 'delta.chroma.level',
} as const satisfies {
  readonly more: Record<DeltaE00Band, MessageKey>;
  readonly less: Record<DeltaE00Band, MessageKey>;
  readonly level: MessageKey;
};

/**
 * The words beside a hue component. No direction: a hue rotation is not something a person can act
 * on as "more" or "less" (F-201) — only how far it turned.
 */
export const HUE_KEYS = {
  veryClose: 'delta.hue.veryClose',
  close: 'delta.hue.close',
  perceptible: 'delta.hue.perceptible',
  clear: 'delta.hue.clear',
  level: 'delta.hue.level',
} as const satisfies Record<DeltaE00Band | 'level', MessageKey>;

/** The components a reading can be about. */
export type DeltaAxis = 'lightness' | 'chroma' | 'hue';

/** The word beside a total ΔE00, banded as it is printed (ADR-0125). */
export function bandKey(deltaE00: number): MessageKey {
  return BAND_KEYS[deltaE00Band(printedDeltaE00(deltaE00))];
}

/** The word beside one component, from its reading (`axisReading`). */
export function axisKey(axis: DeltaAxis, reading: AxisReading): MessageKey {
  if (axis === 'hue')
    return reading.direction === 'level' ? HUE_KEYS.level : HUE_KEYS[reading.band];
  const keys = axis === 'lightness' ? LIGHTNESS_KEYS : CHROMA_KEYS;
  return reading.direction === 'level' ? keys.level : keys[reading.direction][reading.band];
}
