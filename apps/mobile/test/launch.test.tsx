/**
 * The hand-over from the native splash, and the order that makes it one.
 *
 * ## What this is really asserting
 *
 * Not that an animation exists. That **the blank frame is gone**.
 *
 * Nothing called `SplashScreen.preventAutoHideAsync()`, and `expo-splash-screen` hides the
 * native splash the moment the React root renders its first frame — which was `<></>` while the
 * Japanese font subset loaded. Every cold start went splash → **blank screen** → app.
 *
 * The two properties that remove it are both order and both checkable here: the overlay draws
 * the same mark at the same width the native splash used, and it says so **before** anything
 * hides the splash underneath it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { Launch } from '../src/launch';
import { SPLASH_IMAGE_WIDTH } from '../app.config';

/*
 * FAKE TIMERS, for the reason `sheet.test.tsx` records: reanimated installs a mapper whose
 * input walk reaches React Native's module namespace and throws on the first native module the
 * harness lacks, on a timer, after the render. Here they are load-bearing twice over — the
 * sequence itself is built on `setTimeout`, and driving it is the point.
 */
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const draw = (
  onShown: () => void = () => undefined,
  onDone: () => void = () => undefined,
): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme="dark">
      <Launch onShown={onShown} onDone={onDone} />
    </ThemeProvider>,
  );

describe('the overlay continues the native splash rather than replacing it', () => {
  it('draws the mark at the width the native splash used', () => {
    /*
     * READ FROM THE SAME EXPORT the config passes to `expo-splash-screen`. A second copy of the
     * number is a hand-over that drifts by a few points and reads as a jump at exactly the
     * moment somebody is looking at it.
     *
     * `includeHiddenElements` because the overlay hides itself from the accessibility tree and
     * RNTL 13 skips such subtrees by default — the query failing without it is not a bug, it is
     * the evidence for the case below.
     */
    const { UNSAFE_root } = draw();
    const marks = UNSAFE_root.findAll((n) => {
      const t = n.type as string | { displayName?: string; name?: string };
      const name = typeof t === 'string' ? t : (t.displayName ?? t.name ?? '');
      return name === 'Svg' || name === 'RNSVGSvgView';
    });
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.some((m) => m.props['width'] === SPLASH_IMAGE_WIDTH)).toBe(true);
  });

  it('and the config passes that same number to the native splash', () => {
    // The other end of the seam. A literal in `app.config.ts` would make the export decorative.
    const config = readFileSync(join(__dirname, '..', 'app.config.ts'), 'utf8');
    expect(config).toContain('imageWidth: SPLASH_IMAGE_WIDTH');
  });

  it('is hidden from the accessibility tree — the app underneath is the real one', () => {
    /*
     * The overlay is decoration over a real tree. A screen reader stopping on it at launch is a
     * stop that says nothing, and the app beneath is already the accessible product.
     *
     * `includeHiddenElements` is what makes this findable AT ALL, which is the assertion
     * arriving twice: the query needs the flag precisely because the hiding works.
     */
    const { getByTestId } = draw();
    const overlay = getByTestId('launch', { includeHiddenElements: true });
    expect(overlay.props['accessibilityElementsHidden']).toBe(true);
    expect(overlay.props['pointerEvents']).toBe('none');
  });
});

describe('the order is the feature', () => {
  /**
   * THE ASSERTION THIS FILE EXISTS FOR.
   *
   * `onShown` is what the root layout calls `SplashScreen.hideAsync()` from. Firing it before
   * the overlay is on screen is the blank frame again, one layer up — and it is the easy
   * mistake, because "hide the splash then show ours" reads as the natural order.
   */
  it('says it is shown only once it has rendered', () => {
    const order: string[] = [];
    render(
      <ThemeProvider theme="dark">
        <Launch onShown={() => order.push('shown')} onDone={() => order.push('done')} />
      </ThemeProvider>,
    );
    // The effect runs after the first commit, so by the time this fires there IS a frame.
    expect(order).toEqual(['shown']);
  });

  it('finishes, so the overlay does not sit on the app forever', () => {
    const order: string[] = [];
    draw(
      () => order.push('shown'),
      () => order.push('done'),
    );
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(order).toEqual(['shown', 'done']);
  });

  /**
   * A DECOY. Without it, a `Launch` that called `onDone` immediately would pass the case above
   * and remove the sequence entirely — which is exactly what "make the test green" looks like.
   */
  it('DECOY — and does NOT finish before its hold has elapsed', () => {
    const order: string[] = [];
    draw(
      () => order.push('shown'),
      () => order.push('done'),
    );
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(order).toEqual(['shown']);
  });
});
