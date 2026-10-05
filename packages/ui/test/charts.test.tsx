/**
 * The coverage dial and the radar (F-235, criterion 2; mockups 11 and 17).
 *
 * - **Every number is the drawing's**, recomputed from 11 and 17 with the value it could have been as
 *   a decoy.
 * - **The dial's arc and figure are one value**: it takes a fraction, and refuses a figure by type.
 * - **The radar has four axes, by type**, and its ink is the caller's.
 * - **Each is one accessible image**, named by its data in both scripts; the drawing says nothing.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { nativeColors, nativeNumericFeature } from '@irodora/design-tokens';
import {
  CoverageDial,
  DIAL_RADIUS,
  DIAL_STROKE,
  DIAL_SWEEP,
  DIAL_TEXT_DROP,
  dialArc,
  dialSize,
  Radar,
  RADAR_EDGE,
  RADAR_FILL_OPACITY,
  RADAR_LABEL_GAP,
  RADAR_LABEL_OUT,
  RADAR_MARKER,
  RADAR_RING,
  RADAR_RINGS,
  RADAR_SIZE,
  RADAR_SPOKE,
  radarName,
  ThemeProvider,
  type CoverageDialProps,
  type RadarAxis,
  type RadarProps,
} from '../src/index.js';
import { raggedFigures, type TestNode } from '../src/testing/index.js';

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
interface Element {
  readonly id: string;
  readonly component?: string | null;
  readonly parent?: string | null;
  readonly dp: Box;
  readonly raw?: Readonly<Record<string, number>>;
  readonly tokens?: Readonly<Record<string, string>>;
  readonly measured?: Readonly<Record<string, string>>;
}
interface Inventory {
  readonly elements: readonly Element[];
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
}
const inventory = (n: string): Inventory =>
  JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', `${n}.json`), 'utf8'),
  ) as Inventory;
const finder =
  (j: Inventory) =>
  (id: string): Element => {
    const e = j.elements.find((x) => x.id === id);
    if (e === undefined) throw new Error(id);
    return e;
  };
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;
const rgb = (hex: string): readonly number[] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** An SVG paint as react-native-svg leaves it — an ARGB integer — read back as `#RRGGBB`. */
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

describe('the dial’s numbers are 11’s, recomputed', () => {
  const el = finder(inventory('11'));
  const ring = el('11.coverage.ring');
  const dpPerPx = inventory('11').frame.screens[0]?.dpPerPx ?? NaN;
  const raw = (k: string): number => ring.raw?.[k] ?? NaN;

  it('the radius, the stroke and the open sweep', () => {
    expect(half(raw('radiusPx') * dpPerPx)).toBe(DIAL_RADIUS);
    expect(half(raw('strokePx') * dpPerPx)).toBe(DIAL_STROKE);
    expect(raw('sweepDeg')).toBe(DIAL_SWEEP);
    expect(raw('sweepDeg') + raw('gapDeg')).toBe(360);
    // DECOY: a closed ring, and the three-quarter gauge a dial would default to.
    expect(DIAL_SWEEP).not.toBe(360);
    expect(DIAL_SWEEP).not.toBe(270);
    // DECOY: half the box, which counts the stroke and the antialiasing.
    expect(DIAL_RADIUS).not.toBe(ring.dp.w / 2);
  });

  it('draws the box 11 draws, within the fit’s reading', () => {
    const { width, height } = dialSize();
    expect(Math.abs(width - ring.dp.w)).toBeLessThanOrEqual(2);
    expect(Math.abs(height - ring.dp.h)).toBeLessThanOrEqual(2);
  });

  it('centres the figure and its label below the circle’s centre', () => {
    const figure = el('11.coverage.figure').dp;
    const label = el('11.coverage.figure-label').dp;
    const centre = ring.dp.y + DIAL_RADIUS + DIAL_STROKE / 2;
    expect(half((figure.y + label.y + label.h) / 2 - centre)).toBe(DIAL_TEXT_DROP);
    // Both are the dial's, inside its box.
    expect(el('11.coverage.figure').parent).toBe('11.coverage.ring');
    expect(el('11.coverage.figure-label').parent).toBe('11.coverage.ring');
  });
});

describe('the dial draws its arc and its figure from one fraction', () => {
  const draw = (props: CoverageDialProps): TestNode => {
    render(
      <ThemeProvider theme="dark">
        <CoverageDial {...props} />
      </ThemeProvider>,
    );
    return screen.toJSON() as TestNode;
  };
  const paths = (tree: TestNode): readonly TestNode[] =>
    nodes(tree).filter((n) => typeof n.props['d'] === 'string');

  it('is one image, named by its share, its figure tabular', () => {
    const tree = draw({ fraction: 0.84, label: 'Wardrobe Coverage' });
    const named = nodes(tree).filter((n) => n.props['accessible'] === true);
    expect(
      named.map((n) => [n.props['accessibilityRole'], n.props['accessibilityLabel']]),
    ).toStrictEqual([['image', 'Wardrobe Coverage 84%']]);
    expect(screen.getByText('84%')).toBeTruthy();
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
  });

  it('fills the share of the sweep from the left end, over the track', () => {
    const [track, fill] = paths(draw({ fraction: 0.84, label: 'Wardrobe Coverage' }));
    expect(paint(track?.props['stroke'])).toBe(nativeColors.dark['border.strong']);
    expect(paint(fill?.props['stroke'])).toBe(nativeColors.dark.foreground);
    const c = DIAL_RADIUS + DIAL_STROKE / 2;
    const start = 180 + (360 - DIAL_SWEEP) / 2;
    expect(fill?.props['d']).toBe(dialArc(c, c, DIAL_RADIUS, start, 0.84 * DIAL_SWEEP));
    // DECOY: 11's own sample arc, 249°, which disagrees with its printed 84 %.
    expect(fill?.props['d']).not.toBe(dialArc(c, c, DIAL_RADIUS, start, 249));
  });

  it('draws the track alone at zero, and refuses a share outside 0 to 1', () => {
    expect(paths(draw({ fraction: 0, label: 'Wardrobe Coverage' }))).toHaveLength(1);
    expect(() => draw({ fraction: 1.2, label: 'Wardrobe Coverage' })).toThrow(RangeError);
  });

  it('has no figure to disagree with its arc, by type', () => {
    const props: CoverageDialProps[] = [
      // @ts-expect-error — the dial prints its own share.
      { fraction: 0.84, label: 'Wardrobe Coverage', figure: '90%' },
      { fraction: 0.84, label: 'Wardrobe Coverage' },
    ];
    expect(props).toHaveLength(2);
  });
});

describe('the radar’s numbers are 17’s, recomputed', () => {
  const el = finder(inventory('17'));
  const chart = el('17.radar.chart');
  const dpPerPx = inventory('17').frame.screens[0]?.dpPerPx ?? NaN;
  const raw = (k: string): number => chart.raw?.[k] ?? NaN;

  it('the box, the rings, the strokes and the markers', () => {
    expect(chart.dp.w).toBe(RADAR_SIZE);
    expect(chart.dp.h).toBe(RADAR_SIZE);
    expect(raw('rings')).toBe(RADAR_RINGS);
    expect(raw('ringPx') * dpPerPx).toBe(RADAR_RING);
    expect(raw('spokePx') * dpPerPx).toBe(RADAR_SPOKE);
    expect(raw('edgePx') * dpPerPx).toBe(RADAR_EDGE);
    expect(raw('markerPx') * dpPerPx).toBe(RADAR_MARKER);
    // The rings are border.strong and the spokes border, as recorded.
    expect(chart.tokens).toStrictEqual({ ring: 'border.strong', spoke: 'border.subtle' });
    // DECOY: the ring and the spoke are not one stroke.
    expect(RADAR_RING).not.toBe(RADAR_SPOKE);
  });

  it('the fill’s opacity, read from its ink over the card', () => {
    const card = rgb(el('17.radar').measured?.['bg'] ?? '');
    const fill = rgb(chart.measured?.['fill'] ?? '');
    const ink = rgb(nativeColors.dark.foreground);
    const alphas = [0, 1, 2].map(
      (i) => ((fill[i] ?? NaN) - (card[i] ?? NaN)) / ((ink[i] ?? NaN) - (card[i] ?? NaN)),
    );
    expect(Math.round((alphas.reduce((a, b) => a + b, 0) / 3) * 100) / 100).toBe(
      RADAR_FILL_OPACITY,
    );
    // DECOY: the half a translucent fill would default to.
    expect(RADAR_FILL_OPACITY).not.toBe(0.5);
  });

  it('the labels: beside the sides, and centred beyond the top and bottom', () => {
    const c = chart.dp;
    const right = el('17.radar.axis-depth').dp;
    const left = el('17.radar.axis-muted-tolerance').dp;
    expect(median([right.x - (c.x + c.w), c.x - (left.x + left.w)])).toBe(RADAR_LABEL_GAP);
    const top = el('17.radar.axis-temperature').dp;
    const bottom = el('17.radar.axis-chroma').dp;
    expect(half(median([c.y - (top.y + top.h / 2), bottom.y + bottom.h / 2 - (c.y + c.h)]))).toBe(
      RADAR_LABEL_OUT,
    );
    // The four labels and the chart are one component.
    for (const id of [
      'chart',
      'axis-depth',
      'axis-muted-tolerance',
      'axis-temperature',
      'axis-chroma',
    ])
      expect(el(`17.radar.${id}`).parent).toBe('17.radar.plot');
    expect(el('17.radar.plot').component).toBe('ui:Radar');
  });
});

const AXES: RadarProps['axes'] = [
  {
    label: 'Temperature',
    fraction: 0.4,
    figure: { kind: 'share', fraction: 0.4, of: 'Temperature' },
  },
  { label: 'Depth', fraction: 0.6, figure: { kind: 'share', fraction: 0.6, of: 'Depth' } },
  { label: 'Chroma', fraction: 0.3, figure: { kind: 'share', fraction: 0.3, of: 'Chroma' } },
  {
    label: 'Muted Tolerance',
    fraction: 0.65,
    figure: { kind: 'share', fraction: 0.65, of: 'Muted Tolerance' },
  },
];

describe('the radar as drawn', () => {
  const draw = (props: RadarProps): TestNode => {
    render(
      <ThemeProvider theme="dark">
        <Radar {...props} />
      </ThemeProvider>,
    );
    return screen.toJSON() as TestNode;
  };

  it('is one image, named by each axis’s figure, joined for its script', () => {
    const tree = draw({ name: 'Colour profile', axes: AXES, ink: 'foreground' });
    const named = nodes(tree).filter((n) => n.props['accessible'] === true);
    expect(
      named.map((n) => [n.props['accessibilityRole'], n.props['accessibilityLabel']]),
    ).toStrictEqual([
      ['image', 'Colour profile: Temperature 40%, Depth 60%, Chroma 30%, Muted Tolerance 65%'],
    ]);
    expect(radarName('色の傾向', AXES, 'japanese')).toBe(
      '色の傾向: Temperature 40%、Depth 60%、Chroma 30%、Muted Tolerance 65%',
    );
    for (const axis of AXES) expect(screen.getByText(axis.label)).toBeTruthy();
  });

  it('draws six rings in border.strong, the spokes in border, and the polygon in its ink', () => {
    const tree = draw({ name: 'Colour profile', axes: AXES, ink: 'foreground.2' });
    const strokes = nodes(tree)
      .filter((n) => typeof n.props['d'] === 'string')
      .map((n) => paint(n.props['stroke']));
    const dark = nativeColors.dark;
    expect(strokes.filter((s) => s === dark['border.strong'])).toHaveLength(RADAR_RINGS);
    expect(strokes.filter((s) => s === dark.border)).toHaveLength(1);
    expect(strokes.filter((s) => s === dark['foreground.2'])).toHaveLength(1);
    const markers = nodes(tree).filter((n) => n.props['r'] === RADAR_MARKER / 2);
    expect(markers.map((n) => paint(n.props['fill']))).toStrictEqual(
      Array(4).fill(dark['foreground.2']),
    );
  });

  it('refuses a fraction off its axis, and any count but four, by type', () => {
    const off: RadarAxis = { ...AXES[0], fraction: 1.5 };
    expect(() =>
      draw({ name: 'x', axes: [off, AXES[1], AXES[2], AXES[3]], ink: 'foreground' }),
    ).toThrow(RangeError);
    const shapes: RadarProps[] = [
      // @ts-expect-error — 17 draws four axes, not three.
      { name: 'x', axes: [AXES[0], AXES[1], AXES[2]], ink: 'foreground' },
      // @ts-expect-error — nor five.
      { name: 'x', axes: [AXES[0], AXES[1], AXES[2], AXES[3], AXES[0]], ink: 'foreground' },
      // @ts-expect-error — the ink is a neutral that exists; the colour is OQ-24's.
      { name: 'x', axes: AXES, ink: 'link' },
      // DECOY: as drawn, it compiles.
      { name: 'x', axes: AXES, ink: 'foreground' },
    ];
    expect(shapes).toHaveLength(4);
  });
});
