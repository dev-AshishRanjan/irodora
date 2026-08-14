/**
 * Harmony generation.
 *
 * All generation happens in OKLCh: rotating hue in HSL produces perceptually
 * inconsistent steps, and users notice even when they cannot say why.
 */

export type HarmonyKind =
  | 'monochromatic' | 'tonal' | 'analogous' | 'complementary'
  | 'split' | 'triadic' | 'tetradic' | 'neutral' | 'editorial';

/** Implemented in F-014. */
export const HARMONY_VERSION = '0.0.0' as const;
