/**
 * The progress ring (F-236; mockup 27, `27.lens-working.progress`).
 *
 * - **Its size and stroke are 27's**, recomputed from the inventory's readings at the board's scale,
 *   with the box F-220 first recorded as a decoy.
 * - **The value is an arc length**: the whole circle drawn once from 12 o'clock, its dash showing
 *   value × its length (F-266), and nothing else in the tree moves with the value — not the track,
 *   not an ink, not the box. It moves when the value changes, never when it mounts.
 * - **It is read**: a `progressbar` with its name, its value and whether it is still busy.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text as RNText } from 'react-native';
import { nativeColors, nativeMotion } from '@irodora/design-tokens';
import {
  ProgressRing,
  STATE_BOARD_K,
  STATE_RING,
  sweepLength,
  sweepPath,
  ThemeProvider,
  type ProgressRingProps,
} from '../src/index.js';
import { animatedPropsOf, type TestNode } from '../src/testing/index.js';

interface Element {
  readonly id: string;
  readonly box: { readonly w: number };
  readonly raw?: Readonly<Record<string, number>>;
  readonly tokens: Readonly<Record<string, string>>;
}
const board = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '27.json'), 'utf8'),
) as { readonly elements: readonly Element[] };
const ring = board.elements.find((e) => e.id === '27.lens-working.progress');
if (ring === undefined) throw new Error('27.lens-working.progress');
const raw = (k: string): number => ring.raw?.[k] ?? NaN;
const half = (v: number): number => Math.round(v * 2) / 2;

const paint = (v: unknown): string | undefined => {
  const p = v as { readonly payload?: unknown } | undefined;
  return typeof p?.payload === 'number'
    ? `#${(p.payload & 0xffffff).toString(16).padStart(6, '0').toUpperCase()}`
    : undefined;
};
const nodes = (n: TestNode): readonly TestNode[] => [
  n,
  ...(n.children ?? []).flatMap((c) => (typeof c === 'string' ? [] : nodes(c))),
];
const BASE: ProgressRingProps = {
  value: 0.5,
  label: 'Analysing fabric colour',
  valueText: 'Step 2 of 2',
};
const draw = (
  props: Partial<ProgressRingProps> = {},
  theme: 'dark' | 'light' = 'dark',
): TestNode => {
  render(
    <ThemeProvider theme={theme}>
      <ProgressRing {...BASE} {...props} testID="ring" />
    </ThemeProvider>,
  );
  return screen.toJSON() as TestNode;
};
/** The stroked shapes, in paint order: the track first, then the fill if there is one. */
const strokes = (tree: TestNode): readonly TestNode[] =>
  nodes(tree).filter(
    (n) => n.props['stroke'] !== undefined && n.props['strokeWidth'] !== undefined,
  );

describe("the ring is 27's", () => {
  it('is as large and as thick as 27 draws it, at the board’s scale, to the half dp', () => {
    expect(half((2 * raw('radiusPx') + raw('strokePx')) * STATE_BOARD_K)).toBe(STATE_RING.size);
    expect(half(raw('strokePx') * STATE_BOARD_K)).toBe(STATE_RING.stroke);
  });

  it('DECOY — the box F-220 first recorded, 138 px, is not 27’s ring', () => {
    // 138 px ran into the stroke's antialiasing; the circle fitted to its centre line is 136.3.
    expect(half(138 * STATE_BOARD_K)).not.toBe(STATE_RING.size);
  });

  it('binds the fill to text.primary and the track to level3, as 27 does', () => {
    expect(ring.tokens).toMatchObject({ fg: 'text.primary', track: 'level3' });
    const [track, fill] = strokes(draw());
    expect(paint(track?.props['stroke'])).toBe(nativeColors.dark['surface.3']);
    expect(paint(fill?.props['stroke'])).toBe(nativeColors.dark.foreground);
    expect(track?.props['strokeWidth']).toBe(STATE_RING.stroke);
    // react-native-svg hands the cap to native as its enum: butt 0, ROUND 1, square 2.
    expect(fill?.props['strokeLinecap']).toBe(1);
  });

  it('draws in both themes from the same two tokens', () => {
    const [track, fill] = strokes(draw({}, 'light'));
    expect(paint(track?.props['stroke'])).toBe(nativeColors.light['surface.3']);
    expect(paint(fill?.props['stroke'])).toBe(nativeColors.light.foreground);
  });
});

describe('the value is an arc length, and nothing else', () => {
  const c = STATE_RING.size / 2;
  const r = (STATE_RING.size - STATE_RING.stroke) / 2;
  /** The whole circle's length: what a value of 1 fills (F-266, ADR-0133 §4). */
  const L = sweepLength(r, 360);

  it('draws the whole circle once from 12 o’clock, and shows value × its length by the dash', () => {
    for (const value of [0.01, 0.25, 0.5, 0.606, 0.75, 0.999]) {
      const fill = strokes(draw({ value }))[1];
      expect(fill?.props['d']).toBe(sweepPath(c, c, r, 0, 360));
      expect(fill?.props['strokeDasharray']).toStrictEqual([L, L]);
      expect(fill?.props['strokeDashoffset']).toBeCloseTo(L * (1 - value), 9);
      expect(fill?.props['opacity']).toBe(1);
      screen.unmount();
    }
  });

  it('DECOY — 27’s drawn arc, 218°, is sample content and not what 0.606 draws', () => {
    // 27 draws 61 % as a 218° arc; the ring draws the caller's value, here 0.606 of the circle.
    const fill = strokes(draw({ value: 0.606 }))[1];
    expect(fill?.props['strokeDashoffset']).not.toBeCloseTo(L * (1 - 218 / 360), 3);
  });

  it('draws the whole circle when full, and nothing at all when empty', () => {
    const full = strokes(draw({ value: 1 }))[1];
    // No offset: the dash covers the whole path. react-native-svg writes a zero offset as null.
    expect(full?.props['strokeDashoffset'] ?? 0).toBe(0);
    expect(paint(full?.props['stroke'])).toBe(nativeColors.dark.foreground);
    screen.unmount();
    // A zero-length dash with round caps would paint a dot: a value nobody computed.
    expect(strokes(draw({ value: 0 }))[1]?.props['opacity']).toBe(0);
    screen.unmount();
    // DECOY: the smallest share is drawn.
    expect(strokes(draw({ value: 0.01 }))[1]?.props['opacity']).toBe(1);
  });

  it('holds the dash to L·(1 − v) for 200 seeded values', () => {
    let seed = 266;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 200; i += 1) {
      const value = next();
      const fill = strokes(draw({ value }))[1];
      expect(fill?.props['strokeDashoffset']).toBeCloseTo(L * (1 - value), 9);
      expect(fill?.props['opacity']).toBe(value > 0 ? 1 : 0);
      screen.unmount();
    }
  });

  it('moves nothing but the fill’s dash with the value', () => {
    /** The tree with the dash, its opacity and the progressbar's value taken out. */
    const without = (tree: TestNode): string =>
      JSON.stringify(tree, (key, v: unknown) =>
        key === 'strokeDashoffset' || key === 'opacity' || key === 'now' || key === 'busy'
          ? undefined
          : v,
      );
    const a = draw({ value: 0.2 });
    screen.unmount();
    const b = draw({ value: 0.7 });
    expect(without(a)).toBe(without(b));
    // DECOY — the dashes do differ, so the comparison is not blind to them.
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('refuses a value that is not a fraction', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    for (const value of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() => draw({ value })).toThrow(RangeError);
    spy.mockRestore();
  });
});

describe('the ring is read', () => {
  it('is one progressbar, named, with its value, busy until it is full', () => {
    draw({ value: 0.5 });
    const host = screen.getByTestId('ring');
    expect(host.props['accessible']).toBe(true);
    expect(host.props['accessibilityRole']).toBe('progressbar');
    expect(host.props['accessibilityLabel']).toBe('Analysing fabric colour');
    expect(host.props['accessibilityValue']).toStrictEqual({
      min: 0,
      max: 100,
      now: 50,
      text: 'Step 2 of 2',
    });
    expect(host.props['accessibilityState']).toStrictEqual({ busy: true });
    screen.unmount();
    draw({ value: 1 });
    expect(screen.getByTestId('ring').props['accessibilityState']).toStrictEqual({ busy: false });
  });

  it('hides what sits at its centre, which is decoration', () => {
    render(
      <ThemeProvider theme="dark">
        <ProgressRing {...BASE} testID="ring">
          <RNText>mark</RNText>
        </ProgressRing>
      </ThemeProvider>,
    );
    expect(screen.queryByText('mark')).toBeNull();
    expect(screen.getByText('mark', { includeHiddenElements: true })).toBeTruthy();
  });
});

/**
 * IT MOVES WHEN THE VALUE CHANGES, AND THE SPOKEN VALUE IS ALREADY THERE (F-266, ADR-0133 §3, §4).
 *
 * The fill's animated props are read off the composite `createAnimatedComponent` renders
 * (`animatedPropsOf`): the host keeps its mount value. The worklet captures a shared value and a
 * number, so advancing time is safe (E-069).
 */
describe('the ring moves when its value changes (F-266)', () => {
  const FRAME = 17;
  const r = (STATE_RING.size - STATE_RING.stroke) / 2;
  const L = sweepLength(r, 360);

  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const ring = (value: number) => (
    <ThemeProvider theme="dark">
      <ProgressRing {...BASE} value={value} testID="ring" />
    </ThemeProvider>
  );
  /** The composite carrying the fill's animated props. */
  const fillOf = (tree: ReturnType<typeof render>) => {
    const node = tree.UNSAFE_root.findAll(
      (n) => n.props['testID'] === 'ring.fill' && 'jestAnimatedProps' in n.props,
    )[0];
    if (node === undefined) throw new Error('no animated fill');
    return animatedPropsOf(node);
  };
  const advance = (ms: number): void => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('moves the dash over view while the spoken value is already the new one', () => {
    const tree = render(ring(0.2));
    tree.rerender(ring(0.8));
    advance(FRAME * 2);
    const mid = fillOf(tree)['strokeDashoffset'] as number;
    // DECOY: the dash is not yet at its end, so "already" below is about the value, not the arc.
    expect(mid).toBeLessThan(L * (1 - 0.2));
    expect(mid).toBeGreaterThan(L * (1 - 0.8));
    expect(tree.getByTestId('ring').props['accessibilityValue']).toMatchObject({ now: 80 });
    advance(nativeMotion.durations.view);
    expect(fillOf(tree)['strokeDashoffset']).toBeCloseTo(L * (1 - 0.8), 9);
  });

  it('animates the dash and its opacity and nothing else; its ink is still foreground', () => {
    const tree = render(ring(0.2));
    tree.rerender(ring(0.8));
    advance(FRAME * 2);
    expect(Object.keys(fillOf(tree)).sort()).toStrictEqual(['opacity', 'strokeDashoffset']);
    const host = tree.UNSAFE_root.findAll(
      (n) => n.props['testID'] === 'ring.fill' && typeof n.type === 'string',
    )[0];
    expect(paint(host?.props['stroke'])).toBe(nativeColors.dark.foreground);
  });

  it('moves from 0, where it was not drawn, and lands at once under reduced motion', async () => {
    const tree = render(ring(0));
    expect(fillOf(tree)['opacity']).toBe(0);
    tree.rerender(ring(0.5));
    advance(FRAME * 2);
    expect(fillOf(tree)['opacity']).toBe(1);
    tree.unmount();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const reduced = render(ring(0.2));
    await act(async () => {
      await Promise.resolve();
    });
    reduced.rerender(ring(0.8));
    advance(FRAME);
    expect(fillOf(reduced)['strokeDashoffset']).toBeCloseTo(L * (1 - 0.8), 9);
  });
});
