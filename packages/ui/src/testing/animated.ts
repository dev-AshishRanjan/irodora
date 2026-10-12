/**
 * What a worklet returned, as a test reads it (F-266, ADR-0133 §9).
 *
 * Under jest, reanimated mirrors an animated style into the host node and animated props into the
 * composite `createAnimatedComponent` renders. `props.style` is only the style as it was at mount,
 * so a test that read it would see a moving value standing still. These two read the live return —
 * which is also how a test sees WHICH keys a worklet animates, and so whether one animates a
 * colour (the old belief that no test could see it was half wrong).
 *
 * Every test that advances time to read these must keep its worklets' inputs to shared values and
 * numbers: the mapper walk reaches React Native's namespace through any plain object (E-069).
 */

/** A node of the test renderer's tree, as far as these readers need it. */
interface Node {
  readonly props: Readonly<Record<string, unknown>>;
}

/** The `value` of a reanimated jest mirror, or a thrown reason. */
function mirrored(prop: unknown, reader: string): Readonly<Record<string, unknown>> {
  if (typeof prop !== 'object' || prop === null || !('value' in prop))
    throw new Error(`${reader}: this node carries no such mirror`);
  const { value } = prop;
  if (typeof value !== 'object' || value === null)
    throw new Error(`${reader}: the mirror holds no object`);
  return value as Record<string, unknown>;
}

/**
 * What a host node's worklet returns now — its keys and values ALONE.
 *
 * Not reanimated's `getAnimatedStyle`, which merges the static style underneath: a worklet that
 * returned nothing would then read as the static token, and a test of "the worklet returns our
 * colour" would pass on a worklet that returns none (F-266's own first reading).
 */
export function animatedStyleOf(node: Node): Readonly<Record<string, unknown>> {
  return mirrored(node.props['jestAnimatedStyle'], 'animatedStyleOf');
}

/**
 * The animated props a composite carries now — the one `createAnimatedComponent` renders, not the
 * host underneath it, which keeps its mount value (F-266's probe). Throws on a node without them.
 */
export function animatedPropsOf(node: Node): Readonly<Record<string, unknown>> {
  return mirrored(node.props['jestAnimatedProps'], 'animatedPropsOf');
}
