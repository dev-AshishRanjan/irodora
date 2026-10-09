/**
 * The progress ring (F-236; mockup 27, `27.lens-working.progress`).
 *
 * - **Its size and stroke are 27's**, recomputed from the inventory's readings at the board's scale,
 *   with the box F-220 first recorded as a decoy.
 * - **The value is an arc length**: the fill sweeps value × 360° clockwise from 12 o'clock, and nothing
 *   else in the tree moves with the value — not the track, not an ink, not the box.
 * - **It is read**: a `progressbar` with its name, its value and whether it is still busy.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';
import {
  dialArc,
  ProgressRing,
  STATE_BOARD_K,
  STATE_RING,
  ThemeProvider,
  type ProgressRingProps,
} from '../src/index.js';
import type { TestNode } from '../src/testing/index.js';

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

  it('sweeps value × 360° clockwise from 12 o’clock', () => {
    for (const value of [0.01, 0.25, 0.5, 0.606, 0.75, 0.999]) {
      const fill = strokes(draw({ value }))[1];
      expect(fill?.props['d']).toBe(dialArc(c, c, r, 0, value * 360));
      screen.unmount();
    }
  });

  it('draws the whole circle when full, and no fill at all when empty', () => {
    const full = strokes(draw({ value: 1 }));
    expect(full).toHaveLength(2);
    expect(full[1]?.props['r']).toBe(r);
    expect(paint(full[1]?.props['stroke'])).toBe(nativeColors.dark.foreground);
    screen.unmount();
    // A zero-length arc with round caps would paint a dot: a value nobody computed.
    expect(strokes(draw({ value: 0 }))).toHaveLength(1);
  });

  it('moves nothing but the fill with the value', () => {
    /** The tree with the fill's path and the progressbar's value taken out. */
    const without = (tree: TestNode): string =>
      JSON.stringify(tree, (key, v: unknown) =>
        key === 'd' || key === 'now' || key === 'busy' ? undefined : v,
      );
    const a = draw({ value: 0.2 });
    screen.unmount();
    const b = draw({ value: 0.7 });
    expect(without(a)).toBe(without(b));
    // DECOY — the paths do differ, so the comparison is not blind to them.
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
