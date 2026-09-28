/**
 * The slider is the sliders the screens draw (F-232): `09`'s interactive one at its drawn size,
 * with the target in its hit area, and the readouts `17` and `23` draw, which are shown and not set.
 * `23`'s gradient track (criterion 3) is painted through tokens that the colour-literal rule reads.
 *
 * The decoys:
 * - the interactive slider IS adjustable where the readout is not;
 * - a literal gradient stop is reported where a token stop is not.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { nativeColors, type Theme } from '@irodora/design-tokens';
import { FOCUS_RING, Slider, SLIDER_THUMB, SLIDER_TRACK, ThemeProvider } from '../src/index.js';
import {
  checkSubject,
  flattenStyle,
  paintedColors,
  tapTargetReach,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');

interface Inventory {
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number | null }[] };
  readonly elements: readonly {
    readonly id: string;
    readonly component: string | null;
    readonly raw?: Readonly<Record<string, number>>;
  }[];
}
const inventory = (id: string): Inventory =>
  JSON.parse(
    readFileSync(
      join(INVENTORY, readdirSync(INVENTORY).find((f) => f === `${id}.json`) ?? `${id}.json`),
      'utf8',
    ),
  ) as Inventory;
const half = (v: number): number => Math.round(v * 2) / 2;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
/** A screen's slider readings, in dp: the median track and thumb over its recorded sliders. */
const readings = (id: string): { readonly track: number; readonly thumb: number } => {
  const inv = inventory(id);
  const scale = inv.frame.screens[0]?.dpPerPx ?? NaN;
  const sliders = inv.elements.filter(
    (e) => e.component === 'ui:Slider' && e.raw?.['trackPx'] !== undefined,
  );
  expect(sliders.length).toBeGreaterThan(0);
  return {
    track: half(median(sliders.map((e) => e.raw?.['trackPx'] ?? NaN)) * scale),
    thumb: half(median(sliders.map((e) => e.raw?.['thumbPx'] ?? NaN)) * scale),
  };
};

describe('the sizes are the screens’, recomputed', () => {
  it('draws the interactive slider at 09’s track and thumb', () => {
    expect(readings('09')).toStrictEqual({ track: SLIDER_TRACK, thumb: SLIDER_THUMB });
  });

  it('reads 17’s readout at 2 and 7.5, and 23’s at 6.5 and 16.5 (the sizes its surface passes)', () => {
    expect(readings('17')).toStrictEqual({ track: 2, thumb: 7.5 });
    expect(readings('23')).toStrictEqual({ track: 6.5, thumb: 16.5 });
  });
});

const dark = nativeColors.dark;

/** Every host view's flattened style under the node with this testID, and the node's own props. */
function hostsOf(testID: string) {
  const nodes = screen.getAllByTestId(testID, { includeHiddenElements: true });
  return nodes.filter((n) => typeof n.type === 'string');
}

describe('the interactive slider', () => {
  const draw = (focused = false): void => {
    render(
      <ThemeProvider theme="dark">
        <Slider
          label="Lightness"
          value={0.4}
          valueLabel="0.40"
          onValueChange={() => undefined}
          focused={focused}
          testID="s"
        />
      </ThemeProvider>,
    );
  };

  it('draws its thumb white with no edge, at its size, reaching the target', () => {
    draw();
    const [thumb] = hostsOf('s');
    const style = flattenStyle((thumb?.props as { style?: unknown }).style);
    expect([style['width'], style['height']]).toStrictEqual([SLIDER_THUMB, SLIDER_THUMB]);
    expect(style['backgroundColor']).toBe(dark.accent);
    expect(style['borderWidth'] ?? 0).toBe(0);
    expect(tapTargetReach(style, (thumb?.props as { hitSlop?: never }).hitSlop)).toStrictEqual({
      width: 44,
      height: 44,
    });
  });

  it('is adjustable: it reports a value in a range', () => {
    draw();
    const [thumb] = hostsOf('s');
    expect(
      (thumb?.props as { accessibilityValue?: { text?: string } }).accessibilityValue?.text,
    ).toBe('0.40');
  });

  it('draws focus as a ring outside the thumb', () => {
    draw(true);
    const [thumb] = hostsOf('s');
    const rings = (thumb?.findAll((n) => typeof n.type === 'string') ?? [])
      .map((n) => flattenStyle((n.props as { style?: unknown }).style))
      .filter((s) => s['borderColor'] === dark.ring);
    expect(rings).toHaveLength(1);
    expect(rings[0]?.['borderWidth']).toBe(FOCUS_RING);
  });
});

describe('the readout', () => {
  it('DECOY — is not adjustable: no value in a range, and read as text', () => {
    render(
      <ThemeProvider theme="dark">
        <Slider readout label="Temperature" value={0.62} valueLabel="Warm" testID="r" />
      </ThemeProvider>,
    );
    const [root] = hostsOf('r');
    const props = root?.props as {
      accessibilityValue?: unknown;
      accessibilityRole?: string;
      accessibilityLabel?: string;
    };
    expect(props.accessibilityValue).toBeUndefined();
    expect(props.accessibilityRole).toBe('text');
    expect(props.accessibilityLabel).toBe('Temperature: Warm');
  });

  it('rings 17’s marker in the card it sits on', () => {
    render(
      <ThemeProvider theme="dark">
        <Slider
          readout
          label="Temperature"
          value={0.62}
          valueLabel="Warm"
          trackHeight={2}
          thumbSize={7.5}
          halo="surface.1"
          testID="h"
        />
      </ThemeProvider>,
    );
    const styles = (hostsOf('h')[0]?.findAll((n) => typeof n.type === 'string') ?? []).map((n) =>
      flattenStyle((n.props as { style?: unknown }).style),
    );
    const marker = styles.find((s) => s['borderColor'] === dark['surface.1']);
    expect(marker?.['backgroundColor']).toBe(dark.accent);
    expect(marker?.['width']).toBe(7.5 + 2 * 2);
  });

  it('draws 23’s end labels and note', () => {
    render(
      <ThemeProvider theme="dark">
        <Slider
          readout
          label="Temperature"
          value={0.62}
          valueLabel="Warm"
          gradient={['foreground.3', 'foreground']}
          ends={{ low: 'Cool', high: 'Warm tones', note: 'From 6 trials' }}
        />
      </ThemeProvider>,
    );
    for (const text of ['Cool', 'Warm tones', 'From 6 trials'])
      expect(screen.getByText(text)).toBeTruthy();
  });

  it('paints its gradient stops where the colour rules can read them, as tokens', () => {
    const { toJSON } = render(
      <ThemeProvider theme="dark">
        <Slider
          readout
          label="Temperature"
          value={0.62}
          valueLabel="Warm"
          gradient={['foreground.3', 'foreground']}
        />
      </ThemeProvider>,
    );
    const stops = paintedColors(toJSON() as TestNode, 'dark').filter(
      (c) => c.property === 'stopColor',
    );
    expect(stops.map((s) => (s.resolution.kind === 'token' ? s.resolution.tokens : []))).toEqual([
      expect.arrayContaining(['foreground.3']),
      expect.arrayContaining(['foreground']),
    ]);
  });
});

describe('a literal gradient stop is reported', () => {
  /** A static subject that paints a gradient: from tokens, or with one literal stop. */
  const gradient = (literal: boolean): ConformanceSubject => ({
    name: literal ? 'literal-stop' : 'token-stops',
    kind: 'static',
    render: (_state: string, theme: Theme): TestNode => {
      const colors = nativeColors[theme];
      const rendered = render(
        <View>
          <Svg width={40} height={4} fill="none">
            <Defs>
              <LinearGradient id="t" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors['foreground.3']} />
                <Stop offset="1" stopColor={literal ? '#5DA9E5' : colors.foreground} />
              </LinearGradient>
            </Defs>
            <Rect width={40} height={4} fill="url(#t)" />
          </Svg>
        </View>,
      );
      const json = rendered.toJSON() as TestNode;
      rendered.unmount();
      return json;
    },
  });
  const literals = (s: ConformanceSubject): number =>
    checkSubject(s, ['dark']).filter((f) => f.rule === 'colour-literal').length;

  it('DECOY — passes a gradient whose every stop is a token', () => {
    expect(literals(gradient(false))).toBe(0);
  });

  it('reports the hand-typed stop', () => {
    expect(literals(gradient(true))).toBe(1);
  });
});
