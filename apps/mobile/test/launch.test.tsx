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
import { lockupGeometry, MARK, markInkBox, ThemeProvider } from '@irodora/ui';
import { Launch, SPLASH_MARK, SPLASH_MARK_DY } from '../src/launch';
import { SPLASH_IMAGE_WIDTH } from '../app.config';
import brandAssets from '../assets/brand/brand-assets.json' with { type: 'json' };

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

describe("the native splash is 14's mark, at 14's size (F-231)", () => {
  /** The grid a native image draws: the image's grid at the image's width. */
  const nativeGrid = (imageWidth: number, grid: number, canvas: number): number =>
    (imageWidth * grid) / canvas;

  it("draws its grid at the splash lockup's, within a tenth of a dp", () => {
    /*
     * THE HAND-OVER DEFECT F-230 FOUND. The image is a canvas with the mark on a grid inside it, so
     * the grid on screen is the image's width times the grid's share — not the width. The lockup
     * the overlay settles into is 14's (`lockupGeometry`, ADR-0123); the native image is held to it.
     */
    const lockup = lockupGeometry('splash').mark;
    expect(Math.abs(SPLASH_MARK - lockup)).toBeLessThanOrEqual(0.1);
  });

  it("DECOY — F-230's splash, a 768 grid at 160 pt, is 120 dp and is refused", () => {
    const lockup = lockupGeometry('splash').mark;
    expect(Math.abs(nativeGrid(160, 768, 1024) - lockup)).toBeGreaterThan(0.1);
    // And the overlay's old size, the image's width drawn as the grid: a third larger again.
    expect(Math.abs(160 - nativeGrid(160, 768, 1024))).toBeGreaterThan(0.1);
  });

  it('reads the grid from the drawings table, the light image and the dark one alike', () => {
    const { splashLight, splashDark } = brandAssets.drawings;
    expect(splashLight).toStrictEqual({ ...splashDark, file: splashLight.file });
    expect(SPLASH_MARK).toBe(nativeGrid(SPLASH_IMAGE_WIDTH, splashDark.grid, splashDark.canvas));
  });

  it("puts the grid's centre where centring the INK puts it (ADR-0126)", () => {
    // The ink box's centre sits above the grid's; the grid moves down by the difference.
    const box = markInkBox();
    const inkCentring = ((MARK.grid / 2 - (box.top + box.bottom) / 2) / MARK.grid) * SPLASH_MARK;
    // The table rounds the offset to a whole pixel of its 1024 canvas: under 0.15 pt at 244 pt.
    expect(Math.abs(SPLASH_MARK_DY - inkCentring)).toBeLessThanOrEqual(0.15);
    expect(SPLASH_MARK_DY).toBeGreaterThan(0);
  });
});

describe('the overlay continues the native splash rather than replacing it', () => {
  it('draws the mark at the grid the native splash drew, where it drew it', () => {
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
    expect(marks.some((m) => m.props['width'] === SPLASH_MARK)).toBe(true);
    // DECOY: the image's width drawn as the grid — the defect — is not what is drawn.
    expect(marks.some((m) => m.props['width'] === SPLASH_IMAGE_WIDTH)).toBe(false);
    const placed = UNSAFE_root.findAll(
      (n) =>
        (n.type as unknown) === 'View' &&
        (n.props['style'] as { top?: number } | undefined)?.top === SPLASH_MARK_DY,
    );
    expect(placed.length).toBeGreaterThan(0);
  });

  it('and the config passes that same number to the native splash', () => {
    // The other end of the seam. A literal in `app.config.ts` would make the export decorative.
    const config = readFileSync(join(__dirname, '..', 'app.config.ts'), 'utf8');
    expect(config).toContain('imageWidth: SPLASH_IMAGE_WIDTH');
  });

  it('draws the COMPONENT, not an exported picture of it (F-193)', () => {
    /*
     * THE THIRD ARTEFACT IN THE COUPLING. The icon and the wordmark reach `MARK` through the
     * generator, which parses it and refuses to guess. The launch reaches it by RENDERING
     * `Mark` — a fact about source, not about numbers, and the one that is easiest to lose:
     * swapping `<Mark />` for `<Image source={require(...)} />` is a normal-looking change that
     * would keep this screen pixel-identical today and freeze it at that pixel forever, which
     * is how an icon and an in-app mark drift apart in most products.
     *
     * The viewBox is read from `MARK.grid` rather than written as 24, so a grid change moves
     * this assertion with it instead of turning it red.
     */
    const { UNSAFE_root } = draw();
    const named = (n: { type: unknown }): string => {
      const t = n.type as string | { displayName?: string; name?: string };
      return typeof t === 'string' ? t : (t.displayName ?? t.name ?? '');
    };

    const svgs = UNSAFE_root.findAll((n) => named(n) === 'Svg' || named(n) === 'RNSVGSvgView');
    expect(
      svgs.some((s) => s.props['viewBox'] === `0 0 ${String(MARK.grid)} ${String(MARK.grid)}`),
    ).toBe(true);

    // The decoy the case exists for: an SVG being present would still be true of a screen that
    // ALSO shipped a bitmap, and a bitmap is the thing that stops following the mark.
    expect(UNSAFE_root.findAll((n) => /^(Image|RNSVGImage)$/u.test(named(n)))).toStrictEqual([]);
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
