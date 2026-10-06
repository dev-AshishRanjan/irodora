/**
 * The delta rows and the proximity headline (F-235, criterion 1; mockup 04; ADR-0119).
 *
 * - **Every number is the drawing's**, recomputed from 04 with the value it could have been as a
 *   decoy.
 * - **One unit for every row and both sides** (OQ-50): equal magnitudes draw equal lengths, nothing
 *   is clamped below `scale`, and no bar runs into the figures.
 * - **Every bar takes one ink**, and it clears 3:1 on the card in every palette (OQ-50).
 * - **Each row is one accessible element** naming its label, its figure's quantity and space, and
 *   the reading; the bars and the seal say nothing of their own (OQ-51).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { nativeColors, nativeNumericFeature, type Theme } from '@irodora/design-tokens';
import {
  DELTA_AXIS,
  DELTA_AXIS_WIDTH,
  DELTA_BAR,
  DELTA_BAR_RADIUS,
  DELTA_GAP,
  DELTA_LABEL_END,
  DELTA_ROW,
  deltaBar,
  deltaShare,
  DeltaBars,
  deltaUnit,
  HEADLINE_CAPTION_GAP,
  HEADLINE_GAP,
  HEADLINE_PAIR_GAP,
  HEADLINE_SEAL,
  ProximityHeadline,
  ThemeProvider,
  type DeltaRow,
} from '../src/index.js';
import { flattenStyle, raggedFigures, type TestNode } from '../src/testing/index.js';

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
}
interface Inventory {
  readonly elements: readonly Element[];
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
}
const four = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '04.json'), 'utf8'),
) as Inventory;
const el = (id: string): Element => {
  const e = four.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(id);
  return e;
};
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const right = (b: Box): number => b.x + b.w;
const bottom = (b: Box): number => b.y + b.h;
const KEYS = ['lightness', 'chroma', 'hue'] as const;

describe('every number is the drawing’s, recomputed from 04', () => {
  const deltas = el('04.gauge.deltas').dp;
  const axis = el('04.gauge.axis').dp;

  it('the label column and the axis, as fractions of the rows’ width', () => {
    const labelEnd = Math.max(...KEYS.map((k) => right(el(`04.gauge.${k}.label`).dp)));
    expect(Math.round(((labelEnd - deltas.x) / deltas.w) * 1000) / 1000).toBe(DELTA_LABEL_END);
    const centre = axis.x + axis.w / 2;
    expect(Math.round(((centre - deltas.x) / deltas.w) * 1000) / 1000).toBe(DELTA_AXIS);
    // The axis is the card's centre, which is why it is held as a fraction.
    const card = el('04.gauge').dp;
    expect(Math.abs(card.x + card.w / 2 - centre)).toBeLessThanOrEqual(0.5);
    expect(axis.w).toBe(DELTA_AXIS_WIDTH);
    // DECOY: the plan's first reading, and the exact half a centred axis would default to.
    expect(DELTA_AXIS).not.toBe(0.499);
    expect(DELTA_AXIS).not.toBe(0.5);
  });

  it('the row: the axis spans the three, and the labels sit one row apart', () => {
    expect(axis.h / KEYS.length).toBe(DELTA_ROW);
    const tops = KEYS.map((k) => el(`04.gauge.${k}.label`).dp.y);
    const pitches = tops.slice(1).map((y, i) => y - (tops[i] ?? NaN));
    // The labels are glyph boxes read off a JPEG: within the ±1 dp a framed reading carries.
    expect(Math.abs(median(pitches) - DELTA_ROW)).toBeLessThanOrEqual(1);
  });

  it('the bar: its height, its outer corner, and the gap before the figures', () => {
    const bars = KEYS.map((k) => el(`04.gauge.${k}.bar`));
    expect(median(bars.map((b) => b.dp.h))).toBe(DELTA_BAR);
    const dpPerPx = four.frame.screens[0]?.dpPerPx ?? NaN;
    expect(Math.round((bars[0]?.raw?.['cornerPx'] ?? NaN) * dpPerPx)).toBe(DELTA_BAR_RADIUS);
    // The chroma bar is the one drawn right of the axis, and the one that meets the figures.
    expect(el('04.gauge.chroma.value').dp.x - right(el('04.gauge.chroma.bar').dp)).toBe(DELTA_GAP);
    // DECOY: the chroma bar's own 14.5.
    expect(DELTA_BAR).not.toBe(14.5);
  });

  it('every bar is recorded in the one ink, and no bar is a verdict', () => {
    for (const k of KEYS) expect(el(`04.gauge.${k}.bar`).tokens?.['fg']).toBe('text.tertiary');
    const json = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '04.json'), 'utf8'),
    ) as { conflicts: readonly { id: string; elements: readonly string[] }[] };
    const c10 = json.conflicts.find((c) => c.id === 'C10');
    expect(c10?.elements).not.toContain('04.gauge.chroma.bar');
    // DECOY: the green the verdict keeps.
    expect(c10?.elements).toContain('04.gauge.band');
  });
});

describe('the headline’s numbers are the drawing’s', () => {
  it('the gaps along the line, the seal, and the steps down to the samples and the caption', () => {
    const distance = el('04.gauge.distance').dp;
    const band = el('04.gauge.band').dp;
    const seal = el('04.gauge.sparkle').dp;
    expect(median([band.x - right(distance), seal.x - right(band)])).toBe(HEADLINE_GAP);
    expect(seal.w).toBe(HEADLINE_SEAL);
    // The line is as tall as the seal, and the seal is its top.
    expect(seal.y).toBe(el('04.gauge.headline').dp.y);
    const pair = el('04.gauge.pair').dp;
    expect(pair.y - bottom(seal)).toBe(HEADLINE_PAIR_GAP);
    expect(el('04.gauge.caption').dp.y - bottom(pair)).toBe(HEADLINE_CAPTION_GAP);
    // DECOY: the gap from the band's own glyphs, which ignores the seal.
    expect(HEADLINE_PAIR_GAP).not.toBe(pair.y - bottom(band));
  });
});

describe('one unit for every row and both sides (OQ-50)', () => {
  const width = el('04.gauge.deltas').dp.w;
  const widest =
    Math.max(...KEYS.map((k) => right(el(`04.gauge.${k}.reading`).dp))) -
    Math.min(...KEYS.map((k) => el(`04.gauge.${k}.value`).dp.x));

  it('takes the smaller side’s room, so a full bar never meets the figures', () => {
    const unit = deltaUnit(width, widest);
    const axis = DELTA_AXIS * width;
    expect(unit).toBeCloseTo(
      Math.min(axis - DELTA_LABEL_END * width, width - widest - DELTA_GAP - axis),
    );
    // On 04's widths the right side binds: a full bar ends exactly DELTA_GAP short of the figures.
    expect(axis + unit).toBeCloseTo(width - widest - DELTA_GAP);
    // DECOY: the left side's room, which would run a positive bar into its figure.
    expect(unit).toBeLessThan(axis - DELTA_LABEL_END * width);
    // Figures wider than the room leave no bars, never a negative one.
    expect(deltaUnit(width, width)).toBe(0);
  });

  it('draws equal magnitudes at equal lengths, on either side', () => {
    const unit = deltaUnit(width, widest);
    for (const m of [0.1, 0.3, 0.8, 1]) {
      const left = deltaBar(-m, m, 1, unit);
      const right_ = deltaBar(m, m, 1, unit);
      expect(left.side).toBe('left');
      expect(right_.side).toBe('right');
      expect(left.length).toBe(right_.length);
      expect(left.length).toBeCloseTo(m * unit);
    }
  });

  it('stops a magnitude past the scale at a full unit, and draws nothing for zero', () => {
    expect(deltaBar(3, 3, 1, 40)).toStrictEqual({ side: 'right', length: 40 });
    expect(deltaBar(-3, 3, 1, 40)).toStrictEqual({ side: 'left', length: 40 });
    expect(deltaBar(0, 0, 1, 40)).toStrictEqual({ side: 'none', length: 0 });
    expect(deltaBar(0.5, 0.5, 1, 0)).toStrictEqual({ side: 'none', length: 0 });
  });

  it('takes its side from the printed figure, and only its length from the magnitude', () => {
    // The weighted term can disagree in sign with the raw delta printed beside it (ΔC′ against ΔC*).
    expect(deltaBar(0.1, -0.4, 1, 40)).toStrictEqual({ side: 'right', length: 16 });
    expect(deltaBar(-0.1, 0.4, 1, 40)).toStrictEqual({ side: 'left', length: 16 });
    // DECOY: the magnitude's own sign would have put the first on the left.
    expect(deltaBar(0.1, -0.4, 1, 40).side).not.toBe('left');
    // A share past the scale is said as it is, not clamped to a full bar.
    expect(deltaShare(-0.8, 1)).toBe(80);
    expect(deltaShare(1.5, 1)).toBe(150);
  });

  it('refuses a scale that is not positive, and a magnitude that is not a number', () => {
    expect(() => deltaBar(1, 1, 0, 40)).toThrow(RangeError);
    expect(() => deltaBar(1, 1, -1, 40)).toThrow(RangeError);
    expect(() => deltaBar(1, Number.NaN, 1, 40)).toThrow(RangeError);
    expect(() => deltaBar(Number.POSITIVE_INFINITY, 1, 1, 40)).toThrow(RangeError);
  });
});

// A test fixture: 04's three rows, with its drawn figures. The readings are sample words.
const ROWS: readonly DeltaRow[] = [
  {
    key: 'lightness',
    label: 'Lightness',
    delta: {
      kind: 'measure',
      value: -0.8,
      places: 1,
      signed: true,
      quantity: 'ΔL*',
      space: 'CIELAB',
    },
    reading: 'Slightly Darker',
    magnitude: -0.8,
  },
  {
    key: 'chroma',
    label: 'Chroma',
    delta: {
      kind: 'measure',
      value: 0.3,
      places: 1,
      signed: true,
      quantity: 'ΔC*',
      space: 'CIELAB',
    },
    reading: 'Slightly Richer',
    magnitude: 0.3,
  },
  {
    key: 'hue',
    label: 'Hue',
    delta: {
      kind: 'measure',
      value: -0.4,
      places: 1,
      signed: true,
      quantity: 'Δh',
      unit: '°',
      space: 'CIELAB',
    },
    reading: 'Slightly Cooler',
    magnitude: -0.4,
  },
];
const nodes = (n: TestNode): readonly TestNode[] => [
  n,
  ...(n.children ?? []).flatMap((c) => (typeof c === 'string' ? [] : nodes(c))),
];
const layout = (width: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height: DELTA_ROW } },
});

function drawBars(theme: Theme, measure: boolean): TestNode {
  render(
    <ThemeProvider theme={theme}>
      <DeltaBars rows={ROWS} scale={1} scaleName="Share of tolerance" testID="deltas" />
    </ThemeProvider>,
  );
  if (measure) {
    fireEvent(screen.getByTestId('deltas'), 'layout', layout(373.5));
    for (const row of ROWS)
      fireEvent(screen.getByText(new RegExp(`\\(${row.reading}\\)`, 'u')), 'layout', layout(133));
  }
  return screen.toJSON() as TestNode;
}
const bars = (tree: TestNode): readonly TestNode[] =>
  nodes(tree).filter((n) => flattenStyle(n.props['style'])['height'] === DELTA_BAR);

describe('the rows as drawn', () => {
  it('names each row once: its label, its figure’s quantity and space, the reading, and the bar', () => {
    const tree = drawBars('dark', true);
    const named = nodes(tree).filter((n) => n.props['accessible'] === true);
    expect(named.map((n) => n.props['accessibilityLabel'])).toStrictEqual([
      'Lightness: ΔL* −0.8, CIELAB, Slightly Darker, Share of tolerance 80%',
      'Chroma: ΔC* +0.3, CIELAB, Slightly Richer, Share of tolerance 30%',
      'Hue: Δh −0.4°, CIELAB, Slightly Cooler, Share of tolerance 40%',
    ]);
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
    // As 04 prints it: the label alone, with no notation line (OQ-51).
    expect(screen.queryByText(/ΔL\*/u)).toBeNull();
  });

  it('draws no bar before every figure is measured, then each on its side at the shared rate', () => {
    expect(bars(drawBars('dark', false))).toHaveLength(0);
    const drawn = bars(drawBars('dark', true));
    expect(drawn).toHaveLength(3);
    const unit = deltaUnit(373.5, 133);
    const axis = DELTA_AXIS * 373.5;
    const [lightness, chroma, hue] = drawn.map((n) => flattenStyle(n.props['style']));
    expect(lightness?.['width']).toBeCloseTo(0.8 * unit);
    expect(lightness?.['left']).toBeCloseTo(axis - 0.8 * unit);
    expect(chroma?.['left']).toBeCloseTo(axis);
    expect(hue?.['width']).toBeCloseTo(0.4 * unit);
  });

  it('inks every bar alike, and the ink clears 3:1 on the card in every palette', () => {
    for (const theme of ['dark', 'light', 'slate.dark', 'obsidian.dark'] as const) {
      const inks = new Set(
        bars(drawBars(theme, true)).map((n) => flattenStyle(n.props['style'])['backgroundColor']),
      );
      expect([...inks]).toStrictEqual([nativeColors[theme]['foreground.3.card']]);
      expect(
        contrast(nativeColors[theme]['foreground.3.card'], nativeColors[theme]['surface.1']),
      ).toBeGreaterThanOrEqual(3);
    }
    // DECOY: 04's slate is under 3:1 on its own card.
    expect(contrast('#566673', '#1F2126')).toBeLessThan(3);
  });

  it('sets the reading in full-width brackets in Japanese', () => {
    render(
      <ThemeProvider theme="dark">
        <DeltaBars
          rows={ROWS.slice(0, 1)}
          scale={1}
          scaleName="許容差に対する割合"
          script="japanese"
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('（Slightly Darker）', { exact: false })).toBeTruthy();
  });
});

describe('the headline', () => {
  const DISTANCE = {
    kind: 'measure',
    value: 1.42,
    places: 2,
    quantity: 'ΔE00',
    space: 'CIEDE2000',
  } as const;

  it('prints the metric and the band on one line, said once, the seal silent', () => {
    render(
      <ThemeProvider theme="dark">
        <ProximityHeadline
          distance={DISTANCE}
          band="Sample Band"
          ink="foreground"
          seal
          pair={null}
          caption="Left [Target: #5B6B78] | Right [Live Garment: #566774]"
          testID="h"
        />
      </ThemeProvider>,
    );
    const tree = screen.toJSON() as TestNode;
    const named = nodes(tree).filter((n) => n.props['accessible'] === true);
    expect(named.map((n) => n.props['accessibilityLabel'])).toStrictEqual([
      'ΔE00 1.42, CIEDE2000, Sample Band',
    ]);
    expect(screen.getByText('ΔE00: 1.42')).toBeTruthy();
    expect(screen.getByText('(Sample Band)')).toBeTruthy();
    const hidden = nodes(tree).filter((n) => n.props['accessibilityElementsHidden'] === true);
    expect(hidden).toHaveLength(1);
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
    // The line keeps the seal's height, so the samples sit where 04 draws them for every band.
    const line = named[0];
    expect(flattenStyle(line?.props['style'])['minHeight']).toBe(HEADLINE_SEAL);
  });

  it('draws no seal unless asked, and the line keeps its height', () => {
    render(
      <ThemeProvider theme="dark">
        <ProximityHeadline distance={DISTANCE} band="Noticeable" ink="foreground.2" pair={null} />
      </ThemeProvider>,
    );
    const tree = screen.toJSON() as TestNode;
    expect(nodes(tree).filter((n) => n.props['accessibilityElementsHidden'] === true)).toHaveLength(
      0,
    );
    const line = nodes(tree).find((n) => n.props['accessible'] === true);
    expect(flattenStyle(line?.props['style'])['minHeight']).toBe(HEADLINE_SEAL);
  });
});

/** WCAG 2.x contrast between two #RRGGBB inks. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? NaN) + 0.7152 * (g ?? NaN) + 0.0722 * (bl ?? NaN);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? NaN) + 0.05) / ((lo ?? NaN) + 0.05);
}
