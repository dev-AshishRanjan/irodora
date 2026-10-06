/**
 * The metric tile, the factor rows, the step pill and the ranked row (F-235, criteria 2 and 3;
 * mockups 22, 13, 17, 19, 21 and 24).
 *
 * - **Every number is the drawing's**, recomputed from its inventory as a median over the drawn
 *   instances, with the value it could have been as a decoy.
 * - **A figure and its name are built together**, so what is printed and what is said cannot drift.
 * - **Each form takes only what its drawing has**, by type: no rank where none is printed, no action
 *   where none is drawn.
 * - **The step pill refuses words that drop where the person is.**
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeNumericFeature, nativeSpacing } from '@irodora/design-tokens';
import {
  BADGE_HEIGHT,
  FACTOR_COLUMNS,
  FACTOR_ICON,
  FACTOR_ICON_INSET,
  FACTOR_ROW,
  FACTOR_RULE,
  FactorRows,
  FIELDS_ROW,
  HARMONY_ROW,
  METRIC_TILE_HEIGHT,
  METRIC_TILE_INSET,
  MetricTile,
  NEAREST_ROW,
  RankedRow,
  STEP_PILL_HEIGHT,
  StepPill,
  SWATCH_SIZE,
  ThemeProvider,
  type RankedRowProps,
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
}
interface Inventory {
  readonly elements: readonly Element[];
}
const inventory = (n: string): Inventory =>
  JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', `${n}.json`), 'utf8'),
  ) as Inventory;
const finder =
  (j: Inventory) =>
  (id: string): Box => {
    const e = j.elements.find((x) => x.id === id);
    if (e === undefined) throw new Error(id);
    return e.dp;
  };
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;
const right = (b: Box): number => b.x + b.w;
const bottom = (b: Box): number => b.y + b.h;
const range = (n: number): readonly number[] => Array.from({ length: n }, (_, i) => i + 1);

describe('22: the metric tile', () => {
  const j = inventory('22');
  const at = finder(j);
  const tiles = ['unlocked', 'pairings', 'duplicates', 'gaps'].map((k) => `22.stats.${k}`);

  it('is the drawn height, with the inset its widest line leaves', () => {
    expect(median(tiles.map((t) => at(t).h))).toBe(METRIC_TILE_HEIGHT);
    const insets = tiles.map((t) => {
      const d = at(`${t}.detail`);
      return Math.min(d.x - at(t).x, right(at(t)) - right(d));
    });
    expect(Math.min(...insets)).toBe(METRIC_TILE_INSET);
    for (const t of tiles)
      expect(j.elements.find((e) => e.id === t)?.component).toBe('ui:MetricTile');
    // DECOY: the spacing step an inset would default to.
    expect(METRIC_TILE_INSET).not.toBe(nativeSpacing.sm);
  });

  it('prints the count and says it with its noun, then the basis', () => {
    render(
      <ThemeProvider theme="dark">
        <MetricTile
          value={14}
          signed
          label="Outfits Unlocked"
          detail="New combination possibilities"
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('+14')).toBeTruthy();
    const tree = screen.toJSON() as TestNode;
    expect(
      screen.getByLabelText('+14 Outfits Unlocked, New combination possibilities'),
    ).toBeTruthy();
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
  });
});

describe('13: the factor rows', () => {
  const j = inventory('13');
  const at = finder(j);
  const keys = ['harmony', 'fit', 'contrast', 'balance', 'cvd'];
  const factors = at('13.score.factors');

  it('the pitch, the rule, the icon and its inset', () => {
    const rules = range(4).map((n) => at(`13.score.rule-${String(n)}`));
    expect(median(rules.slice(1).map((r, i) => r.y - (rules[i]?.y ?? NaN)))).toBe(FACTOR_ROW);
    expect(rules[0]?.h).toBe(FACTOR_RULE);
    const icons = keys.map((k) => at(`13.score.${k}.icon`));
    expect(median(icons.map((i) => Math.max(i.w, i.h)))).toBe(FACTOR_ICON);
    const centre = median(icons.map((i) => i.x + i.w / 2));
    expect(half(centre - factors.x - FACTOR_ICON / 2)).toBe(FACTOR_ICON_INSET);
  });

  it('the columns, as fractions of the row', () => {
    const column = (part: string): number =>
      Math.round(
        ((median(keys.map((k) => at(`13.score.${k}.${part}`).x)) - factors.x) / factors.w) * 1000,
      ) / 1000;
    expect(column('label')).toBe(FACTOR_COLUMNS.label);
    expect(column('value')).toBe(FACTOR_COLUMNS.value);
    expect(column('note')).toBe(FACTOR_COLUMNS.note);
    // DECOY: the plan's reading, taken against another width.
    expect(FACTOR_COLUMNS.value).not.toBe(0.73);
  });

  it('says each share with its name, then the reason, the icon silent', () => {
    render(
      <ThemeProvider theme="dark">
        <FactorRows
          rows={[
            {
              key: 'h',
              icon: 'score-harmony',
              label: 'Colour Harmony',
              score: 0.95,
              note: 'Analogous Kasane',
            },
            {
              key: 'c',
              icon: 'score-contrast',
              label: 'Contrast Ratio',
              score: 0.9,
              note: 'APCA Lc 48',
            },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Colour Harmony 95%, Analogous Kasane')).toBeTruthy();
    expect(screen.getByText('(APCA Lc 48)')).toBeTruthy();
    expect(raggedFigures(screen.toJSON() as TestNode, nativeNumericFeature)).toStrictEqual([]);
  });

  it('sets the reason in full-width brackets in Japanese', () => {
    render(
      <ThemeProvider theme="dark">
        <FactorRows
          script="japanese"
          rows={[
            { key: 'f', icon: 'score-fit', label: '似合い度', score: 0.92, note: '寒色・くすみ' },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('（寒色・くすみ）')).toBeTruthy();
  });
});

describe('17: the step pill', () => {
  it('is the drawn height, not the badge’s', () => {
    expect(finder(inventory('17'))('17.step').h).toBe(STEP_PILL_HEIGHT);
    // DECOY: the badge's own height.
    expect(STEP_PILL_HEIGHT).not.toBe(BADGE_HEIGHT);
  });

  it('reads as its words, and refuses words that drop the step or the total', () => {
    render(
      <ThemeProvider theme="dark">
        <StepPill step={2} total={4} text="Step 2 of 4 • Undertone & Temperature" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Step 2 of 4 • Undertone & Temperature')).toBeTruthy();
    const pill = (step: number, total: number, text: string) => () =>
      render(
        <ThemeProvider theme="dark">
          <StepPill step={step} total={total} text={text} />
        </ThemeProvider>,
      );
    expect(pill(2, 4, 'Undertone & Temperature')).toThrow(/must print the step/u);
    // A digit inside another number is not the step.
    expect(pill(1, 4, 'Step 12 of 4')).toThrow(/must print the step/u);
    expect(pill(5, 4, 'Step 5 of 4')).toThrow(RangeError);
  });
});

describe('19, 21, 24: the ranked row’s forms are their drawings', () => {
  it('19 harmony: the row, the sample, the insets and the action', () => {
    const at = finder(inventory('19'));
    const rows = range(5).map((n) => `19.rows.row-${String(n)}`);
    expect(median(rows.map((r) => at(r).h))).toBe(HARMONY_ROW.height);
    expect(median(rows.map((r) => Math.max(at(`${r}.swatch`).w, at(`${r}.swatch`).h)))).toBe(
      HARMONY_ROW.swatch,
    );
    expect(median(rows.map((r) => at(`${r}.swatch`).x - at(r).x))).toBe(HARMONY_ROW.inset);
    expect(median(rows.map((r) => at(`${r}.name`).x - right(at(`${r}.swatch`))))).toBe(
      HARMONY_ROW.nameGap,
    );
    expect(median(rows.map((r) => at(`${r}.wear`).h))).toBe(HARMONY_ROW.action.height);
    expect(median(rows.map((r) => right(at(r)) - right(at(`${r}.wear`))))).toBe(
      HARMONY_ROW.action.inset,
    );
    // DECOY: the default sample.
    expect(HARMONY_ROW.swatch).not.toBe(SWATCH_SIZE);
  });

  it('21 nearest: the row, the sample, the badge and its insets', () => {
    const at = finder(inventory('21'));
    const rows = range(5).map((n) => `21.results.row-${String(n)}`);
    expect(median(rows.map((r) => at(r).h))).toBe(NEAREST_ROW.height);
    // Five readings put 21's sample at the default 60, not row 1's 61.5.
    expect(median(rows.map((r) => Math.max(at(`${r}.swatch`).w, at(`${r}.swatch`).h)))).toBe(
      NEAREST_ROW.swatch,
    );
    expect(median(rows.map((r) => at(`${r}.swatch`).x - at(r).x))).toBe(NEAREST_ROW.inset);
    expect(median(rows.map((r) => at(`${r}.name`).x - right(at(`${r}.swatch`))))).toBe(
      NEAREST_ROW.nameGap,
    );
    expect(median(rows.map((r) => at(`${r}.distance`).h))).toBe(NEAREST_ROW.badge.height);
    expect(median(rows.map((r) => at(`${r}.distance`).y - at(r).y))).toBe(NEAREST_ROW.badge.top);
    expect(median(rows.map((r) => right(at(r)) - right(at(`${r}.distance`))))).toBe(
      NEAREST_ROW.badge.right,
    );
    // DECOY: the badge's default height.
    expect(NEAREST_ROW.badge.height).not.toBe(BADGE_HEIGHT);
  });

  it('24 fields: the pitch, the rule, the head, the sample and the columns', () => {
    const at = finder(inventory('24'));
    const rules = range(3).map((n) => at(`24.rows.rule-${String(n)}`));
    const rows = range(4).map((n) => `24.rows.row-${String(n)}`);
    const start = rules[0]?.x ?? NaN;
    expect(median(rules.slice(1).map((r, i) => r.y - (rules[i]?.y ?? NaN)))).toBe(FIELDS_ROW.pitch);
    expect(rules[0]?.h).toBe(FIELDS_ROW.rule);
    // Each row's top: the card's for the first, its rule's foot for the rest.
    const tops = [at('24.rows').y, ...rules.map((r) => bottom(r))];
    expect(median(rows.map((r, i) => at(`${r}.distance`).y - (tops[i] ?? NaN)))).toBe(
      FIELDS_ROW.top,
    );
    expect(median(rows.map((r) => at(`${r}.distance`).h))).toBe(FIELDS_ROW.head);
    expect(median(rows.map((r) => at(`${r}.swatch`).y - bottom(at(`${r}.distance`))))).toBe(
      FIELDS_ROW.headGap,
    );
    expect(median(rows.map((r) => at(`${r}.rank`).x - start))).toBe(FIELDS_ROW.rankInset);
    expect(median(rows.map((r) => at(`${r}.swatch`).x - start))).toBe(FIELDS_ROW.indent);
    expect(median(rows.map((r) => at(`${r}.swatch`).w))).toBe(FIELDS_ROW.swatch);
    expect(median(rows.map((r) => at(`${r}.japanese.label`).x - right(at(`${r}.swatch`))))).toBe(
      FIELDS_ROW.fieldsGap,
    );
    expect(median(rows.map((r) => at(`${r}.romaji.label`).x - at(`${r}.japanese.label`).x))).toBe(
      FIELDS_ROW.columns[0],
    );
    expect(median(rows.map((r) => at(`${r}.hex.label`).x - at(`${r}.romaji.label`).x))).toBe(
      FIELDS_ROW.columns[1],
    );
    const end = right(rules[0] ?? at('24.rows'));
    expect(median(rows.map((r) => end - right(at(`${r}.distance`))))).toBe(FIELDS_ROW.badgeInset);
  });
});

const SAMPLE = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });
const DISTANCE = {
  kind: 'measure',
  value: 2.14,
  places: 2,
  quantity: 'ΔE00',
  space: 'CIEDE2000',
} as const;
const noop = (): void => undefined;

describe('the ranked row as each screen draws it', () => {
  const draw = (props: RankedRowProps): TestNode => {
    render(
      <ThemeProvider theme="dark">
        <RankedRow {...props} />
      </ThemeProvider>,
    );
    return screen.toJSON() as TestNode;
  };

  it('21 prints the badge as drawn and says the metric in full', () => {
    const tree = draw({
      form: 'nearest',
      sample: { name: 'Sabi-asagi', hex: '#5C828C', color: SAMPLE },
      name: '錆浅葱 Sabi-asagi (Rust Light Teal)',
      distance: DISTANCE,
      view: { label: 'View', name: 'View Sabi-asagi', onPress: noop },
    });
    expect(screen.getByText('ΔE00: 2.14')).toBeTruthy();
    expect(screen.getByLabelText('ΔE00 2.14, CIEDE2000')).toBeTruthy();
    expect(screen.getByText('#5C828C')).toBeTruthy();
    expect(raggedFigures(tree, nativeNumericFeature)).toStrictEqual([]);
  });

  it('24 numbers its row, tints its badge, and reads each field as its label and value', () => {
    draw({
      form: 'fields',
      rank: 1,
      relationship: 'Complementary Row',
      distance: { ...DISTANCE, value: 1.42 },
      sample: { name: 'Midori-cha', hex: '#8D7B58', color: SAMPLE },
      fields: [
        { label: 'Japanese', value: '緑茶', script: 'japanese' },
        { label: 'Romaji', value: 'Midori-cha' },
        { label: 'Hex', value: '#8D7B58', numeric: true },
      ],
    });
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('ΔE00 1.42')).toBeTruthy();
    expect(screen.getByLabelText('Japanese: 緑茶')).toBeTruthy();
    expect(screen.getByLabelText('Hex: #8D7B58')).toBeTruthy();
  });

  it('19 sets the name in English • 日本語 and names its action', () => {
    draw({
      form: 'harmony',
      sample: { name: 'Amber Ochre', hex: '#A77344', color: SAMPLE },
      name: 'Amber Ochre',
      ja: '琥珀色',
      detail: 'Complementary • ΔE00: 48.2',
      action: { label: 'Wear', name: 'Wear Amber Ochre', onPress: noop },
    });
    expect(screen.getByText(' • 琥珀色')).toBeTruthy();
    expect(screen.getByLabelText('Wear Amber Ochre')).toBeTruthy();
  });

  it('takes only what each drawing has, by type', () => {
    const sample = { name: 'x', hex: '#526A6B', color: SAMPLE };
    const forms: RankedRowProps[] = [
      // @ts-expect-error — 19 prints no rank; the order carries it.
      {
        form: 'harmony',
        sample,
        name: 'x',
        detail: 'x',
        action: { label: 'x', onPress: noop },
        rank: 1,
      },
      // @ts-expect-error — 21 prints no rank either.
      {
        form: 'nearest',
        sample,
        name: 'x',
        distance: DISTANCE,
        view: { label: 'x', onPress: noop },
        rank: 1,
      },
      // @ts-expect-error — 24 draws no action.
      {
        form: 'fields',
        rank: 1,
        relationship: 'x',
        distance: DISTANCE,
        sample,
        fields: [
          { label: 'a', value: 'a' },
          { label: 'b', value: 'b' },
          { label: 'c', value: 'c' },
        ],
        action: { label: 'x', onPress: noop },
      },
      // DECOY: as drawn, it compiles.
      { form: 'harmony', sample, name: 'x', detail: 'x', action: { label: 'x', onPress: noop } },
    ];
    expect(forms).toHaveLength(4);
  });
});
