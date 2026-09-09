/**
 * The flex-chain check, watched catching the bug it was written for (F-213).
 *
 * F-211 shipped a blank Atlas past every gate in this repository — 16 gates, and a conformance
 * sweep over 72 subjects in 8 conditions reporting zero findings. jest has no layout engine, so
 * a `FlatList` with zero height renders all 120 of its rows into the test tree and every
 * assertion about them passes [[a-test-tree-has-no-height]].
 *
 * **A gate justified by a bug it cannot be shown to catch is a gate justified by a story.** So
 * the first case here is that exact three-node tree, and the second is the fix.
 */

import { brokenFlexChains, type TestNode } from '../src/testing/index.js';

/** A node, at the three fields the tree readers depend on. */
const node = (
  type: string,
  style: Record<string, unknown> | null,
  ...children: TestNode[]
): TestNode => ({
  type,
  props: style === null ? {} : { style },
  children: children.length === 0 ? null : children,
});

describe('the shape that shipped', () => {
  /**
   * F-211, exactly:
   *
   * ```
   * Screen   <View style={{ flex: 1 }}>
   *   Appear   <Animated.View>            ← no height. Its own comes from its content.
   *     Atlas    <FlatList flex: 1>       ← a share of nothing
   * ```
   */
  const F211 = node(
    'View',
    { flex: 1 },
    node('Animated.View', null, node('FlatList', { flex: 1 })),
  );

  it('is reported, and the report names the parent that could not give the height', () => {
    const found = brokenFlexChains(F211);

    expect(found).toHaveLength(1);
    expect(found[0]?.parent).toBe('Animated.View');
    expect(found[0]?.path).toStrictEqual(['View', 'Animated.View', 'FlatList']);
    expect(found[0]?.flex).toBe(1);
  });

  it('stops being reported once the middle node carries the flex — which IS the F-211 fix', () => {
    /*
     * `Appear` gained `fill`, which puts `{ flex: 1 }` on the animated wrapper — outside the
     * animated style deliberately, because `useAnimatedStyle` runs per frame on the UI thread.
     * The check has to see the fix as a fix, or it would go on reporting a screen that works.
     */
    const fixed = node(
      'View',
      { flex: 1 },
      node('Animated.View', { flex: 1 }, node('FlatList', { flex: 1 })),
    );

    expect(brokenFlexChains(fixed)).toStrictEqual([]);
  });
});

describe('the rule is about the parent, and about its direction', () => {
  it('DECOY — a flex child of a ROW is not reported', () => {
    /*
     * THE CASE THAT KEEPS THIS USABLE. `flex` distributes the parent's MAIN axis: in a row that
     * is width, and a row's width is definite by default. Without this condition every `Row`
     * in the application is a finding — and a check that fires on correct code is a check
     * somebody switches off.
     */
    const row = node(
      'View',
      { flex: 1 },
      node('View', { flexDirection: 'row' }, node('View', { flex: 1 })),
    );

    expect(brokenFlexChains(row)).toStrictEqual([]);
  });

  it('reports the same child when the parent is a column, so the decoy above is not vacuous', () => {
    // The identical tree with the direction removed. If this did not fire, the row case would
    // be passing because the check finds nothing anywhere.
    const column = node('View', { flex: 1 }, node('View', null, node('View', { flex: 1 })));

    expect(brokenFlexChains(column)).toHaveLength(1);
  });

  it('accepts a chain anchored by an explicit height rather than by flex', () => {
    const anchored = node(
      'View',
      { flex: 1 },
      node('View', { height: 240 }, node('View', { flex: 1 })),
    );

    expect(brokenFlexChains(anchored)).toStrictEqual([]);
  });

  it('accepts a chain several definite wrappers deep', () => {
    const deep = node(
      'View',
      { flex: 1 },
      node('View', { flex: 1 }, node('View', { flexGrow: 1 }, node('View', { flex: 1 }))),
    );

    expect(brokenFlexChains(deep)).toStrictEqual([]);
  });

  it('does not report the ROOT, which is mounted in a full-height host', () => {
    // A subject whose own outermost node asks for flex is the ordinary case, not a defect.
    expect(brokenFlexChains(node('View', { flex: 1 }))).toStrictEqual([]);
  });

  it('reads flexGrow as well as flex, because they ask the same question', () => {
    const grow = node('View', { flex: 1 }, node('View', null, node('View', { flexGrow: 1 })));

    expect(brokenFlexChains(grow)).toHaveLength(1);
  });

  it('DECOY — a tree with no flex at all produces nothing, so a finding is a finding', () => {
    const flat = node('View', null, node('View', null, node('Text', null)));

    expect(brokenFlexChains(flat)).toStrictEqual([]);
  });
});
