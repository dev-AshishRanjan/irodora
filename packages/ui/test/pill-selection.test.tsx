/**
 * The pill treatment (F-232): a chosen chip is filled and a dot leads its label, as `12`, `15` and
 * `17` draw it. No tick and no corner badge is drawn, and the tick stays in the accessible name.
 *
 * The conformance rule reads this picture off the rendered tree (`selection-treatment`), and its
 * decoys hold it from both sides. A fill without a dot is reported: that is `05`'s season chip,
 * which OQ-43 leaves open, not the treatment a pill claims. The defaults are recomputed from the
 * inventories.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { Pressable, View } from 'react-native';
import { nativeColors, nativeSpacing, type Theme } from '@irodora/design-tokens';
import {
  ChoiceGroup,
  Chip,
  CHIP_HEIGHT,
  SELECTION_DOT,
  SelectionDot,
  ThemeProvider,
} from '../src/index.js';
import {
  checkSubject,
  drawsDot,
  flattenStyle,
  tapTargetReach,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');

interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly action: string | null;
  readonly dp: { readonly w: number; readonly h: number } | null;
  readonly tokens?: Readonly<Record<string, string>>;
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
  it('SELECTION_DOT is the median selection dot drawn on 07, 10, 12, 15 and 17', () => {
    const dots = elements
      .filter(
        (e) =>
          /\.(dot|select\.selected)$/u.test(e.id) &&
          e.tokens?.['fg'] !== undefined &&
          e.dp !== null,
      )
      .map((e) => e.dp?.w ?? NaN);
    expect(dots).toHaveLength(9);
    expect(half(median(dots))).toBe(SELECTION_DOT);
  });

  it('CHIP_HEIGHT is the median interactive pill chip on a scaled screen', () => {
    const heights = elements
      .filter(
        (e) =>
          e.component === 'ui:Chip' &&
          e.action !== null &&
          e.tokens?.['radius'] === 'pill' &&
          e.dp !== null,
      )
      .map((e) => e.dp?.h ?? NaN);
    expect(heights).toHaveLength(31);
    expect(half(median(heights))).toBe(CHIP_HEIGHT);
  });
});

const dark = nativeColors.dark;
const hostStyle = (testID: string): Record<string, unknown> => {
  const hosts = screen.getAllByTestId(testID, { includeHiddenElements: true });
  const host = hosts.find((h) => typeof h.type === 'string') ?? hosts[0];
  return flattenStyle((host?.props as { style?: unknown } | undefined)?.style);
};

describe('a chosen chip is filled and dotted, and nothing else is drawn for it', () => {
  it('draws the fill, the dot, and no tick; the tick is in the name and the state is set', () => {
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider theme="dark">
        <Chip label="Linen" selected selectedFill="surface.3" testID="on" />
      </ThemeProvider>,
    );
    expect(hostStyle('on')['backgroundColor']).toBe(dark['surface.3']);
    expect(
      UNSAFE_getAllByType(SelectionDot).filter((d) => (d.props as { visible: boolean }).visible),
    ).toHaveLength(1);
    expect(screen.queryByText(/✓/u)).toBeNull();
    const host = screen.getByTestId('on');
    expect(host.props['accessibilityLabel']).toBe('Linen ✓');
    expect(host.props['accessibilityState']).toMatchObject({ selected: true });
  });

  it('draws an unchosen chip as an outline in border, with no fill and no dot', () => {
    const { UNSAFE_queryAllByType } = render(
      <ThemeProvider theme="dark">
        <Chip label="Cotton" testID="off" />
      </ThemeProvider>,
    );
    const style = hostStyle('off');
    expect(style['backgroundColor']).toBe('transparent');
    expect(style['borderColor']).toBe(dark.border);
    // The component is always rendered and draws nothing when not visible: count what it DRAWS.
    expect(
      UNSAFE_queryAllByType(SelectionDot).filter((d) => (d.props as { visible: boolean }).visible),
    ).toHaveLength(0);
  });

  it('keeps a short label at its drawn width: 05’s "All" is 34 dp, and the target is in the slop (B3)', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip label="All" height={22} testID="all" />
      </ThemeProvider>,
    );
    const style = hostStyle('all');
    expect(style['minWidth']).toBe(22);
    const host = screen.getAllByTestId('all', { includeHiddenElements: true })[0];
    expect(tapTargetReach(style, (host?.props as { hitSlop?: never }).hitSlop)).toStrictEqual({
      width: 44,
      height: 44,
    });
  });

  it('never shifts its outline: the edge is one width, chosen or not', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip label="Linen" selected testID="a" />
        <Chip label="Linen" testID="b" />
      </ThemeProvider>,
    );
    expect(hostStyle('a')['borderWidth']).toBe(hostStyle('b')['borderWidth']);
    expect(hostStyle('a')['height']).toBe(CHIP_HEIGHT);
  });

  it('inks the label and the dot in accent.foreground on 17’s accent fill', () => {
    const { UNSAFE_getByType } = render(
      <ThemeProvider theme="dark">
        <Chip label="Choose this" selected selectedFill="accent" radius="sm" />
      </ThemeProvider>,
    );
    expect((UNSAFE_getByType(SelectionDot).props as { color: string }).color).toBe(
      dark['accent.foreground'],
    );
  });

  it('edges 15’s chosen chip in foreground as well as filling it', () => {
    render(
      <ThemeProvider theme="dark">
        <Chip label="Standard" selected selectedEdge testID="e" />
      </ThemeProvider>,
    );
    expect(hostStyle('e')['borderColor']).toBe(dark.foreground);
    expect(hostStyle('e')['backgroundColor']).toBe(dark['surface.2']);
  });
});

describe('the rule reads a dot off the tree', () => {
  const tree = (style: Record<string, unknown>): TestNode => ({
    type: 'View',
    props: {},
    children: [{ type: 'View', props: { style }, children: null }],
  });

  it('finds a small filled circle', () => {
    expect(
      drawsDot(tree({ width: 6.5, height: 6.5, borderRadius: 9999, backgroundColor: '#fff' })),
    ).toBe(true);
  });

  it('DECOY — a large circle, a square, and an empty ring are not dots', () => {
    expect(
      drawsDot(tree({ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' })),
    ).toBe(false);
    expect(drawsDot(tree({ width: 6, height: 6, borderRadius: 0, backgroundColor: '#fff' }))).toBe(
      false,
    );
    expect(
      drawsDot(tree({ width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' })),
    ).toBe(false);
  });
});

describe('selection-treatment holds a pill to its picture', () => {
  /** A pill subject whose chosen state draws `fill` and, if asked, a dot. */
  const pill = (dot: boolean): ConformanceSubject => ({
    name: dot ? 'fill-and-dot' : 'fill-only',
    kind: 'interactive',
    selectable: true,
    treatment: 'pill',
    render: (state: string, theme: Theme): TestNode => {
      const colors = nativeColors[theme];
      const selected = state === 'active';
      const rendered = render(
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={selected ? 'Linen ✓' : 'Linen'}
          accessibilityState={{ selected, disabled: state === 'disabled', busy: false }}
          style={{
            minWidth: 44,
            minHeight: 44,
            backgroundColor: selected ? colors['surface.2'] : 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {selected && dot ? (
            <View
              style={{
                width: 6.5,
                height: 6.5,
                borderRadius: 9999,
                backgroundColor: colors.foreground,
              }}
            />
          ) : null}
        </Pressable>,
      );
      const json = rendered.toJSON() as TestNode;
      rendered.unmount();
      return json;
    },
  });
  const treatment = (s: ConformanceSubject): number =>
    checkSubject(s, ['dark']).filter((f) => f.rule === 'selection-treatment').length;

  it('passes a pill that is filled and dotted when chosen', () => {
    expect(treatment(pill(true))).toBe(0);
  });

  it('DECOY — reports a pill that is only filled', () => {
    expect(treatment(pill(false))).toBe(1);
  });

  it('DECOY — still holds a subject that does not declare pill to the chooser picture', () => {
    expect(treatment({ ...pill(true), treatment: 'chooser' })).toBe(1);
  });
});

/**
 * `ChoiceGroup`'s pill form is `15`'s CVD row (F-240, ADR-0131 §6): its height and gap recomputed
 * from `15`'s own boxes, and every pill drawn at one height and one edge width, chosen or not.
 */
describe('ChoiceGroup’s pill form is 15’s CVD row, recomputed (F-240)', () => {
  interface Boxed {
    readonly id: string;
    readonly dp: { readonly x: number; readonly w: number; readonly h: number } | null;
  }
  const row = (elements as readonly Boxed[]).filter((e) =>
    /^15\.cvd\.(standard|protanopia|deuteranopia|tritanopia)$/u.test(e.id),
  );
  const ordered = [...row].sort((a, b) => (a.dp?.x ?? 0) - (b.dp?.x ?? 0));
  /** R9 §2's snap: the nearest spacing step, the smaller on a tie (ADR-0103). */
  const snap = (v: number): number => {
    const steps = Object.values(nativeSpacing);
    return steps.reduce((best, s) =>
      Math.abs(s - v) < Math.abs(best - v) || (Math.abs(s - v) === Math.abs(best - v) && s < best)
        ? s
        : best,
    );
  };

  it('draws the three unchosen pills at 23 dp, the height the screen passes', () => {
    expect(row).toHaveLength(4);
    const unchosen = row.filter((e) => e.id !== '15.cvd.standard').map((e) => e.dp?.h ?? NaN);
    expect(half(median(unchosen))).toBe(23);
  });

  it('DECOY — the chosen box is its edge’s extent, not another height', () => {
    // 25.5 dp: the foreground edge drawn around the chosen pill, which one edge width in every
    // state keeps from shifting its outline (F-232's chip rule).
    expect(row.find((e) => e.id === '15.cvd.standard')?.dp?.h).not.toBe(23);
  });

  it('spaces the pills at xs: 5.5–6 dp between them, a tie between xs and sm, the smaller taken', () => {
    const gaps = ordered
      .slice(1)
      .map((e, i) => (e.dp?.x ?? NaN) - ((ordered[i]?.dp?.x ?? NaN) + (ordered[i]?.dp?.w ?? NaN)));
    expect(gaps).toHaveLength(3);
    expect(snap(median(gaps))).toBe(nativeSpacing.xs);
  });

  it('draws every pill at one height and one edge width, chosen or not', () => {
    render(
      <ThemeProvider theme="dark">
        <ChoiceGroup
          label="Colour-vision preview"
          value="standard"
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'protanopia', label: 'Protanopia' },
          ]}
          onChange={() => undefined}
          pills={{ height: 23 }}
        />
      </ThemeProvider>,
    );
    const pills = screen
      .getAllByRole('radio')
      .map((p) => flattenStyle((p.props as { style?: unknown }).style));
    expect(pills).toHaveLength(2);
    for (const style of pills) {
      expect(style['height']).toBe(23);
      expect(style['borderWidth']).toBe(1);
    }
    // The chosen one is the drawn pill: filled in surface.2, edged in foreground.
    expect(pills[0]?.['backgroundColor']).toBe(dark['surface.2']);
    expect(pills[0]?.['borderColor']).toBe(dark.foreground);
    expect(pills[1]?.['borderColor']).toBe(dark.border);
  });
});
