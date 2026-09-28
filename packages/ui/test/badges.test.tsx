/**
 * The chips nobody presses, and the one with a colour in it (F-232, criterion 2).
 *
 * - The badges: 03's outlined chip with a glyph, 05's count in figures, 21's ΔE00 badge filled and
 *   edged, and 24's tinted by its row's sample, with its ink chosen by `inkOnSample` (C8).
 * - 05's family chip: filled at rest, led by the family's colour, with the kanji after the romaji.
 * - 04's status pill.
 *
 * `inkOnSample` is held both ways. It reports NEITHER on 24's mid-tones, which is F-259's to settle,
 * and its decoy is a sample the dark ink does pass. The defaults are recomputed from the inventories.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, nativeFamilies, nativeRadius } from '@irodora/design-tokens';
import {
  BADGE_HEIGHT,
  Chip,
  Glyph,
  inkOnSample,
  SAMPLE_DOT,
  Status,
  STATUS_PILL_HEIGHT,
  ThemeProvider,
} from '../src/index.js';
import { drawsDot, flattenStyle, type TestNode } from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly action: string | null;
  readonly dp: { readonly w: number; readonly h: number } | null;
}
const elements: readonly Element[] = readdirSync(INVENTORY)
  .filter((f) => /^\d\d\.json$/u.test(f))
  .flatMap(
    (f) =>
      (JSON.parse(readFileSync(join(INVENTORY, f), 'utf8')) as { elements?: readonly Element[] })
        .elements ?? [],
  );
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;

describe('the defaults are the inventories’, recomputed', () => {
  it('BADGE_HEIGHT is the median static chip on a scaled screen', () => {
    const heights = elements
      .filter((e) => e.component === 'ui:Chip' && e.action === null && e.dp !== null)
      .map((e) => e.dp?.h ?? NaN);
    expect(heights).toHaveLength(38);
    expect(half(median(heights))).toBe(BADGE_HEIGHT);
  });

  it('SAMPLE_DOT is 05’s family dot', () => {
    const dots = elements
      .filter((e) => /^05\.filters\.family\.[a-z]+\.dot$/u.test(e.id))
      .map((e) => e.dp?.w ?? NaN);
    expect(dots).toHaveLength(6);
    expect(half(median(dots))).toBe(SAMPLE_DOT);
  });
});

const dark = nativeColors.dark;
const SAMPLE = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

describe('inkOnSample (C8)', () => {
  it('reports NEITHER on 24’s mid-tones, the plan’s and the inventory’s', () => {
    for (const hex of ['#87795D', '#827252']) {
      const result = inkOnSample(hex, dark);
      expect(result.passes).toBe(false);
      expect(result.contrast).toBeLessThan(4.5);
    }
  });

  it('DECOY — picks the dark ink where it passes', () => {
    expect(inkOnSample('#4495A3', dark)).toMatchObject({
      ink: 'inverse.foreground',
      passes: true,
    });
  });

  it('picks the light ink on a dark sample, in every theme', () => {
    expect(inkOnSample('#1A1A1A', dark)).toMatchObject({ ink: 'foreground', passes: true });
    // On Washi the foreground is the DARK ink, so a dark sample takes the other one.
    expect(inkOnSample('#1A1A1A', nativeColors.light)).toMatchObject({
      ink: 'inverse.foreground',
      passes: true,
    });
  });
});

const styleOf = (testID: string): Record<string, unknown> => {
  const hosts = screen.getAllByTestId(testID, { includeHiddenElements: true });
  const host = hosts.find((h) => typeof h.type === 'string') ?? hosts[0];
  return flattenStyle((host?.props as { style?: unknown } | undefined)?.style);
};

describe('the badges', () => {
  it('draws an outline in border when it has no fill (03)', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip form="badge" label="Daylight" icon="sun" testID="o" />
      </ThemeProvider>,
    );
    const style = styleOf('o');
    expect(style['backgroundColor']).toBe('transparent');
    expect(style['borderColor']).toBe(dark.border);
    expect(style['height']).toBe(BADGE_HEIGHT);
  });

  it('draws a surface.2 fill and no edge (05, 12), and both on 21', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip form="badge" label="1,240" fill="surface.2" numeric testID="f" />
        <Chip form="badge" label="ΔE00 1.8" fill="surface.2" edge radius="sm" testID="e" />
      </ThemeProvider>,
    );
    expect(styleOf('f')['backgroundColor']).toBe(dark['surface.2']);
    expect(styleOf('f')['borderWidth']).toBe(0);
    expect(styleOf('e')['borderColor']).toBe(dark.border);
    expect(styleOf('e')['borderRadius']).toBe(nativeRadius.sm);
  });

  it('is tinted by its sample, with the ink inkOnSample picks (24)', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip form="badge" label="ΔE00 1.8" tint={{ hex: '#4495A3', color: SAMPLE }} testID="t" />
      </ThemeProvider>,
    );
    expect(styleOf('t')['backgroundColor']).toBe('#4495A3');
    const label = screen.getByText('ΔE00 1.8');
    expect(flattenStyle((label.props as { style?: unknown }).style)['color']).toBe(
      dark['inverse.foreground'],
    );
  });

  it('draws its glyph, and is read, not pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider theme="dark">
        <Chip form="badge" label="Daylight" icon="sun" testID="g" />
      </ThemeProvider>,
    );
    expect(UNSAFE_getAllByType(Glyph)).toHaveLength(1);
    const host = screen.getByTestId('g');
    expect(host.props['accessibilityRole']).toBe('text');
    expect(host.props['onPress']).toBeUndefined();
    expect(host.props['onClick']).toBeUndefined();
  });

  it('refuses a press handler on a badge', () => {
    // @ts-expect-error — a badge is read, not pressed; a chip that presses is a control.
    const pressed = <Chip form="badge" label="1,240" onPress={() => undefined} />;
    // DECOY — the control takes one.
    const control = <Chip label="Warm" onPress={() => undefined} />;
    expect([pressed, control]).toHaveLength(2);
  });
});

describe('05’s family chip', () => {
  const draw = (selected = false) =>
    render(
      <ThemeProvider theme="dark">
        <Chip
          label="Ao"
          kanji="青"
          dot={{ hex: '#526A6B', color: SAMPLE }}
          ground="surface.1"
          selected={selected}
          testID="c"
        />
      </ThemeProvider>,
    );

  it('rests filled, led by the family’s colour at 05’s size', () => {
    draw();
    const all = screen
      .getByTestId('c')
      .findAll((n) => typeof n.type === 'string')
      .map((n) => flattenStyle((n.props as { style?: unknown }).style));
    expect(styleOf('c')['backgroundColor']).toBe(dark['surface.1']);
    const dot = all.find((s) => s['backgroundColor'] === '#526A6B');
    expect([dot?.['width'], dot?.['height']]).toStrictEqual([SAMPLE_DOT, SAMPLE_DOT]);
  });

  it('sets the kanji in the bundled gothic, and names the chip in both scripts', () => {
    const { UNSAFE_getAllByType } = draw();
    const kanji = UNSAFE_getAllByType(RNText).find(
      (t) => (t.props as { children?: unknown }).children === '青',
    );
    expect(flattenStyle((kanji?.props as { style?: unknown }).style)['fontFamily']).toBe(
      nativeFamilies.jp,
    );
    expect(screen.getByTestId('c').props['accessibilityLabel']).toBe('Ao 青');
  });

  it('is marked chosen by its fill and a SELECTION dot, not by its colour dot', () => {
    const { toJSON } = draw(true);
    const tree = toJSON() as TestNode;
    // The colour dot alone would read as a dot; declared as a sample, it no longer does.
    expect(drawsDot(tree, new Set(['#526a6b']))).toBe(true);
  });
});

describe('the colour dot is data, not a mark', () => {
  const tree = (hex: string): TestNode => ({
    type: 'View',
    props: {},
    children: [
      {
        type: 'View',
        props: { style: { width: 6, height: 6, borderRadius: 9999, backgroundColor: hex } },
        children: null,
      },
    ],
  });

  it('does not count a dot painted in a declared sample', () => {
    expect(drawsDot(tree('#526A6B'), new Set(['#526a6b']))).toBe(false);
  });

  it('DECOY — counts the same dot when it is not a sample', () => {
    expect(drawsDot(tree('#526A6B'))).toBe(true);
  });
});

describe('04’s status pill', () => {
  it('draws the icon and the text on a surface.2 pill at 04’s height', () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider theme="dark">
        <Status form="pill" kind="ok" text="Within harmony tolerance" />
      </ThemeProvider>,
    );
    const pill = UNSAFE_getAllByType(RNText)[0]?.parent?.parent;
    const style = flattenStyle((pill?.props as { style?: unknown } | undefined)?.style);
    expect(style['backgroundColor']).toBe(dark['surface.2']);
    expect(style['borderRadius']).toBe(nativeRadius.pill);
    expect(style['height']).toBe(STATUS_PILL_HEIGHT);
    expect(screen.getByText('Within harmony tolerance')).toBeTruthy();
  });
});
