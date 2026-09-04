/**
 * The gesture stack exports what HeroUI imports (F-157).
 *
 * ## Why this asserts a symbol rather than a version
 *
 * The defect was not "the range is unsatisfied". `pnpm peers check` reports the range, and that
 * is worth having — but a range can be satisfied by a package that has *moved the symbol*, and a
 * range can be violated by one that has not. Only one of those two breaks the app.
 *
 * What actually broke: `react-native-gesture-handler` 3 moved `GestureDetector` out of the
 * package root into a `v3` subtree and did not re-export it. `heroui-native` imports it from the
 * root in eleven places, so at every one of those sites the symbol was `undefined` — and
 * rendering an element whose type is `undefined` throws. Dialog, BottomSheet, Slider and Menu
 * would have crashed on render rather than degrading.
 *
 * So this asserts the thing that decides whether the app runs, and it will keep being true after
 * the next bump for a reason nobody has to remember. A version assertion would go stale the day
 * someone widens the range for an unrelated fix.
 */

import { render } from '@testing-library/react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Dialog, ThemeProvider } from '../src/index.js';

describe('the symbols heroui-native imports from the package root', () => {
  /*
   * THE ONE THAT WAS BROKEN. Named on its own rather than looped with `Gesture`, because they
   * failed differently: `Gesture` survived RNGH 3 as `GestureObjects as Gesture` and was fine
   * throughout, and a loop over both would have gone red without saying which.
   */
  it('exports GestureDetector — the symbol RNGH 3 moved to a v3 subtree', () => {
    expect(GestureDetector).toBeDefined();
    // A React element type must be a function or an object (memo/forwardRef both produce
    // objects). `undefined` is the failure mode this exists for, and it is what an
    // `import { X }` of a missing named export yields — silently, with no error at import.
    expect(['function', 'object']).toContain(typeof GestureDetector);
  });

  it('exports Gesture, which RNGH 3 kept', () => {
    expect(Gesture).toBeDefined();
    expect(typeof Gesture).toBe('object');
  });
});

describe('the components that depend on it', () => {
  /*
   * MOUNTING, NOT IMPORTING. F-143 ran a probe that imported `BottomSheet` and passed — which
   * proved only that a named export existed on the barrel, not that anything could render. The
   * crash lives in the element type at render time, which is one step further in.
   *
   * This is still not a device: jest has no native module, and the drag that is the whole point
   * of a sheet cannot happen here. It is the furthest this can be taken without one, and the
   * feature's attested criterion says so rather than implying otherwise.
   */
  it('Dialog renders through @irodora/ui without an undefined element type', () => {
    const tree = render(
      <ThemeProvider theme="light">
        <Dialog open onOpenChange={() => undefined} title="Reset preferences" closeLabel="Close" />
      </ThemeProvider>,
    );
    expect(tree.getByText('Reset preferences')).toBeTruthy();
  });
});
