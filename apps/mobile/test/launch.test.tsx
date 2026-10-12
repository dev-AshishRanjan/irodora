/**
 * The launch: the native splash, continued into mockup 14's splash, and handed over (F-190, F-231).
 *
 * ## What this is really asserting
 *
 * Not that an animation exists. That **there is no gap** — no blank frame, and no jump:
 *
 * - the native splash draws 14's mark at 14's size, and the overlay's first frame draws that mark,
 *   there, on that ground, and says so before anything hides the splash underneath it;
 * - the overlay becomes 14's composition — every `14.splash` element, in its token, in Sumi and
 *   Washi, in English and Japanese — laid out where 14 draws it;
 * - the travelling mark gives way to the lockup's own only when it has arrived, so the blossom is
 *   never shown twice;
 * - and the overlay follows the PHONE's appearance, which is all the native splash can follow.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;
let mockScheme: 'light' | 'dark' = 'dark';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme,
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { nativeArtStroke, nativeColors, nativeMotion, nativeType } from '@irodora/design-tokens';
import {
  illustrationBox,
  lockupGeometry,
  MARK,
  Mark,
  markInkBox,
  PROGRESS_TRACK,
  RISE,
  ThemeProvider,
} from '@irodora/ui';
import { animatedStyleOf, flattenStyle } from '@irodora/ui/testing';
import {
  GLOW_BLOOM_FROM,
  Launch,
  LAUNCH_GLOW,
  LAUNCH_HOLD,
  LAUNCH_RISE,
  LAUNCH_SPACING,
  LaunchHost,
  launchLayout,
  launchLine,
  launchProgress,
  SILK_WAVE_LINES_END,
  SPLASH_MARK,
  SPLASH_MARK_DY,
} from '../src/launch';
import { SPLASH_IMAGE_WIDTH } from '../app.config';
import brandAssets from '../assets/brand/brand-assets.json' with { type: 'json' };
import { t } from '../src/i18n';

/*
 * FAKE TIMERS, for the reason `sheet.test.tsx` records: reanimated installs a mapper whose input
 * walk reaches React Native's module namespace and throws on the first native module the harness
 * lacks, on a timer, after the render. Here they are load-bearing twice over — the sequence itself
 * is built on `setTimeout`, and driving it is the point.
 */
beforeEach(() => {
  jest.useFakeTimers();
  mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  mockScheme = 'dark';
});
afterEach(() => {
  jest.useRealTimers();
});

const hidden = { includeHiddenElements: true } as const;
const draw = (
  onShown: () => void = () => undefined,
  onDone: () => void = () => undefined,
  theme: 'dark' | 'light' = 'dark',
): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={theme}>
      <Launch onShown={onShown} onDone={onDone} />
    </ThemeProvider>,
  );
const named = (n: { type: unknown }): string => {
  const type = n.type as string | { displayName?: string; name?: string };
  return typeof type === 'string' ? type : (type.displayName ?? type.name ?? '');
};
const svgs = (root: ReturnType<typeof render>['UNSAFE_root']) =>
  root.findAll((n) => named(n) === 'Svg' || named(n) === 'RNSVGSvgView');

/** 14, read as the inventory records it: the splash's boxes in dp from the screen's corner. */
interface Element {
  readonly id: string;
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly raw?: Readonly<Record<string, number>>;
}
const fourteen = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '14.json'), 'utf8'),
) as {
  readonly elements: readonly Element[];
  readonly frame: {
    readonly screens: readonly {
      readonly id: string;
      readonly box: { readonly h: number };
      readonly dpPerPx: number;
    }[];
  };
};
const at = (id: string): Element => {
  const found = fourteen.elements.find((e) => e.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};
const splashScreen = fourteen.frame.screens.find((s) => s.id === '14.splash');
if (splashScreen === undefined) throw new Error('14.splash');
const FRAME = { width: 384, height: splashScreen.box.h * splashScreen.dpPerPx };

describe("the native splash is 14's mark, at 14's size (F-231)", () => {
  /** The grid a native image draws: the image's grid at the image's width. */
  const nativeGrid = (imageWidth: number, grid: number, canvas: number): number =>
    (imageWidth * grid) / canvas;

  it("draws its grid at the splash lockup's, within a tenth of a dp", () => {
    // The hand-over defect F-230 found: the grid on screen is the image's width times the grid's
    // share, not the width. The lockup the overlay settles into is 14's (ADR-0123).
    expect(Math.abs(SPLASH_MARK - lockupGeometry('splash').mark)).toBeLessThanOrEqual(0.1);
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
    const box = markInkBox();
    const inkCentring = ((MARK.grid / 2 - (box.top + box.bottom) / 2) / MARK.grid) * SPLASH_MARK;
    // The table rounds the offset to a whole pixel of its 1024 canvas: under 0.15 pt at 244 pt.
    expect(Math.abs(SPLASH_MARK_DY - inkCentring)).toBeLessThanOrEqual(0.15);
    expect(SPLASH_MARK_DY).toBeGreaterThan(0);
  });

  it('and the config passes that same width to the native splash', () => {
    // The other end of the seam. A literal in `app.config.ts` would make the export decorative.
    const config = readFileSync(join(__dirname, '..', 'app.config.ts'), 'utf8');
    expect(config).toContain('imageWidth: SPLASH_IMAGE_WIDTH');
  });
});

describe("the first frame is the native splash's last", () => {
  it('draws the travelling mark at the native grid, centred where the image centres it', () => {
    const { getByTestId } = draw();
    const handover = getByTestId('launch.handover', hidden);
    const marks = handover.findAll((n) => named(n) === 'Svg' || named(n) === 'RNSVGSvgView');
    expect(marks.some((m) => m.props['width'] === SPLASH_MARK)).toBe(true);
    // DECOY: the image's width drawn as the grid — F-230's defect — is not what is drawn.
    expect(marks.some((m) => m.props['width'] === SPLASH_IMAGE_WIDTH)).toBe(false);
    const style = flattenStyle(handover.props['style']);
    // Centred by layout in the overlay's own box, as the native splash centres its image in the
    // screen — not placed by the window's reported size (F-231's review, M2) — its grid's centre
    // SPLASH_MARK_DY below the middle, and not moved across or scaled.
    expect(style).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(style['transform']).toStrictEqual([
      { translateX: 0 },
      { translateY: SPLASH_MARK_DY },
      { scale: 1 },
    ]);
  });

  it("starts with 14's composition withheld, so the first frame is the mark alone", () => {
    const { getByTestId } = draw();
    expect(flattenStyle(getByTestId('launch.composition', hidden).props['style'])['opacity']).toBe(
      0,
    );
  });

  it('draws the COMPONENT, not an exported picture of it (F-193) — the glow is the one mask', () => {
    /*
     * THE THIRD ARTEFACT IN THE COUPLING. The icon reaches `MARK` through the generator; the launch
     * reaches it by RENDERING `Mark`. Swapping it for an image would keep this screen identical
     * today and freeze it there. The one bitmap is the glow: a MASK the generator blurs from the
     * same geometry (`--check` holds it), tinted with the mark's token — ADR-0127.
     */
    const { UNSAFE_root } = draw();
    expect(
      svgs(UNSAFE_root).some(
        (s) => s.props['viewBox'] === `0 0 ${String(MARK.grid)} ${String(MARK.grid)}`,
      ),
    ).toBe(true);
    /*
     * ONE bitmap, and it is the glow. Counted, not compared: jest-expo compiles every image import
     * to the same stub, so a source cannot tell the mask from a picture of the mark here. WHICH
     * image it is, is `verify-app-glyphs`'s to hold (in lint): `src/launch.tsx` may import exactly
     * `launch-glow.png`, by its default binding, and nothing else (F-231's review, S2).
     */
    const images = UNSAFE_root.findAll(
      (n) => typeof n.type === 'string' && /^(Image|RNSVGImage)$/u.test(n.type),
    );
    const named_ = UNSAFE_root.findAll((n) => /^(Image|RNSVGImage)$/u.test(named(n)));
    expect(named_.length).toBeGreaterThan(0);
    expect(named_.filter((n) => typeof n.type !== 'string')).toHaveLength(1);
    expect(named_.find((n) => typeof n.type !== 'string')?.props['testID']).toBe('launch.glow');
    expect(images.every((n) => n.props['testID'] === 'launch.glow')).toBe(true);
  });

  it('is hidden from the accessibility tree — the app underneath is the real one', () => {
    const overlay = draw().getByTestId('launch', hidden);
    expect(overlay.props['accessibilityElementsHidden']).toBe(true);
    expect(overlay.props['pointerEvents']).toBe('none');
  });
});

describe("then it is 14's composition, every element in its token", () => {
  for (const [theme, palette] of [
    ['dark', nativeColors.dark],
    ['light', nativeColors.light],
  ] as const)
    it(`draws every 14.splash element in ${theme === 'dark' ? 'Sumi' : 'Washi'} (C17)`, () => {
      const tree = draw(undefined, undefined, theme);
      const style = (testID: string) =>
        flattenStyle(tree.getByTestId(testID, hidden).props['style']);
      expect(style('launch')['backgroundColor']).toBe(palette.background);
      // The glow: the mark's own ink, as a tint over the mask.
      expect(style('launch.glow')['tintColor']).toBe(palette.foreground);
      // That every 14.splash element is THERE is the inventory sweep's to assert (F-221, in
      // screens.test, both themes and both languages); this keeps the tokens each is drawn in.
      // The subline, in text.secondary.
      const subline = tree.getByText(t('en', 'brand.splashSubline'), hidden);
      expect(flattenStyle(subline.props['style'])['color']).toBe(palette['foreground.2']);
      // The wave, in text.tertiary.
      const wave = svgs(tree.UNSAFE_root).find(
        (s) => s.props['viewBox'] === `0 0 ${illustrationBox('silk-wave').join(' ')}`,
      );
      expect(wave).toBeDefined();
      const strokes = (wave?.findAll((n) => typeof n.props['stroke'] === 'string') ?? []).map(
        (n) => n.props['stroke'] as string,
      );
      expect(new Set(strokes)).toStrictEqual(new Set([palette['foreground.3']]));
      // The progress line: its track and fill.
      expect(style('launch.progress')['backgroundColor']).toBe(palette.border);
      expect(style('launch.progress.fill')['backgroundColor']).toBe(palette.foreground);
    });

  it('speaks Japanese around a tagline that is Japanese in both', () => {
    mockLanguageTag = 'ja-JP';
    const tree = draw();
    expect(tree.getByText(t('ja', 'brand.splashSubline'), hidden)).toBeTruthy();
    expect(tree.getByText('彩り・色の知性', hidden)).toBeTruthy();
    expect(t('ja', 'brand.splashSubline')).not.toBe(t('en', 'brand.splashSubline'));
  });
});

describe("laid out where 14 draws it (14's frame, 384 × 804.5 dp)", () => {
  const layout = launchLayout(FRAME, lockupGeometry('splash'), nativeType.latin.caption.lineHeight);
  /**
   * The tolerance: three of 14's pixels (4.1 dp). What the comparison carries: the frame's own reading
   * (its top edge is at 344.2 px, recorded 345), each box rounded to half a dp, and §2's snaps — the
   * subline's gap, 18.9 → 16, moves the centred group by 1.45 dp. The decoys sit 15 dp out.
   */
  const TOLERANCE = 3 * splashScreen.dpPerPx;

  it("puts the lockup where 14 does — its ink's top within three of 14's pixels", () => {
    expect(Math.abs(layout.lockup.y - at('14.splash.lockup').dp.y)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(layout.lockup.height - at('14.splash.lockup').dp.h)).toBeLessThanOrEqual(
      TOLERANCE,
    );
    // Centred on the screen: 14's line is centred to 0.2 px, its lockup drawn 3.3 px right.
    expect(layout.lockup.x + layout.lockup.width / 2).toBeCloseTo(FRAME.width / 2, 9);
  });

  it('DECOY — the lockup centred ALONE rides 15 dp high, outside the tolerance', () => {
    const alone = (FRAME.height - lockupGeometry('splash').height) / 2;
    expect(Math.abs(alone - at('14.splash.lockup').dp.y)).toBeGreaterThan(TOLERANCE);
  });

  it("puts the subline's caption under it at 14's gap, its cap top where 14's ink is", () => {
    // ~4 dp from a caption line's top to its cap top (see LAUNCH_SPACING).
    expect(Math.abs(layout.subline.y + 4 - at('14.splash.subline').dp.y)).toBeLessThanOrEqual(
      TOLERANCE,
    );
    expect(layout.subline.y - (layout.lockup.y + layout.lockup.height)).toBe(
      LAUNCH_SPACING.subline,
    );
  });

  it("puts the line at 14's foot and the wave's lines above it", () => {
    const line = at('14.splash.progress').dp;
    expect(Math.abs(layout.line.y - line.y)).toBeLessThanOrEqual(TOLERANCE);
    expect(layout.line.height).toBe(PROGRESS_TRACK);
    const wave = at('14.splash.wave').dp;
    const [, boxHeight] = illustrationBox('silk-wave');
    const linesStart = layout.wave.y + (layout.wave.height * 1.6) / boxHeight - nativeArtStroke / 2;
    const linesEnd =
      layout.wave.y + (layout.wave.height * SILK_WAVE_LINES_END) / boxHeight + nativeArtStroke / 2;
    expect(Math.abs(linesStart - wave.y)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(linesEnd - (wave.y + wave.h))).toBeLessThanOrEqual(TOLERANCE);
    expect(layout.wave.width).toBe(FRAME.width);
  });

  it("reads where silk-wave's lines end out of the drawing, not a copy of it", () => {
    const tree = draw();
    const wave = svgs(tree.UNSAFE_root).find(
      (s) => s.props['viewBox'] === `0 0 ${illustrationBox('silk-wave').join(' ')}`,
    );
    const ys = (wave?.findAll((n) => typeof n.props['d'] === 'string') ?? []).flatMap((n) =>
      [...(n.props['d'] as string).matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/gu)].map((m) =>
        Number(m[2]),
      ),
    );
    expect(ys.length).toBeGreaterThan(100);
    expect(Math.abs(Math.max(...ys) - SILK_WAVE_LINES_END)).toBeLessThanOrEqual(0.05);
  });

  it("puts the lockup's mark — where the travelling one arrives — on 14's", () => {
    const mark = at('14.splash.mark');
    const reach = (mark.raw?.['reachPx'] ?? NaN) * splashScreen.dpPerPx;
    // 14's grid centre: its ink's top plus the reach (petal 1 straight up touches the grid's top).
    const centreY = mark.dp.y + reach;
    expect(Math.abs(layout.mark.y + layout.mark.height / 2 - centreY)).toBeLessThanOrEqual(
      TOLERANCE,
    );
    expect(layout.mark.width).toBeCloseTo(lockupGeometry('splash').mark, 9);
  });

  it("draws the glow around that mark at 14's spread, read from 14's reading", () => {
    const sigmaOfGrid =
      (at('14.splash.glow').raw?.['sigmaPx'] ?? NaN) /
      (2 * (at('14.splash.mark').raw?.['reachPx'] ?? NaN));
    expect(LAUNCH_GLOW.sigmaOfGrid).toBeCloseTo(sigmaOfGrid, 4);
    expect(LAUNCH_GLOW.alpha).toBe(at('14.splash.glow').raw?.['alpha']);
    // Four deviations of margin on every side of the grid, inside the mask's canvas.
    expect((LAUNCH_GLOW.canvas - LAUNCH_GLOW.grid) / 2).toBeGreaterThanOrEqual(
      4 * LAUNCH_GLOW.sigmaOfGrid * LAUNCH_GLOW.grid,
    );
    expect(layout.glow.width).toBeCloseTo(
      (LAUNCH_GLOW.canvas / LAUNCH_GLOW.grid) * layout.mark.width,
      9,
    );
    expect(layout.glow.x + layout.glow.width / 2).toBeCloseTo(
      layout.mark.x + layout.mark.width / 2,
      9,
    );
  });
});

describe('the hand-over', () => {
  const lockupMark = (tree: ReturnType<typeof render>) => {
    const mark = tree
      .UNSAFE_getAllByType(Mark)
      .find((m) => !tree.getByTestId('launch.handover', hidden).findAll((n) => n === m).length);
    return mark?.parent === null || mark === undefined
      ? undefined
      : flattenStyle(mark.parent.props['style']);
  };

  it('shows the blossom once: the lockup withholds its mark until the travelling one arrives', () => {
    const tree = draw();
    expect(lockupMark(tree)?.['opacity']).toBe(0);
    act(() => {
      jest.advanceTimersByTime(260);
    });
    expect(tree.queryByTestId('launch.handover', hidden)).toBeNull();
    expect(tree.UNSAFE_getAllByType(Mark)).toHaveLength(1);
    const shown = tree.UNSAFE_getByType(Mark).parent;
    expect(shown === null ? undefined : flattenStyle(shown.props['style'])['opacity']).not.toBe(0);
  });

  /*
   * THE LINE KEEPS PACE WITH THE SEQUENCE (F-266, ADR-0133 §2). It heads for the next step's value
   * over that step, so it is half-way as the mark arrives and full before the app appears. Read with
   * `animatedStyleOf`: the worklet's live scale, not the style it mounted with.
   */
  const lineOf = (tree: ReturnType<typeof render>): number =>
    (
      animatedStyleOf(tree.getByTestId('launch.progress.fill', hidden))['transform'] as {
        scaleX: number;
      }[]
    )[0]?.scaleX ?? NaN;
  const RISE = nativeMotion.durations[LAUNCH_RISE];
  const HOLD = nativeMotion.durations[LAUNCH_HOLD];
  /**
   * The clock, a frame at a time, each in its own act(), as a device runs it (F-231's review, B1).
   * One act() over a whole step holds the arrival's state change until the end of it, so the next
   * segment would start a step late — a harness artefact, not the line's (F-266).
   */
  const run = (ms: number): void => {
    for (let left = ms; left > 0; left -= 20)
      act(() => {
        jest.advanceTimersByTime(Math.min(20, left));
      });
  };

  it('fills the line as the launch gets there: 0, then half, then all', () => {
    expect([
      launchProgress('native'),
      launchProgress('arrived'),
      launchProgress('leaving'),
    ]).toEqual([0, 0.5, 1]);
    const done: string[] = [];
    const tree = draw(undefined, () => done.push('done'));
    expect(lineOf(tree)).toBe(0);
    run(RISE - 20);
    // A frame before the arrival it is nearly half-way. DECOY: a line that set off only once the
    // step was reached would still read launchProgress('native'), 0.
    expect(lineOf(tree)).toBeGreaterThan(0.4);
    expect(lineOf(tree)).toBeLessThanOrEqual(0.5);
    run(20 + HOLD);
    // The hold is over and the overlay is about to leave: the line is full, and the app is not yet.
    expect(lineOf(tree)).toBeCloseTo(1, 2);
    expect(done).toHaveLength(0);
  });

  it('never runs backwards, and never past its end', () => {
    const tree = draw();
    let last = 0;
    for (let t = 0; t < RISE + HOLD + RISE; t += 20) {
      act(() => {
        jest.advanceTimersByTime(20);
      });
      const now = lineOf(tree);
      expect(now).toBeGreaterThanOrEqual(last);
      expect(now).toBeLessThanOrEqual(1);
      last = now;
    }
  });
});

/**
 * THE AMBIENCE (F-266, ADR-0133 §2): the glow blooms on the mark's arrival, from the mark's grid, and
 * the wave rises into place with the mark. Read live with `animatedStyleOf`, a frame per act().
 */
describe('the glow blooms on arrival and the wave rises with the mark (F-266)', () => {
  const RISE_MS = nativeMotion.durations[LAUNCH_RISE];
  const HOLD_MS = nativeMotion.durations[LAUNCH_HOLD];
  afterEach(() => {
    jest.restoreAllMocks();
  });
  const run = (ms: number): void => {
    for (let left = ms; left > 0; left -= 20)
      act(() => {
        jest.advanceTimersByTime(Math.min(20, left));
      });
  };
  const live = (tree: ReturnType<typeof render>, id: string) =>
    animatedStyleOf(tree.getByTestId(id, hidden));
  const scaleOf = (style: Readonly<Record<string, unknown>>): number =>
    (style['transform'] as { scale?: number; translateY?: number }[])[0]?.scale ?? NaN;
  const riseOf = (style: Readonly<Record<string, unknown>>): number =>
    (style['transform'] as { translateY?: number }[])[0]?.translateY ?? NaN;

  it("starts the bloom at the mark's own grid within the glow, read from the drawings table", () => {
    expect(GLOW_BLOOM_FROM).toBe(brandAssets.glow.grid / brandAssets.glow.canvas);
    expect(GLOW_BLOOM_FROM).toBeGreaterThan(0);
    expect(GLOW_BLOOM_FROM).toBeLessThan(1);
  });

  it('keeps the glow dark while the mark travels', () => {
    const tree = draw();
    run(RISE_MS / 2);
    expect(live(tree, 'launch.glow.bloom')['opacity']).toBe(0);
    expect(scaleOf(live(tree, 'launch.glow.bloom'))).toBe(GLOW_BLOOM_FROM);
    // DECOY: the composition it sits in is already fading in, so a glow tied to it would show.
    expect(live(tree, 'launch.composition')['opacity']).toBeGreaterThan(0);
  });

  it('blooms over the hold, from the grid to its drawn spread, and rests there', () => {
    const tree = draw();
    run(RISE_MS + HOLD_MS / 2);
    const mid = live(tree, 'launch.glow.bloom');
    expect(mid['opacity']).toBeGreaterThan(0);
    expect(mid['opacity']).toBeLessThan(1);
    expect(scaleOf(mid)).toBeGreaterThan(GLOW_BLOOM_FROM);
    expect(scaleOf(mid)).toBeLessThan(1);
    // Mid-bloom it animates opacity and a transform, nothing else, and its tint has not moved.
    expect(Object.keys(mid).sort()).toStrictEqual(['opacity', 'transform']);
    expect(flattenStyle(tree.getByTestId('launch.glow', hidden).props['style'])['tintColor']).toBe(
      nativeColors.dark.foreground,
    );
    run(HOLD_MS);
    const rest = live(tree, 'launch.glow.bloom');
    expect(rest['opacity']).toBe(1);
    expect(scaleOf(rest)).toBe(1);
  });

  it('rises the wave by one step of the scale into its drawn place, with the mark', () => {
    const tree = draw();
    expect(riseOf(live(tree, 'launch.wave'))).toBe(RISE);
    run(RISE_MS / 2);
    expect(riseOf(live(tree, 'launch.wave'))).toBeGreaterThan(0);
    expect(riseOf(live(tree, 'launch.wave'))).toBeLessThan(RISE);
    run(RISE_MS);
    expect(riseOf(live(tree, 'launch.wave'))).toBe(0);
    expect(Object.keys(live(tree, 'launch.wave'))).toStrictEqual(['transform']);
  });

  it('under reduced motion, the glow is bloomed and the wave in place at once', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const tree = draw();
    await act(async () => {
      await Promise.resolve();
    });
    run(20);
    expect(live(tree, 'launch.glow.bloom')['opacity']).toBe(1);
    expect(scaleOf(live(tree, 'launch.glow.bloom'))).toBe(1);
    expect(riseOf(live(tree, 'launch.wave'))).toBe(0);
  });
});

describe('launchLine: the step the line heads for (F-266)', () => {
  const phases = ['native', 'arrived', 'leaving'] as const;
  it('is the next step’s value while the sequence runs, and 0 before it starts', () => {
    expect(phases.map((p) => launchLine(p, true, false))).toEqual([0.5, 1, 1]);
    expect(phases.map((p) => launchLine(p, false, false))).toEqual([0, 0, 0]);
  });
  it('is the step reached under reduced motion, started or not', () => {
    for (const started of [true, false])
      expect(phases.map((p) => launchLine(p, started, true))).toEqual(
        phases.map((p) => launchProgress(p)),
      );
  });
});

describe('in the phone’s appearance, as the native splash is', () => {
  it('follows the phone, not a theme chosen in the app', () => {
    mockScheme = 'light';
    const tree = render(
      <ThemeProvider appearance="slate">
        <LaunchHost onShown={() => undefined} onDone={() => undefined} />
      </ThemeProvider>,
    );
    expect(flattenStyle(tree.getByTestId('launch', hidden).props['style'])['backgroundColor']).toBe(
      nativeColors.light.background,
    );
  });

  it('DECOY — without the host, an in-app Slate reaches the overlay and flips it', () => {
    mockScheme = 'light';
    const tree = render(
      <ThemeProvider appearance="slate">
        <Launch onShown={() => undefined} onDone={() => undefined} />
      </ThemeProvider>,
    );
    expect(flattenStyle(tree.getByTestId('launch', hidden).props['style'])['backgroundColor']).toBe(
      nativeColors['slate.dark'].background,
    );
  });
});

describe('under reduced motion nothing moves, and 14 is still seen', () => {
  /*
   * F-231's review (S1): the composition flashed for a frame or two and the app arrived. Now the
   * composition is drawn at rest at once — a cut, which is what reduced motion asks for in place of
   * the rise — held for the same beat, then the app, cut again. Nothing fades.
   */
  const reducedMotion = async (): Promise<ReturnType<typeof render>> => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const order: string[] = [];
    const tree = draw(
      () => order.push('shown'),
      () => order.push('done'),
    );
    await act(async () => {
      await Promise.resolve();
    });
    return Object.assign(tree, { order });
  };
  afterEach(() => {
    jest.restoreAllMocks();
  });
  /** Reanimated's own accessor: `props.style` is an animated element's style as it was at mount. */
  const live = (node: unknown): Record<string, unknown> =>
    getAnimatedStyle(node as never) as unknown as Record<string, unknown>;

  it('draws the composition at rest at once: no rise, the mark in the lockup', async () => {
    const tree = await reducedMotion();
    // One frame, well inside the hold: reanimated applies a shared value's new value on the next.
    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(tree.queryByTestId('launch.handover', hidden)).toBeNull();
    expect(live(tree.getByTestId('launch.composition', hidden))['opacity']).toBe(1);
    expect(tree.UNSAFE_getAllByType(Mark)).toHaveLength(1);
    // The line is at the step reached, half-way, and does not travel there (F-266).
    expect(
      animatedStyleOf(tree.getByTestId('launch.progress.fill', hidden))['transform'],
    ).toStrictEqual([{ scaleX: launchProgress('arrived') }]);
  });

  it('holds it for the beat, then the app — and never fades the overlay', async () => {
    const tree = await reducedMotion();
    const { order } = tree as unknown as { order: string[] };
    act(() => {
      jest.advanceTimersByTime(260 - 1);
    });
    // DECOY: a flash is a composition gone before its hold.
    expect(order).toEqual(['shown']);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(order).toEqual(['shown', 'done']);
    expect(live(tree.getByTestId('launch', hidden))['opacity']).toBe(1);
  });
});

describe('the order is the feature', () => {
  /**
   * THE ASSERTION THIS FILE EXISTS FOR. `onShown` is what the root layout calls
   * `SplashScreen.hideAsync()` from. Firing it before the overlay is on screen is the blank frame
   * again, one layer up.
   */
  it('says it is shown only once it has rendered', () => {
    const order: string[] = [];
    draw(
      () => order.push('shown'),
      () => order.push('done'),
    );
    expect(order).toEqual(['shown']);
  });

  it('finishes, once, so the overlay does not sit on the app forever', () => {
    /*
     * STEP BY STEP, each in its own act(), as a device runs it (F-231's review, B1). One act()
     * holding every state update until all the timers had fired is what let a sequence pass that
     * cancelled its own next step on every phase change and looped between its last two forever.
     */
    const order: string[] = [];
    const tree = draw(
      () => order.push('shown'),
      () => order.push('done'),
    );
    const progress: number[] = [];
    // The worklet's live scale (F-266): `props.style` holds only the value it mounted with.
    const fill = () =>
      (
        animatedStyleOf(tree.getByTestId('launch.progress.fill', hidden))['transform'] as {
          scaleX: number;
        }[]
      )[0]?.scaleX ?? NaN;
    for (let ms = 0; ms < 5000; ms += 20) {
      act(() => {
        jest.advanceTimersByTime(20);
      });
      progress.push(fill());
    }
    expect(order).toEqual(['shown', 'done']);
    // The line only ever moves forward, never past its end, passes the arrival's half and ends full.
    expect(progress.every((v, i) => i === 0 || v >= (progress[i - 1] ?? 0))).toBe(true);
    expect(progress.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(progress).toContain(launchProgress('arrived'));
    expect(progress.at(-1)).toBe(1);
  });

  it('and finishes when every timer fires at once too', () => {
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

  /** A DECOY: a `Launch` that finished at once would pass the case above. */
  it('DECOY — and does NOT finish before its rise and its hold have elapsed', () => {
    const order: string[] = [];
    draw(
      () => order.push('shown'),
      () => order.push('done'),
    );
    act(() => {
      jest.advanceTimersByTime(260 + 260 - 1);
    });
    expect(order).toEqual(['shown']);
  });
});
