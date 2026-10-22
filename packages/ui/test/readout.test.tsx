/**
 * The readout table (F-235, criterion 1; FR-61).
 *
 * - **Every number is the drawing's**, recomputed from 06, 08 and 26 with the value it could have been
 *   as a decoy.
 * - **Each form takes only what its drawing has**, by type.
 * - **Each row is one accessible element** naming its label and every value's quantity and space.
 * - **The figures are tabular and selectable** (the `ragged-figure` rule and FR-48).
 * - **An odd grid leaves its last cell empty**, as 26 draws it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import {
  nativeFamilies,
  nativeNumericFeature,
  nativeSpacing,
  nativeType,
} from '@irodora/design-tokens';
import {
  READOUT_GRID_INSET,
  READOUT_GRID_PAD,
  READOUT_GRID_RULE,
  READOUT_INSET,
  READOUT_LABEL,
  READOUT_ROW,
  READOUT_RULED_LABEL,
  READOUT_RULED_PAD,
  ReadoutTable,
  readoutRowName,
  ThemeProvider,
  valueSpoken,
  valueText,
  type ReadoutTableProps,
  type ReadoutValue,
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
}
interface Inventory {
  readonly elements: readonly Element[];
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
}
const inventory = (n: string): Inventory =>
  JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', `${n}.json`), 'utf8'),
  ) as Inventory;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;
const el = (j: Inventory, id: string): Element => {
  const e = j.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(id);
  return e;
};

describe('every number is the drawing’s, recomputed', () => {
  const six = inventory('06');
  const eight = inventory('08');
  const twentySix = inventory('26');

  it('06: the label column, the row, the insets', () => {
    const rows = six.elements.filter((e) => e.component === 'ui:ReadoutRow');
    expect(rows).toHaveLength(4);
    const columns = rows.map((r) => el(six, `${r.id}.value`).dp.x - r.dp.x);
    // The sRGB row's value is its own triple, past the column's edge; the other three start at it.
    expect(median(columns)).toBe(READOUT_LABEL);
    expect(median(rows.map((r) => r.dp.h))).toBe(READOUT_ROW);
    const table = el(six, '06.readout.table');
    const dpPerPx = six.frame.screens[0]?.dpPerPx ?? NaN;
    const inset = median([table.raw?.['labelInsetPx'] ?? NaN, table.raw?.['valueInsetPx'] ?? NaN]);
    expect(half(inset * dpPerPx)).toBe(READOUT_INSET);
    // DECOY: 08's label column, and the spacing step an inset would default to.
    expect(READOUT_LABEL).not.toBe(READOUT_RULED_LABEL);
    expect(READOUT_INSET).not.toBe(nativeSpacing.sm);
  });

  it('08: the label column, and the padding its single-line pitch leaves', () => {
    const rows = eight.elements.filter(
      (e) => e.component === 'ui:ReadoutRow' && e.parent === '08.metrics.table',
    );
    expect(rows).toHaveLength(5);
    expect(
      median(rows.map((r) => el(eight, `${r.id}.value`).dp.x - el(eight, `${r.id}.label`).dp.x)),
    ).toBe(READOUT_RULED_LABEL);
    // ΔEok's row is the one with a single line each side: its rules are 26 dp apart.
    const pitch = el(eight, '08.metrics.rule-3').dp.y - el(eight, '08.metrics.rule-2').dp.y;
    const rule = el(eight, '08.metrics.rule-2').dp.h;
    expect(half((pitch - rule - nativeType.latin.label.lineHeight) / 2)).toBe(READOUT_RULED_PAD);
    expect(READOUT_RULED_LABEL).not.toBe(READOUT_LABEL);
  });

  it('26: the cell inset, the rules, and the padding its row pitch leaves', () => {
    const card = el(twentySix, '26.readout');
    const label = el(twentySix, '26.readout.oklch.label');
    const right = el(twentySix, '26.readout.cielab.label');
    const divider = el(twentySix, '26.readout.divider');
    expect(label.dp.x - card.dp.x).toBe(READOUT_GRID_INSET);
    expect(right.dp.x - (divider.dp.x + divider.dp.w)).toBe(READOUT_GRID_INSET);
    expect(el(twentySix, '26.readout.rule-1').dp.h).toBe(READOUT_GRID_RULE);
    const pitch = el(twentySix, '26.readout.rule-2').dp.y - el(twentySix, '26.readout.rule-1').dp.y;
    const lines = nativeType.japanese.body.lineHeight + nativeType.latin.body.lineHeight;
    expect(half((pitch - READOUT_GRID_RULE - lines) / 2)).toBe(READOUT_GRID_PAD);
    // DECOY: the spacing step a cell inset would default to.
    expect(READOUT_GRID_INSET).not.toBe(nativeSpacing.md);
  });
});

const OKLCH: ReadoutValue = {
  kind: 'figures',
  separator: ' • ',
  parts: [
    { figure: { kind: 'measure', value: 0.49, places: 3, quantity: 'L', space: 'OKLCh' } },
    { figure: { kind: 'measure', value: 0.035, places: 3, quantity: 'C', space: 'OKLCh' } },
    {
      figure: {
        kind: 'measure',
        value: 240.2,
        places: 1,
        quantity: 'h',
        unit: '°',
        space: 'OKLCh',
      },
    },
  ],
};
const LAB: ReadoutValue = {
  kind: 'figures',
  separator: ', ',
  parts: [
    {
      label: 'L*',
      figure: { kind: 'measure', value: 45.2, places: 1, quantity: 'L*', space: 'CIELAB' },
    },
    {
      label: 'a*',
      figure: { kind: 'measure', value: -3.4, places: 1, quantity: 'a*', space: 'CIELAB' },
    },
  ],
};
const HEX: ReadoutValue = { kind: 'code', text: '#5B6B78', spoken: 'hex 5B6B78' };

describe('a value prints what the drawing prints and says the rest', () => {
  it('joins its figures with the drawing’s separator, each with its label', () => {
    expect(valueText(OKLCH)).toBe('0.490 • 0.035 • 240.2°');
    expect(valueText(LAB)).toBe('L* 45.2, a* −3.4');
    expect(valueText(HEX)).toBe('#5B6B78');
  });

  it('names the space once for figures that share it', () => {
    expect(valueSpoken(OKLCH)).toBe('L 0.490, C 0.035, h 240.2°, OKLCh');
    expect(valueSpoken(HEX)).toBe('hex 5B6B78');
  });
});

function draw(props: ReadoutTableProps): TestNode {
  const rendered = render(
    <ThemeProvider theme="dark">
      <ReadoutTable {...props} />
    </ThemeProvider>,
  );
  const json = rendered.toJSON() as TestNode;
  rendered.unmount();
  return json;
}
const nodes = (n: TestNode): readonly TestNode[] => [
  n,
  ...(n.children ?? []).flatMap((c) => (typeof c === 'string' ? [] : nodes(c))),
];
const named = (tree: TestNode): readonly string[] =>
  nodes(tree)
    .filter((n) => n.props['accessible'] === true)
    .map((n) => String(n.props['accessibilityLabel']));

describe('each part of a table, by its own id under the caller’s (F-247)', () => {
  const rows = [
    { key: 'hex', label: 'Hex', value: HEX },
    { key: 'srgb', label: 'sRGB', value: LAB, also: { label: 'Display-P3:', value: OKLCH } },
  ] as const;
  const ids = (tree: TestNode): readonly string[] =>
    nodes(tree)
      .map((n) => n.props['testID'])
      .filter((id): id is string => typeof id === 'string');

  it('names each label, value, column cell, bar and the second value’s two runs', () => {
    const tree = draw({ form: 'table', rows, testID: 't' });
    expect([...ids(tree)].sort()).toStrictEqual(
      [
        't',
        't.hex.divider',
        't.hex.label',
        't.hex.value',
        't.srgb.divider',
        't.srgb.label',
        't.srgb.value',
        't.srgb.bar',
        't.srgb.also.value',
        't.srgb.also.label',
      ].sort(),
    );
    // Each id lands on what it names: the second value's label run is inside its value run.
    const byId = (id: string) => nodes(tree).find((n) => n.props['testID'] === id);
    expect(nodes(byId('t.srgb.also.value')!).includes(byId('t.srgb.also.label')!)).toBe(true);
    expect(flattenStyle(byId('t.hex.divider')?.props['style'])['borderRightWidth']).toBe(1);
  });

  it('DECOY — without a testID no part carries one', () => {
    expect(ids(draw({ form: 'table', rows }))).toStrictEqual([]);
  });

  it('names a row exactly as a screen reader hears it', () => {
    const tree = draw({ form: 'table', rows });
    expect(named(tree)).toStrictEqual(
      rows.map((r) => readoutRowName(r.label, r.value, 'also' in r ? r.also : undefined)),
    );
  });

  /*
   * 06's out-of-sRGB hex (F-247, R9 §4 E2): the row says its hex is the nearest rendering, in its
   * own words and its own script, after the value — never inside the hex's code run — and the row's
   * name says it too, so a screen reader hears it with the value it qualifies.
   */
  it('draws a note after the values, in the row’s script, and says it in the row’s name', () => {
    const note = 'nearest sRGB rendering, ΔE00 1.23';
    const tree = draw({
      form: 'table',
      rows: [{ key: 'hex', label: 'Hex', value: HEX, note }],
      script: 'japanese',
      testID: 't',
    });
    const node = nodes(tree).find((n) => n.props['testID'] === 't.hex.note');
    expect(node?.children).toStrictEqual([note]);
    expect(flattenStyle(node?.props['style'])['fontFamily']).toBe(nativeFamilies.jp);
    expect(named(tree)).toStrictEqual([`Hex: hex 5B6B78; ${note}`]);
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
    // DECOY: without a note the row draws none, and its name ends at its value.
    const bare = draw({
      form: 'table',
      rows: [{ key: 'hex', label: 'Hex', value: HEX }],
      testID: 't',
    });
    expect(nodes(bare).some((n) => n.props['testID'] === 't.hex.note')).toBe(false);
    expect(named(bare)).toStrictEqual(['Hex: hex 5B6B78']);
  });
});

describe('each row is one accessible element, and every figure is tabular', () => {
  it('table: the label, the value, and the second value after the bar', () => {
    const tree = draw({
      form: 'table',
      rows: [
        { key: 'hex', label: 'Hex', value: HEX },
        { key: 'oklch', label: 'OKLCh', value: OKLCH },
        { key: 'srgb', label: 'sRGB', value: LAB, also: { label: 'Display-P3:', value: OKLCH } },
      ],
    });
    expect(named(tree)).toStrictEqual([
      'Hex: hex 5B6B78',
      'OKLCh: L 0.490, C 0.035, h 240.2°, OKLCh',
      'sRGB: L* 45.2, a* −3.4, CIELAB; Display-P3:: L 0.490, C 0.035, h 240.2°, OKLCh',
    ]);
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
    // Every figure is selectable, which is how a value is copied (FR-48).
    const values = nodes(tree).filter((n) => n.type === 'Text' && n.props['selectable'] === true);
    expect(values.length).toBeGreaterThanOrEqual(4);
  });

  it('ruled: the reading and the note join the row’s name', () => {
    const tree = draw({
      form: 'ruled',
      layout: 'columns',
      rows: [
        {
          key: 'lightness',
          label: 'Lightness',
          notation: 'ΔL*',
          value: LAB,
          reading: 'B is lighter',
        },
      ],
    });
    expect(named(tree)).toStrictEqual(['Lightness: L* 45.2, a* −3.4, CIELAB, B is lighter']);
  });

  it('grid: an odd count leaves its last cell empty, unnamed', () => {
    const tree = draw({
      form: 'grid',
      rows: [
        { key: 'oklch', label: 'OKLCh', value: OKLCH },
        { key: 'cielab', label: 'CIELAB', value: LAB },
        { key: 'hex', label: 'Hex', value: HEX },
      ],
    });
    expect(named(tree)).toHaveLength(3);
    // Two rows, two cells each: the fourth cell is drawn and empty.
    const rows = nodes(tree).filter(
      (n) => flattenStyle(n.props['style'])['flexDirection'] === 'row',
    );
    expect(rows).toHaveLength(2);
  });
});

describe('each form takes only what its drawing has', () => {
  it('refuses parts the drawing has not, by type', () => {
    const forms: ReadoutTableProps[] = [
      // @ts-expect-error — the grid draws no reading.
      { form: 'grid', rows: [{ key: 'a', label: 'A', value: HEX, reading: 'x' }] },
      {
        form: 'ruled',
        layout: 'columns',
        // @ts-expect-error — only 06's table draws a second value.
        rows: [{ key: 'a', label: 'A', value: HEX, also: { label: 'B', value: HEX } }],
      },
      // @ts-expect-error — the ruled form says which layout it draws.
      { form: 'ruled', rows: [] },
      // DECOY: each as drawn compiles.
      { form: 'grid', rows: [{ key: 'a', label: 'A', value: HEX }] },
    ];
    expect(forms).toHaveLength(4);
  });
});
