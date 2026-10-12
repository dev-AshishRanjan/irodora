/**
 * The progress line (F-231; mockup 14, `14.splash.progress`).
 *
 * - **Its thickness is 14's**, recomputed from the inventory's reading, with the value it could have
 *   been as a decoy.
 * - **The value is a length drawn by a transform**, never a width keyed to the value and never a
 *   colour: the fill's ink is the same at every value.
 * - **Decorative**: its one caller sits on an overlay a screen reader never stops on.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect } from 'react';
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { nativeColors, nativeMotion } from '@irodora/design-tokens';
import { PROGRESS_TRACK, ProgressBar, ThemeProvider } from '../src/index.js';
import { animatedStyleOf, flattenStyle } from '../src/testing/index.js';

interface Element {
  readonly id: string;
  readonly raw?: Readonly<Record<string, number>>;
  readonly tokens: Readonly<Record<string, string>>;
}
interface Inventory {
  readonly elements: readonly Element[];
  readonly frame: {
    readonly screens: readonly { readonly id: string; readonly dpPerPx: number }[];
  };
}
const fourteen = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '14.json'), 'utf8'),
) as Inventory;
const progress = fourteen.elements.find((e) => e.id === '14.splash.progress');
if (progress === undefined) throw new Error('14.splash.progress');
const scale = fourteen.frame.screens.find((s) => s.id === '14.splash')?.dpPerPx ?? NaN;
const half = (v: number): number => Math.round(v * 2) / 2;

const draw = (node: React.JSX.Element, theme: 'dark' | 'light' = 'dark') =>
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);

describe("the line is 14's", () => {
  it('is as thick as 14 draws it, to the half dp', () => {
    expect(half((progress.raw?.['trackPx'] ?? NaN) * scale)).toBe(PROGRESS_TRACK);
  });

  it("DECOY — the box F-220 first recorded, 5 px, is not 14's line", () => {
    // 5 px ran into the bar's anti-aliasing; at half maximum the line is 3.1.
    expect(half(5 * scale)).not.toBe(PROGRESS_TRACK);
  });

  it('binds the track to border.subtle and the fill to text.primary, as 14 does', () => {
    expect(progress.tokens).toMatchObject({ track: 'border.subtle', fill: 'text.primary' });
  });
});

const hidden = { includeHiddenElements: true } as const;
/** The fill's scale as the worklet returns it now — `props.style` is only its mount value. */
const scaleOf = (tree: ReturnType<typeof draw>): number => {
  const transform = animatedStyleOf(tree.getByTestId('line.fill', hidden))['transform'];
  return (transform as readonly { readonly scaleX: number }[])[0]?.scaleX ?? NaN;
};

describe('the value is a length, never a width or a colour', () => {
  const fillOf = (value: number, theme: 'dark' | 'light' = 'dark') => {
    const { getByTestId } = draw(<ProgressBar value={value} testID="line" />, theme);
    return flattenStyle(getByTestId('line.fill', hidden).props['style']);
  };

  it('scales the fill from its leading edge by the value', () => {
    for (const value of [0, 0.25, 0.8, 1]) {
      expect(scaleOf(draw(<ProgressBar value={value} testID="line" />))).toBe(value);
      expect(fillOf(value)['transformOrigin']).toBe('left');
    }
  });

  it('DECOY — nothing about the fill but its scale moves with the value', () => {
    const unscaled = (style: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(style).filter(([key]) => key !== 'transform'));
    // A width keyed to the value, or an ink that changes with it, would differ here.
    expect(unscaled(fillOf(0.9))).toStrictEqual(unscaled(fillOf(0.2)));
    expect(scaleOf(draw(<ProgressBar value={0.9} testID="line" />))).not.toBe(
      scaleOf(draw(<ProgressBar value={0.2} testID="line" />)),
    );
  });

  it('draws one ink for the fill and one for the track, in each theme', () => {
    for (const theme of ['dark', 'light'] as const) {
      const { getByTestId } = draw(<ProgressBar value={0.5} testID="line" />, theme);
      const track = flattenStyle(
        getByTestId('line', { includeHiddenElements: true }).props['style'],
      );
      const fill = flattenStyle(
        getByTestId('line.fill', { includeHiddenElements: true }).props['style'],
      );
      expect(track['backgroundColor']).toBe(nativeColors[theme].border);
      expect(fill['backgroundColor']).toBe(nativeColors[theme].foreground);
      expect(track['height']).toBe(PROGRESS_TRACK);
    }
  });

  it('refuses a value that is not a fraction rather than drawing past its track', () => {
    for (const bad of [-0.1, 1.2, Number.NaN])
      expect(() => draw(<ProgressBar value={bad} />)).toThrow(RangeError);
  });
});

/**
 * IT MOVES WHEN THE VALUE CHANGES, NEVER WHEN IT MOUNTS (F-266, ADR-0133 §3).
 *
 * Read with fake timers and `animatedStyleOf`; the worklet captures one shared value, so advancing
 * time is safe (E-069). Frames are asserted relationally — strictly between, then there — never as
 * a frame number.
 */
describe('it moves when the value changes, never when it mounts (F-266)', () => {
  const FRAME = 17;
  const VIEW = nativeMotion.durations.view;

  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const line = (value: number) => <ProgressBar value={value} testID="line" />;
  const advance = (ms: number): void => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('is at rest on mount: a line mounted at 0.8 reads 0.8 a frame later', () => {
    const tree = draw(line(0.8));
    advance(FRAME);
    expect(scaleOf(tree)).toBe(0.8);
  });

  it('DECOY — a value grown from 0 on mount is visible to the same reading', () => {
    function Grows(): React.JSX.Element {
      const grown = useSharedValue(0);
      useEffect(() => {
        grown.value = withTiming(0.8, { duration: VIEW });
      }, [grown]);
      const style = useAnimatedStyle(() => ({ transform: [{ scaleX: grown.value }] }));
      return <Animated.View testID="line.fill" style={style} />;
    }
    const tree = draw(<Grows />);
    advance(FRAME);
    expect(scaleOf(tree)).toBeGreaterThan(0);
    expect(scaleOf(tree)).toBeLessThan(0.8);
  });

  it('moves to a new value over view: between its two values a frame in, there at the end', () => {
    const tree = draw(line(0.2));
    tree.rerender(<ThemeProvider theme="dark">{line(0.8)}</ThemeProvider>);
    advance(FRAME * 2);
    expect(scaleOf(tree)).toBeGreaterThan(0.2);
    expect(scaleOf(tree)).toBeLessThan(0.8);
    advance(VIEW);
    expect(scaleOf(tree)).toBe(0.8);
  });

  it('animates its scale and nothing else, and its ink is foreground mid-move', () => {
    const tree = draw(line(0.2));
    tree.rerender(<ThemeProvider theme="dark">{line(0.8)}</ThemeProvider>);
    advance(FRAME * 2);
    const fill = tree.getByTestId('line.fill', hidden);
    expect(Object.keys(animatedStyleOf(fill))).toStrictEqual(['transform']);
    expect(flattenStyle(fill.props['style'])['backgroundColor']).toBe(nativeColors.dark.foreground);
  });

  it('DECOY — the same reader names a worklet that returns a colour', () => {
    function Paints(): React.JSX.Element {
      const style = useAnimatedStyle(() => ({ backgroundColor: '#000000' }));
      return <Animated.View testID="line.fill" style={style} />;
    }
    const tree = draw(<Paints />);
    expect(Object.keys(animatedStyleOf(tree.getByTestId('line.fill', hidden)))).toContain(
      'backgroundColor',
    );
  });

  it('lands at once under reduced motion: no move, not a faster one', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const tree = draw(line(0.2));
    await act(async () => {
      await Promise.resolve();
    });
    tree.rerender(<ThemeProvider theme="dark">{line(0.8)}</ThemeProvider>);
    advance(FRAME);
    expect(scaleOf(tree)).toBe(0.8);
  });
});

describe('decorative', () => {
  it('says nothing — its one caller is an overlay a screen reader never stops on', () => {
    const { getByTestId } = draw(<ProgressBar value={0.5} testID="line" />);
    const line = getByTestId('line', { includeHiddenElements: true });
    expect(line.props['accessibilityElementsHidden']).toBe(true);
    expect(line.props['importantForAccessibility']).toBe('no-hide-descendants');
  });

  it('DECOY — and takes no label, so a named line cannot be added without its own design', () => {
    // @ts-expect-error — the labelled form was removed until a caller needs it (F-231's review).
    expect(() => draw(<ProgressBar value={0.5} label="Opening" />)).toBeDefined();
  });
});
