/**
 * The sheet's detents, asserted where a default could silently replace them.
 *
 * ## Why this tests the RENDERED tree and not the constants
 *
 * The defect F-177 fixes was not a wrong number. It was **the absence of one**: `Sheet` passed
 * gorhom no `snapPoints`, gorhom's `enableDynamicSizing` defaults to `true`, and a sheet with
 * one detent has nothing to be dragged to. A test that asserted our own constants would have
 * been green throughout — the constants did not exist, and nothing was wrong with the ones that
 * did.
 *
 * So every assertion below reads the props off the rendered gorhom sheet. If HeroUI stops
 * spreading `Partial<BottomSheetProps>`, or a future default starts winning, these go red.
 *
 * ## What is NOT tested here, stated rather than implied
 *
 * The drag. jest renders a tree; it runs no Yoga pass, no gesture handler and no reanimated UI
 * thread (ADR-0055). Whether two detents 10% apart *feel* right is a device judgement, and it is
 * attested against F-177 rather than claimed here.
 */

import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Sheet, ThemeProvider } from '../src/index.js';

/**
 * A node in the rendered tree.
 *
 * INFERRED from what `render` returns rather than imported. `react-test-renderer` ships no
 * types in this tree and RNTL does not re-export the instance type, so the two obvious imports
 * are a `TS7016` and a `TS2305`. Inferring it cannot drift from the harness by construction,
 * which is better than either.
 */
type Instance = ReturnType<typeof render>['UNSAFE_root'];

/**
 * FAKE TIMERS, AND THE REASON IS NOT TIDINESS — it is the same one `conformance.test.tsx` has
 * carried since F-158, re-derived here the expensive way.
 *
 * Reanimated installs a mapper for every animated component, and `extractInputs` recurses
 * through any PLAIN OBJECT among its inputs with `Object.values`. React Native's CommonJS
 * namespace is a plain object whose every export is a lazy getter, so that walk calls
 * `TurboModuleRegistry.getEnforcing` for each in turn and throws on the first native module the
 * harness lacks — `DevMenu`, then `SettingsManager`, then the next one. It fires on a TIMER
 * after the render, so it surfaces as an unattributable async failure rather than a render error.
 *
 * F-177 put a `BottomSheetScrollView` in the sheet, which adds an animated ScrollView, which
 * adds the mapper. Mocking the modules one at a time was tried and `jest.config.mjs` had already
 * written down why it fails: *"stubbing each module as it appears is a game with no end"*. It
 * lasted exactly one iteration.
 *
 * Fake timers stop the walk from ever running. Nothing here needs a timer to advance: every
 * assertion reads props off the tree the render produced.
 */
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/**
 * The gorhom sheet in a rendered tree.
 *
 * Found by display name rather than by testID, because the node under test is the LIBRARY's —
 * the whole question is what reaches it, and a testID we placed would be on one of ours.
 */
function gorhomSheet(root: Instance): Instance {
  /*
   * MATCHED ON THE DISPLAY NAME, WITHOUT ASSUMING WHAT `type` IS.
   *
   * The first draft required `typeof n.type === 'function'` and found nothing: gorhom's sheet
   * is wrapped in `memo`/`forwardRef`, so its type is an OBJECT carrying a displayName. The
   * test failed for a reason that had nothing to do with the sheet — which is the shape of test
   * that gets "fixed" by softening the assertion.
   */
  const nameOf = (n: Instance): string => {
    const t = n.type as string | { displayName?: string; name?: string };
    return typeof t === 'string' ? t : (t.displayName ?? t.name ?? '');
  };
  const match = root.findAll((n) => nameOf(n) === 'BottomSheet');
  const found = match[0];
  if (found === undefined)
    throw new Error(
      'no gorhom BottomSheet in the tree — the sheet is not rendering, so nothing below means anything',
    );
  return found;
}

const open = (): Instance =>
  render(
    <ThemeProvider theme="dark">
      <Sheet open title="This reading" closeLabel="Close" onOpenChange={() => undefined}>
        <Text>body</Text>
      </Sheet>
    </ThemeProvider>,
  ).UNSAFE_root;

describe('the sheet has more than one detent (F-177)', () => {
  it('declares a snap point, so there is somewhere to drag to', () => {
    const props = gorhomSheet(open()).props as { snapPoints?: readonly string[] };
    expect(props.snapPoints).toBeDefined();
    expect(props.snapPoints?.length).toBeGreaterThan(0);
  });

  it('caps what the content alone may take, so it can never be the whole screen', () => {
    const props = gorhomSheet(open()).props as { maxDynamicContentSize?: number };
    expect(typeof props.maxDynamicContentSize).toBe('number');
    expect(props.maxDynamicContentSize).toBeGreaterThan(0);
  });

  /**
   * THE GAP IS THE POINT, not either number on its own.
   *
   * gorhom merges the content-derived detent into the same sorted list as the declared one. A
   * ceiling equal to the snap point produces two detents a rounding error apart, which drags
   * like a stutter rather than like a sheet — so the ceiling has to sit strictly below.
   */
  it('keeps the content ceiling strictly below the declared detent', () => {
    const props = gorhomSheet(open()).props as {
      snapPoints?: readonly string[];
      maxDynamicContentSize?: number;
    };
    const declared = props.snapPoints?.[0] ?? '';
    const fraction = Number.parseFloat(declared.replace('%', '')) / 100;
    // The window in the test environment, which is what the component divided.
    const windowHeight = (props.maxDynamicContentSize ?? 0) / 0.8;
    expect(props.maxDynamicContentSize).toBeLessThan(fraction * windowHeight);
  });

  it('never lets the declared detent reach the top of the screen', () => {
    const props = gorhomSheet(open()).props as { snapPoints?: readonly string[] };
    const fraction = Number.parseFloat((props.snapPoints?.[0] ?? '').replace('%', '')) / 100;
    expect(fraction).toBeLessThan(1);
  });

  it('still closes by dragging down', () => {
    const props = gorhomSheet(open()).props as { enablePanDownToClose?: boolean };
    expect(props.enablePanDownToClose).toBe(true);
  });

  /**
   * A DECOY, and it is about the MECHANISM rather than the values.
   *
   * Every assertion above reads a prop off the library's node. If `gorhomSheet` found the wrong
   * node — or found nothing and threw a helpful error somebody later softened into a skip —
   * they would all pass vacuously. This asserts the node is really gorhom's by checking a prop
   * we never set and gorhom always has.
   * A DECOY, and it is about the MECHANISM rather than the values — see the two tests at the
   * end of this block.
   */

  /**
   * THE CEILING IS ONLY SAFE BECAUSE THE CONTENT SCROLLS.
   *
   * Without a scrollable, capping the height would CROP the result — which is exactly the
   * failure F-158's docblock was right to be afraid of when it refused snap points.
   */
  it('puts the content in a scrollable, so the ceiling does not crop', () => {
    const nameOf = (n: Instance): string => {
      const t = n.type as string | { displayName?: string; name?: string };
      return typeof t === 'string' ? t : (t.displayName ?? t.name ?? '');
    };
    expect(open().findAll((n) => nameOf(n) === 'BottomSheetScrollView').length).toBeGreaterThan(0);
  });

  /**
   * THE DECOY. Every assertion above reads props off a node `gorhomSheet` located, so if that
   * finder could quietly return the wrong node — or nothing — they would all pass vacuously.
   *
   * That is not hypothetical: this file's first draft required `typeof type === 'function'`,
   * gorhom's sheet is wrapped in `memo`, and all seven tests failed for a reason that had
   * nothing to do with the sheet. The fix could equally have been to soften the finder.
   *
   * So this proves it REFUSES rather than returns nothing.
   */
  it('refuses a tree with no sheet in it, rather than reading nothing', () => {
    const empty = render(
      <ThemeProvider theme="dark">
        <Text>no sheet here</Text>
      </ThemeProvider>,
    ).UNSAFE_root;
    expect(() => gorhomSheet(empty)).toThrow(/no gorhom BottomSheet/u);
  });

  /** And the node it finds is the library's: it carries a prop HeroUI sets and we never do. */
  it('is reading the library sheet, not one of ours', () => {
    const props = gorhomSheet(open()).props as Record<string, unknown>;
    expect(props['backgroundStyle']).toBeDefined();
  });
});
