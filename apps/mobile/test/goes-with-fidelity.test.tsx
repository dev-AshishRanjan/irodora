/**
 * What Goes With This is mockup 19 in order, grouping and proportion (F-252, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 19's 40 elements is DRAWN. This asks the
 * rest of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar (back, divider, title, filter), the anchor heading, the anchor card (ring, name,
 *   OKLCh, slot), the rows heading, the rows (each sample, name, detail, Wear), and Build.
 * - **Grouping**: the anchor's three lines share a row with its ring inside its card; each row's Wear is
 *   inside its row; the rows heading's line holds the heading.
 * - **Proportion**: every size, corner, step and interval the page passes is recomputed here from
 *   `mockups/inventory/19.json` (framed, 0.6124 dp a pixel) through R9 §2's snap, each text's own line
 *   inset subtracted; the intervals the drawing sets tighter than the scale are named, and their cost
 *   is ADR-0172's; and every text is drawn at the step, weight and ink 19 records.
 *
 * What a tree cannot show — that it looks like 19 — is the person's capture (criterion 4).
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { nativeIconStroke, nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  ActionBar,
  AppBar,
  APP_BAR_DIVIDER_TEST_ID,
  APP_BAR_INSET,
  Card,
  HARMONY_ROW,
  RankedRow,
  Screen,
  Swatch,
  Text,
  ThemeProvider,
} from '@irodora/ui';
import {
  ANCHOR_RING,
  ANCHOR_SAMPLE,
  ARROW_GLYPH,
  BACK_GLYPH,
  BUILD,
  DIVIDER,
  FILTER_GLYPH,
  goesWith,
  WITH_APP_BAR,
} from '../src/goes-with';
import { entryBySlug } from '../src/corpus';
import { GoesWith } from '../src/screens/GoesWith';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/* ----------------------------------------------------------------------------- the record */

interface Element {
  readonly id: string;
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly type: { readonly face: string; readonly size: string; readonly weight: number } | null;
  readonly tokens: Readonly<Record<string, string>>;
  readonly raw?: Readonly<Record<string, number>>;
}
interface Inventory {
  readonly frame: {
    readonly screens: readonly {
      readonly dpPerPx: number;
      readonly box: { readonly x: number; readonly y: number };
    }[];
  };
  readonly elements: readonly Element[];
}
const NINETEEN = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '19.json'), 'utf8'),
) as Inventory;
/** 19's scale: its frame's inner width, 627 px for 384 dp. */
const DP = NINETEEN.frame.screens[0]?.dpPerPx ?? NaN;
const ORIGIN = NINETEEN.frame.screens[0]?.box ?? { x: NaN, y: NaN };
/** An element, its dp box recomputed from its measured pixels, from the screen's own origin. */
const el = (id: string): Element => {
  const e = NINETEEN.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no ${id}`);
  return {
    ...e,
    dp: {
      x: (e.box.x - ORIGIN.x) * DP,
      y: (e.box.y - ORIGIN.y) * DP,
      w: e.box.w * DP,
      h: e.box.h * DP,
    },
  };
};
const bottom = (e: Element): number => e.dp.y + e.dp.h;
const right = (e: Element): number => e.dp.x + e.dp.w;
const SCREEN = 384;

/** R9 §2's snap: the nearest step, the smaller on a tie. A negative interval is never rounded. */
const STEPS = Object.entries(nativeSpacing) as readonly (readonly [string, number])[];
type SpacingStep = keyof typeof nativeSpacing;
const snap = (dp: number): SpacingStep => {
  if (dp < 0) throw new RangeError(`a negative interval (${String(dp)} dp) is not snapped`);
  const ranked = [...STEPS].sort(
    (a, b) => Math.abs(a[1] - dp) - Math.abs(b[1] - dp) || a[1] - b[1],
  );
  return (ranked[0]?.[0] ?? '') as SpacingStep;
};
/** Tighter than the scale can draw — negative, or under half `xs` — so the floor, `xs` (§2). */
const belowTheScale = (dp: number): 'xs' => {
  expect(dp).toBeLessThan(nativeSpacing.xs / 2);
  return 'xs';
};
/** Siblings drawn alike take one step: the one most snap to, the smaller on a tie (§2). */
const snapSiblings = (dps: readonly number[]): SpacingStep => {
  const counts = new Map<SpacingStep, number>();
  for (const d of dps) counts.set(snap(d), (counts.get(snap(d)) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, n]) => n === best).map(([s]) => s);
  return tied.sort((a, b) => nativeSpacing[a] - nativeSpacing[b])[0] ?? 'xs';
};
const px = (step: SpacingStep): number => nativeSpacing[step];
type Step = keyof typeof nativeType.latin;
/** A text's own line inset, (lineHeight − em) / 2: the part of a drawn gap that is the text's. */
const lineInset = (step: Step): number =>
  (nativeType.latin[step].lineHeight - nativeType.latin[step].fontSize) / 2;
const half = (n: number): number => Math.round(n * 2) / 2;
const tenth = (n: number): number => Math.round(n * 10) / 10;

/* ----------------------------------------------------------------------------- the page */

/** 19's fixture anchor (ADR-0168's census): seven rows, opening as 19 draws. */
const SLUG = 'aki-batake';
const ROWS = goesWith(entryBySlug(SLUG)!).rows;
const ignore = (): void => undefined;

type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

const setup = () => {
  mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  const tree = render(
    <ThemeProvider theme="dark">
      <GoesWith slug={SLUG} onBack={ignore} onWear={ignore} onBuild={ignore} />
    </ThemeProvider>,
  );
  const byId = (id: string): Instance =>
    tree.UNSAFE_root.findAll((n) => n.props['testID'] === id)[0] ??
    (() => {
      throw new Error(`no ${id}`);
    })();
  return { tree, byId, root: tree.UNSAFE_root };
};

const inOrder = (root: Instance): Instance[] => root.findAll(() => true, { deep: true });
const position = (root: Instance, node: Instance): number => inOrder(root).indexOf(node);
const isAncestor = (a: Instance, b: Instance): boolean => {
  for (let at: Instance | null = b.parent; at !== null; at = at.parent) if (at === a) return true;
  return false;
};
const flat = (style: unknown): Readonly<Record<string, unknown>> =>
  ((StyleSheet.flatten(style as StyleProp<TextStyle>) as unknown) ?? {}) as Readonly<
    Record<string, unknown>
  >;
/** The nearest ancestor both share that lays its children out in a row. */
const sharedRow = (a: Instance, b: Instance): Instance | null => {
  for (let at: Instance | null = a.parent; at !== null; at = at.parent)
    if (flat(at.props['style'])['flexDirection'] === 'row' && isAncestor(at, b)) return at;
  return null;
};
/** The style a person sees: the host Text's. */
const rendered = (node: Instance): Readonly<Record<string, unknown>> => {
  const host =
    (node.type as unknown) === 'Text'
      ? node
      : node.findAll((n) => (n.type as unknown) === 'Text')[0];
  return flat(host?.props['style']);
};
/** The nearest ancestor (or the node) whose style sets `key`, and that style. */
const styled = (node: Instance, key: string): Readonly<Record<string, unknown>> => {
  for (let at: Instance | null = node; at !== null; at = at.parent) {
    const s = flat(at.props['style']);
    if (s[key] !== undefined) return s;
  }
  return {};
};
const barOf = (root: Instance): Readonly<Record<string, unknown>> =>
  root.find((n) => n.type === AppBar).props;

/* ----------------------------------------------------------------------------- order */

describe('order: 19 top to bottom', () => {
  it('the bar: back, divider, title, filter', () => {
    const { root, byId } = setup();
    const back = root
      .find((n) => n.type === AppBar)
      .findAll((n) => n.props['accessibilityLabel'] === 'Back to Atlas')[0]!;
    const at = [back, byId(APP_BAR_DIVIDER_TEST_ID), byId('with.filter')].map((n) =>
      position(root, n),
    );
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
  });

  it('the anchor heading, the card (ring, name, OKLCh, slot), the rows heading, the rows, Build', () => {
    const { root, byId } = setup();
    const ids = [
      'with.anchor.heading',
      'with.anchor',
      'with.anchor.ring',
      'with.anchor.name',
      'with.anchor.oklch',
      'with.anchor.slot',
      'with.rows.heading',
      ...ROWS.map((_, i) => `with.row.${String(i)}`),
      'with.build',
    ];
    const at = ids.map((id) => position(root, byId(id)));
    expect(at).toStrictEqual([...at].sort((a, b) => a - b));
  });

  it('a row: sample, name, detail, then Wear', () => {
    const { root, byId } = setup();
    for (let i = 0; i < ROWS.length; i += 1) {
      const at = ['swatch', 'name', 'detail', 'action'].map((part) =>
        position(root, byId(`with.row.${String(i)}.${part}`)),
      );
      expect(at).toStrictEqual([...at].sort((a, b) => a - b));
    }
  });
});

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 19 draws together is together', () => {
  it('the anchor’s lines share a row with its ring, inside its card', () => {
    const { byId } = setup();
    const card = byId('with.anchor');
    for (const id of [
      'with.anchor.ring',
      'with.anchor.name',
      'with.anchor.oklch',
      'with.anchor.slot',
    ])
      expect(isAncestor(card, byId(id))).toBe(true);
    expect(sharedRow(byId('with.anchor.ring'), byId('with.anchor.name'))).not.toBeNull();
    // The three lines are one column: no two of them share a row.
    expect(sharedRow(byId('with.anchor.name'), byId('with.anchor.oklch'))).toBe(
      sharedRow(byId('with.anchor.ring'), byId('with.anchor.slot')),
    );
  });

  it('each Wear is inside its row, beside its words', () => {
    const { byId } = setup();
    for (let i = 0; i < ROWS.length; i += 1) {
      const row = byId(`with.row.${String(i)}`);
      expect(isAncestor(row, byId(`with.row.${String(i)}.action`))).toBe(true);
      expect(
        sharedRow(byId(`with.row.${String(i)}.swatch`), byId(`with.row.${String(i)}.action`)),
      ).not.toBeNull();
    }
  });

  it('no word is held to one line: a long name or line wraps (E3)', () => {
    const { byId } = setup();
    const words = [
      'with.anchor.heading',
      'with.anchor.name',
      'with.anchor.oklch',
      'with.anchor.slot',
      'with.rows.heading',
      ...ROWS.flatMap((_, i) => [`with.row.${String(i)}.name`, `with.row.${String(i)}.detail`]),
    ];
    for (const id of words) {
      const node = byId(id);
      const texts = [node, ...node.findAll((n) => n.type === Text)];
      expect({
        [id]: texts.filter((n) => n.props['numberOfLines'] !== undefined).length,
      }).toStrictEqual({ [id]: 0 });
    }
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size recomputed from 19.json', () => {
  it('the bar: its height and fill, no rule, the divider, the inset and gaps, the title', () => {
    const { root } = setup();
    expect(WITH_APP_BAR).toBe(half(el('19.header').dp.h));
    expect(el('19.header').tokens['bg']).toBe('level1');
    expect(DIVIDER).toBe(half(el('19.header-divider').dp.h));
    const bar = barOf(root);
    expect(bar).toMatchObject({
      height: WITH_APP_BAR,
      fill: 'surface.1',
      rule: false,
      divider: DIVIDER,
      // The side inset is the shared median every bar is read to (ADR-0161 D8; F-282 re-reads them).
      inset: APP_BAR_INSET,
      gap: px(
        snapSiblings([
          el('19.header-divider').dp.x - right(el('19.back')),
          el('19.title').dp.x - right(el('19.header-divider')),
        ]),
      ),
    });
    expect(bar['title']).toMatchObject({ size: 'body', weight: 600, layout: 'inline' });
    expect(el('19.title').type).toMatchObject({ size: 'body', weight: 600 });
  });

  it('the glyphs by 06’s rule, from each glyph’s own ink in 19.json', () => {
    const { root } = setup();
    const ink = (id: string): readonly [number, number] => {
      const raw = el(id).raw;
      return [(raw?.['glyphWPx'] ?? NaN) * DP, (raw?.['glyphHPx'] ?? NaN) * DP];
    };
    // (ink − the line's fixed width) × 24 ÷ the path's extent, the two readings averaged (09's rule):
    // the arrows' paths span 15.5 × 12 units, the filter's 18 × 17.
    const size = ([w, h]: readonly [number, number], pw: number, ph: number): number =>
      half((((w - nativeIconStroke) * 24) / pw + ((h - nativeIconStroke) * 24) / ph) / 2);
    expect(BACK_GLYPH).toBe(size(ink('19.back'), 15.5, 12));
    expect(FILTER_GLYPH).toBe(size(ink('19.filter'), 18, 17));
    expect(ARROW_GLYPH).toBe(size(ink('19.bar.build'), 15.5, 12));
    const bar = barOf(root) as {
      back: { size: number };
      trailing: { icons: readonly { size: number }[] };
    };
    expect(bar.back.size).toBe(BACK_GLYPH);
    expect(bar.trailing.icons[0]?.size).toBe(FILTER_GLYPH);
  });

  it('the page: inset sm (both edges), the headings at md from the screen’s edge', () => {
    const { root, byId } = setup();
    const card = el('19.anchor');
    expect(snapSiblings([card.dp.x, SCREEN - right(card)])).toBe('sm');
    expect(root.find((n) => n.type === Screen).props['padding']).toBe('sm');
    // 19.6 and 20.2 dp: siblings drawn alike, md and lg one each, the tie the smaller (§2).
    expect(snapSiblings([el('19.anchor.heading').dp.x, el('19.rows.heading').dp.x])).toBe('md');
    // The page's sm plus the heading's own sm.
    for (const id of ['with.anchor.heading', 'with.rows.heading'])
      expect(
        nativeSpacing.sm + Number(styled(byId(id), 'paddingHorizontal')['paddingHorizontal']),
      ).toBe(nativeSpacing.md);
  });

  it('the vertical rhythm: bar → heading → card → heading → rows, each snapped, the insets out', () => {
    const { byId } = setup();
    const label = lineInset('label');
    // Bar foot → the anchor heading: the page's top padding.
    expect(snap(el('19.anchor.heading').dp.y - bottom(el('19.header')) - label)).toBe('sm');
    // Heading → card.
    expect(snap(el('19.anchor').dp.y - bottom(el('19.anchor.heading')) - label)).toBe('xs');
    expect(styled(byId('with.anchor'), 'marginTop')['marginTop']).toBe(nativeSpacing.xs);
    // Card → the rows heading: 24.5 dp less the label's inset, lg.
    const cardToHeading = el('19.rows.heading').dp.y - bottom(el('19.anchor')) - label;
    expect(snap(cardToHeading)).toBe('lg');
    expect(styled(byId('with.rows.heading'), 'marginTop')['marginTop']).toBe(px('lg'));
    // Rows heading → row 1.
    expect(snap(el('19.rows.row-1').dp.y - bottom(el('19.rows.heading')) - label)).toBe('xs');
    // Row → row: siblings.
    const gaps = [1, 2, 3, 4].map(
      (n) => el(`19.rows.row-${String(n + 1)}`).dp.y - bottom(el(`19.rows.row-${String(n)}`)),
    );
    expect(snapSiblings(gaps)).toBe('sm');
  });

  it('the anchor card: level 1 at its corner, padded md; the ring, the sample, the words md from it', () => {
    const { root } = setup();
    const card = el('19.anchor');
    const ring = el('19.anchor.ring');
    expect(
      snapSiblings([ring.dp.x - card.dp.x, ring.dp.y - card.dp.y, bottom(card) - bottom(ring)]),
    ).toBe('md');
    const built = root.find((n) => n.type === Card && n.props['testID'] === 'with.anchor');
    expect(built.props).toMatchObject({ level: '1', padding: 'md', radius: card.tokens['radius'] });
    expect(ANCHOR_RING).toStrictEqual({
      ring: tenth((ring.raw?.['ringPx'] ?? NaN) * DP),
      gap: tenth((ring.raw?.['gapPx'] ?? NaN) * DP),
    });
    expect(ANCHOR_SAMPLE).toStrictEqual({
      width: half(el('19.anchor.swatch').dp.w),
      height: half(el('19.anchor.swatch').dp.h),
    });
    const sample = root.find(
      (n) => n.type === Swatch && n.props['testID'] === 'with.anchor.swatch',
    );
    expect(sample.props).toMatchObject({
      anchor: ANCHOR_RING,
      width: ANCHOR_SAMPLE.width,
      height: ANCHOR_SAMPLE.height,
      corner: el('19.anchor.swatch').tokens['radius'],
      keyline: false,
    });
    expect(snap(el('19.anchor.name').dp.x - right(ring))).toBe('md');
  });

  it('the named intervals: tighter than the scale, the floor xs, their cost ADR-0172’s', () => {
    const name = el('19.anchor.name');
    const oklch = el('19.anchor.oklch');
    const slot = el('19.anchor.garment');
    // name (body) → OKLCh (label); OKLCh (label) → slot (label); a row's name (body) → detail (label).
    const nameToOklch = oklch.dp.y - bottom(name) - lineInset('body') - lineInset('label');
    const oklchToSlot = slot.dp.y - bottom(oklch) - 2 * lineInset('label');
    const rowNameToDetail =
      el('19.rows.row-1.detail').dp.y -
      bottom(el('19.rows.row-1.name')) -
      lineInset('body') -
      lineInset('label');
    expect(px(belowTheScale(nameToOklch))).toBe(nativeSpacing.xs);
    expect(px(belowTheScale(oklchToSlot))).toBe(nativeSpacing.xs);
    expect(px(belowTheScale(rowNameToDetail))).toBe(nativeSpacing.xs);
    // What the floor adds over the drawing, as ADR-0172 D1 states it.
    expect(nativeSpacing.xs - nameToOklch).toBeCloseTo(6.9, 1);
    expect(nativeSpacing.xs - oklchToSlot).toBeCloseTo(3.7, 1);
    expect(nativeSpacing.xs - rowNameToDetail).toBeCloseTo(5.1, 1);
  });

  it('the rows: RankedRow’s harmony form, its numbers 19’s (rows.test recomputes them)', () => {
    const { root } = setup();
    const rows = root.findAll((n) => n.type === RankedRow);
    expect(rows).toHaveLength(ROWS.length);
    for (const row of rows) expect(row.props['form']).toBe('harmony');
    expect(HARMONY_ROW.height).toBe(84);
    // Every row's sample and Wear take 19's corners.
    expect(el('19.rows.row-1.swatch').tokens['radius']).toBe('sm');
    expect(el('19.rows.row-1.wear').tokens['radius']).toBe('sm');
  });

  it('the action bar: filled level 1 and ruled; Build tonal level 3, at its height, corner and step', () => {
    const { root } = setup();
    expect(BUILD).toBe(half(el('19.bar.build').dp.h));
    const bar = root.find((n) => n.type === ActionBar).props as Readonly<Record<string, unknown>>;
    const build = el('19.bar.build');
    const drawn = el('19.bar');
    expect(drawn.tokens['bg']).toBe('level1');
    expect(bar).toMatchObject({
      fill: 'surface.1',
      rule: true,
      padding: {
        top: px(snap(build.dp.y - drawn.dp.y)),
        side: px(snap(build.dp.x - drawn.dp.x)),
        bottom: px(snap(bottom(drawn) - bottom(build))),
      },
    });
    const actions = bar['actions'] as readonly Readonly<Record<string, unknown>>[];
    expect(actions[0]).toMatchObject({
      variant: 'tonal',
      level: 3,
      height: BUILD,
      radius: build.tokens['radius'],
      glyph: 'arrow-right',
      glyphSize: ARROW_GLYPH,
    });
    expect(build.tokens['bg']).toBe('level3');
  });

  it('every text at the step 19 records', () => {
    const { byId } = setup();
    const steps: readonly (readonly [string, string])[] = [
      ['with.anchor.heading', '19.anchor.heading'],
      ['with.anchor.name', '19.anchor.name'],
      ['with.anchor.oklch', '19.anchor.oklch'],
      ['with.anchor.slot', '19.anchor.garment'],
      ['with.rows.heading', '19.rows.heading'],
      ['with.row.0.name', '19.rows.row-1.name'],
      ['with.row.0.detail', '19.rows.row-1.detail'],
      ['with.row.0.action', '19.rows.row-1.wear'],
    ];
    for (const [id, record] of steps) {
      const size = el(record).type?.size as keyof typeof nativeType.latin;
      const font = rendered(byId(id))['fontSize'];
      // The latin step's em; a Japanese line is the same step in the bundled face's scale.
      const steps: readonly number[] = [
        nativeType.latin[size].fontSize,
        nativeType.japanese[size].fontSize,
      ];
      expect({ [id]: steps.includes(Number(font)) }).toStrictEqual({ [id]: true });
    }
    // DECOY: the headings are not body, as F-220 had them.
    expect(el('19.anchor.heading').type?.size).not.toBe('body');
  });
});
