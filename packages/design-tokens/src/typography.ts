/**
 * Which Dynamic Type curve each step of our scale should scale along.
 *
 * ## What `dynamicTypeRamp` actually selects
 *
 * It is **a scaling curve, not a semantic label.** iOS scales text differently at different
 * sizes — large titles grow proportionally less than captions do, because a 34 pt title at the
 * largest accessibility setting would otherwise be unusable. Naming a ramp tells iOS which of
 * those curves to apply.
 *
 * That is why the match here is by **size, not by name**. Our `body` is 15 px; Apple's `body`
 * is 17. Matching by name would scale our body text along a curve calibrated for something
 * larger, so it would drift from its intended appearance as the user's setting moves. Matching
 * by size preserves the intended size at the default setting and scales proportionally from
 * there — which is what A7's 200 % requirement needs.
 *
 * ## The ramp sizes are Apple's, not ours
 *
 * Cited rather than derived, and treated the way a golden dataset is: these are published
 * values for the **`Large` content size category**, iOS's default. Changing one would be
 * changing a claim about someone else's platform.
 *
 * Source: Apple Human Interface Guidelines, *Typography* — iOS Dynamic Type sizes, `Large`
 * category. The same table backs `UIFont.TextStyle`.
 *
 * `headline` and `body` are both 17 pt and differ only in weight, so a 17 px step of ours
 * would tie between them. The tie-break below resolves it deterministically rather than by
 * whichever key an object literal happened to list first.
 */

/** Apple's ramp, ascending. iOS only — Android ignores the prop entirely. */
export const APPLE_TYPE_RAMP = [
  { ramp: 'caption2', pt: 11 },
  { ramp: 'caption1', pt: 12 },
  { ramp: 'footnote', pt: 13 },
  { ramp: 'subheadline', pt: 15 },
  { ramp: 'callout', pt: 16 },
  { ramp: 'body', pt: 17 },
  { ramp: 'headline', pt: 17 },
  { ramp: 'title3', pt: 20 },
  { ramp: 'title2', pt: 22 },
  { ramp: 'title1', pt: 28 },
  { ramp: 'largeTitle', pt: 34 },
] as const;

/** The names React Native's `Text` accepts for `dynamicTypeRamp`. */
export type DynamicTypeRamp = (typeof APPLE_TYPE_RAMP)[number]['ramp'];

/**
 * The nearest ramp to a size in points.
 *
 * **Ties resolve to the LARGER ramp.** Two reasons, and the second is the one that matters:
 * it is deterministic where object key order is not, and at the small end of the scale the
 * larger ramp scales with more headroom — which is the direction A7 cares about. Our `xs` step
 * at 11.5 px is exactly equidistant from `caption2` (11) and `caption1` (12), so this is a live
 * case rather than a defensive one.
 *
 * A size above the largest ramp clamps to `largeTitle`. `display.1` is 72 px, far beyond
 * anything Apple publishes, and there is no curve above that one to choose.
 */
export function dynamicTypeRampFor(sizePx: number): DynamicTypeRamp {
  // Widened deliberately: `as const` gives element 0 its own literal type, and narrowing the
  // accumulator to it would refuse every later candidate.
  let best: { readonly ramp: DynamicTypeRamp; readonly pt: number } = APPLE_TYPE_RAMP[0];
  for (const candidate of APPLE_TYPE_RAMP) {
    const here = Math.abs(candidate.pt - sizePx);
    const incumbent = Math.abs(best.pt - sizePx);
    // `<=` walks ascending and keeps the LAST equally-good match, which is the larger one.
    if (here <= incumbent) best = candidate;
  }
  return best.ramp;
}
