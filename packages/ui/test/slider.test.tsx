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
import { Text as RNText, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { nativeColors, nativeTapTarget, nativeType, type Theme } from '@irodora/design-tokens';
import {
  FOCUS_RING,
  Slider,
  SLIDER_THUMB,
  SLIDER_TRACK,
  SLIDER_TRACK_MIN,
  ThemeProvider,
} from '../src/index.js';
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

describe('the header is set as each screen draws it (F-232’s review)', () => {
  const texts = () =>
    screen.UNSAFE_getAllByType(RNText).map((t) => {
      const st = flattenStyle((t.props as { style?: unknown }).style);
      return [String((t.props as { children?: unknown }).children), st['fontSize'], st['color']];
    });

  it('sets 23’s label at body and value at title, both primary, and its note at label', () => {
    render(
      <ThemeProvider theme="dark">
        <Slider
          readout
          label="Temperature"
          value={0.62}
          valueLabel="Warm"
          labelSize="body"
          valueSize="title"
          ends={{ low: 'Cool', high: 'Hot', note: 'From 6 trials' }}
        />
      </ThemeProvider>,
    );
    const byText = new Map(texts().map(([t, size, colour]) => [t, [size, colour]]));
    expect(byText.get('Temperature')).toStrictEqual([
      nativeType.latin.body.fontSize,
      dark.foreground,
    ]);
    expect(byText.get('Warm')).toStrictEqual([nativeType.latin.title.fontSize, dark.foreground]);
    expect(byText.get('From 6 trials')).toStrictEqual([
      nativeType.latin.label.fontSize,
      dark['foreground.2'],
    ]);
  });

  it('DECOY — a slider that names no sizes takes 09’s: label and label, primary', () => {
    render(
      <ThemeProvider theme="dark">
        <Slider label="Lightness" value={0.4} valueLabel="0.40" onValueChange={() => undefined} />
      </ThemeProvider>,
    );
    const byText = new Map(texts().map(([t, size, colour]) => [t, [size, colour]]));
    expect(byText.get('Lightness')).toStrictEqual([
      nativeType.latin.label.fontSize,
      dark.foreground,
    ]);
  });
});

describe('09’s one-row form (F-250, ADR-0161 D5)', () => {
  const row = (props: { readonly testID?: string; readonly valueName?: string } = {}): void => {
    render(
      <ThemeProvider theme="dark">
        <Slider
          layout="row"
          label="Chroma (C)"
          value={0.05}
          max={0.4}
          step={0.001}
          valueLabel="0.050 (Muted / Soft)"
          valueColor="foreground.2"
          onValueChange={() => undefined}
          {...props}
        />
      </ThemeProvider>,
    );
  };

  it('draws the label, the track and the value in that order, in one row', () => {
    row({ testID: 'r' });
    const [label] = hostsOf('r.label');
    const [track] = hostsOf('r.track');
    const [value] = hostsOf('r.value');
    // The three parts' nearest common host is one row.
    const chain = (n: typeof label): unknown[] => {
      const out: unknown[] = [];
      for (let p = n?.parent; p; p = p.parent) out.push(p);
      return out;
    };
    const shared = chain(track).find((p) => chain(label).includes(p) && chain(value).includes(p));
    const style = flattenStyle(
      (shared as { props?: { style?: unknown } } | undefined)?.props?.style,
    );
    expect(style['flexDirection']).toBe('row');
    // In document order: the label, then the track, then the value.
    const order = screen
      .getAllByTestId(/^r\.(label|track|value)$/u, { includeHiddenElements: true })
      .filter((n) => typeof n.type === 'string')
      .map((n) => (n.props as { testID: string }).testID);
    expect(order).toStrictEqual(['r.label', 'r.track', 'r.value']);
    expect(String((value?.props as { children?: unknown }).children)).toBe('0.050 (Muted / Soft)');
  });

  it('lets the track take what the label and the value leave, never under its least', () => {
    row({ testID: 'r' });
    const [track] = hostsOf('r.track');
    const style = flattenStyle((track?.props as { style?: unknown }).style);
    expect(style['flexGrow']).toBe(1);
    expect(style['minWidth']).toBe(SLIDER_TRACK_MIN);
    expect(SLIDER_TRACK_MIN).toBe(2 * nativeTapTarget);
  });

  it('speaks the value without its slash and parentheses where it is told to', () => {
    row({ testID: 'r', valueName: '0.050, Muted, Soft' });
    const [thumb] = hostsOf('r');
    expect(
      (thumb?.props as { accessibilityValue?: { text?: string } }).accessibilityValue?.text,
    ).toBe('0.050, Muted, Soft');
  });

  it('names its thumb by what it sets, where the drawn label says less', () => {
    render(
      <ThemeProvider theme="dark">
        <Slider
          layout="row"
          label="Hue (H)"
          name="Hue (H), OKLCh hue angle of the search point"
          value={72}
          max={359}
          step={1}
          valueLabel="72° (No term)"
          onValueChange={() => undefined}
          testID="h"
        />
      </ThemeProvider>,
    );
    const [thumb] = hostsOf('h');
    expect((thumb?.props as { accessibilityLabel?: string }).accessibilityLabel).toBe(
      'Hue (H), OKLCh hue angle of the search point',
    );
    // The drawn label stays what the screen draws.
    const [label] = hostsOf('h.label');
    expect(String((label?.props as { children?: unknown }).children)).toBe('Hue (H)');
  });

  it('refuses a name that leaves out the drawn label (WCAG 2.5.3, review M7)', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(
        <ThemeProvider theme="dark">
          <Slider
            layout="row"
            label="Hue (H)"
            name="OKLCh hue angle of the search point"
            value={72}
            max={359}
            step={1}
            valueLabel="72°"
            onValueChange={() => undefined}
          />
        </ThemeProvider>,
      ),
    ).toThrow(/must contain the drawn label/u);
  });

  it('holds its first line: top-aligned, the track one label line tall, so a wrap grows it downward (review S4)', () => {
    row({ testID: 'r' });
    const [label] = hostsOf('r.label');
    const [track] = hostsOf('r.track');
    const chain = (n: typeof label): unknown[] => {
      const out: unknown[] = [];
      for (let p = n?.parent; p; p = p.parent) out.push(p);
      return out;
    };
    const shared = chain(track).find((p) => chain(label).includes(p));
    const rowStyle = flattenStyle(
      (shared as { props?: { style?: unknown } } | undefined)?.props?.style,
    );
    expect([rowStyle['flexDirection'], rowStyle['alignItems']]).toStrictEqual([
      'row',
      'flex-start',
    ]);
    const box = flattenStyle((track?.props as { style?: unknown }).style);
    expect([box['height'], box['justifyContent']]).toStrictEqual([
      nativeType.latin.label.lineHeight,
      'center',
    ]);
  });

  it('is one stop: the thumb speaks the label and the reading, and the drawn words are hidden (review M7)', () => {
    row({ testID: 'r' });
    const [label] = hostsOf('r.label');
    expect(
      (label?.props as { accessibilityElementsHidden?: boolean }).accessibilityElementsHidden,
    ).toBe(true);
    const [value] = hostsOf('r.value');
    let hidden = false;
    for (let p = value?.parent; p; p = p.parent)
      if (
        (p.props as { importantForAccessibility?: string }).importantForAccessibility ===
        'no-hide-descendants'
      )
        hidden = true;
    expect(hidden).toBe(true);
  });

  it('DECOY — without a valueName it speaks what it draws', () => {
    row({ testID: 'r' });
    const [thumb] = hostsOf('r');
    expect(
      (thumb?.props as { accessibilityValue?: { text?: string } }).accessibilityValue?.text,
    ).toBe('0.050 (Muted / Soft)');
  });

  it('DECOY — names no part without a testID, and the stacked form names none at all', () => {
    row();
    expect(
      screen.queryAllByTestId(/\.(label|track|value)$/u, { includeHiddenElements: true }),
    ).toHaveLength(0);
    screen.unmount();
    render(
      <ThemeProvider theme="dark">
        <Slider
          label="Lightness"
          value={0.4}
          valueLabel="0.40"
          onValueChange={() => undefined}
          testID="s"
        />
      </ThemeProvider>,
    );
    expect(screen.queryAllByTestId(/^s\./u, { includeHiddenElements: true })).toHaveLength(0);
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

  it('keeps a translucent stop’s alpha, so it resolves as the colour it is', () => {
    const r = render(
      <Svg width={4} height={4} fill="none">
        <Defs>
          <LinearGradient id="a">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#000000" />
          </LinearGradient>
        </Defs>
      </Svg>,
    );
    const stops = paintedColors(r.toJSON() as TestNode, 'dark').filter(
      (c) => c.property === 'stopColor',
    );
    expect(stops).toHaveLength(2);
    expect(stops[0]?.resolution).not.toStrictEqual(stops[1]?.resolution);
    expect(JSON.stringify(stops[0]?.resolution)).toContain('0.5');
  });

  it('reports the hand-typed stop', () => {
    expect(literals(gradient(true))).toBe(1);
  });
});
