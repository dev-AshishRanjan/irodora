/**
 * The relationships this engine generates, and the two families it keeps apart.
 *
 * ## Family and kind are separate axes
 *
 * The original stub listed `editorial` alongside `complementary`, as though it were a
 * relationship. It is not: **an editorial harmony still stands in some relationship**, and a
 * geometric one is still geometric whatever its kind. Conflating them makes criterion 3 — "kept
 * distinct from geometric ones" — literally unexpressible, because there is nothing to compare.
 *
 * - **Geometric** harmonies are computable from first principles. Anyone with the same maths
 *   gets the same answer.
 * - **Editorial** harmonies are curated relationships from the corpus. They are valuable
 *   *precisely because they are not derivable from geometry* — which is also why they must
 *   carry attribution, and why presenting one as the other would be the ADR-0007 dishonesty
 *   pointed at harmonies instead of at colours.
 */

/**
 * The twelve relationships FR-6 requires.
 *
 * The stub had nine and was missing `near-neutral`, `warm-cool`, `value-contrast` and
 * `chroma-contrast` while carrying `editorial` as a kind. Corrected here.
 */
export const HARMONY_KINDS = [
  'monochromatic',
  'tonal',
  'analogous',
  'complementary',
  'split',
  'triadic',
  'tetradic',
  'neutral',
  'near-neutral',
  'warm-cool',
  'value-contrast',
  'chroma-contrast',
] as const;

export type HarmonyKind = (typeof HARMONY_KINDS)[number];

export const HARMONY_FAMILIES = ['geometric', 'editorial'] as const;
export type HarmonyFamily = (typeof HARMONY_FAMILIES)[number];

export function isHarmonyKind(v: unknown): v is HarmonyKind {
  return typeof v === 'string' && (HARMONY_KINDS as readonly string[]).includes(v);
}

/**
 * What each kind is allowed to vary, in OKLCh.
 *
 * Exported as data rather than buried in a switch so a test can assert the invariants
 * generator-by-generator without restating them — and so the distinction between
 * `monochromatic` and `tonal`, the one most often collapsed, is written down.
 */
export const VARIES: Readonly<Record<HarmonyKind, readonly ('l' | 'c' | 'h')[]>> = {
  // Lightness alone: the same dye, more or less of it in the mix.
  monochromatic: ['l'],
  // Lightness AND chroma together: what dilution actually does to a dyed fibre, which is not
  // the same thing as a lighter dye.
  tonal: ['l', 'c'],
  analogous: ['h'],
  complementary: ['h'],
  split: ['h'],
  triadic: ['h'],
  tetradic: ['h'],
  neutral: ['c'],
  'near-neutral': ['c'],
  'warm-cool': ['h'],
  'value-contrast': ['l'],
  'chroma-contrast': ['c'],
};
