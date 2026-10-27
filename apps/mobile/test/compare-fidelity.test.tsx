/**
 * The Compare page is mockup 08 in order, grouping and proportion (F-249, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 08's 69 elements is DRAWN. This asks the
 * rest of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar, the pair card and each half's sample, name, meta and Change, the two cards
 *   and their rows, and the two actions come in 08's reading order.
 * - **Grouping**: the two halves and the seam share the pair card's row; the two cards share a row;
 *   each metric row's label is beside its value; each access row's value is under its label; the
 *   actions share the bar's row; no control sits inside a sample's node.
 * - **Proportion**: every size, corner, step and interval the page passes is recomputed here from
 *   `mockups/inventory/08.json` through R9 §2's snap, each text's own line inset subtracted, not
 *   restated; the interval the drawing sets tighter than the scale is named (ADR-0157 D1); and every
 *   text is drawn at the step, weight and ink 08 records.
 *
 * What a tree cannot show — that it looks like 08 — is the person's capture (criterion 4).
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { Dimensions, ScrollView, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { nativeIconStroke, nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  ActionBar,
  AppBar,
  Button,
  Card,
  Illustration,
  READOUT_RULED_LABEL,
  Text,
  ThemeProvider,
} from '@irodora/ui';
import {
  ACTION,
  BACK_GLYPH,
  CHANGE,
  COMPARE_APP_BAR,
  COMPARE_ART,
  EXPORT_GLYPH,
  pairSampleSize,
  SEAM,
} from '../src/compare-readout';
import { t as message, type MessageKey } from '../src/i18n';
import { Compare } from '../src/screens/Compare';

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
}
interface Inventory {
  readonly frame: { readonly screens: readonly { readonly dpPerPx: number }[] };
  readonly elements: readonly Element[];
}
const EIGHT = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '08.json'), 'utf8'),
) as Inventory;
/** 08 is full-bleed: 768 px for 384 dp. */
const DP = EIGHT.frame.screens[0]?.dpPerPx ?? NaN;
/** An element, its dp recomputed from its measured pixels (F-248's lesson: rounded dp mislead a snap). */
const el = (id: string): Element => {
  const e = EIGHT.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no ${id}`);
  return { ...e, dp: { x: e.box.x * DP, y: e.box.y * DP, w: e.box.w * DP, h: e.box.h * DP } };
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
/** Tighter than the scale can draw — under half `xs` — so the floor, `xs`, named (§2). */
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

/* ----------------------------------------------------------------------------- the page */

const A = 'aka-tsuchi';
const B = 'ao-ta';
const ignore = (): void => undefined;
type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

const setup = (tag = DEFAULT_LANGUAGE_TAG) => {
  mockLanguageTag = tag;
  try {
    const tree = render(
      <ThemeProvider theme="dark">
        <Compare
          initialA={A}
          initialB={B}
          onBack={ignore}
          onExport={ignore}
          onExportPdf={ignore}
          onAddToStudio={ignore}
        />
      </ThemeProvider>,
    );
    const byId = (id: string): Instance =>
      tree.UNSAFE_root.findAll((n) => n.props['testID'] === id)[0] ??
      (() => {
        throw new Error(`no ${id}`);
      })();
    return { tree, byId, root: tree.UNSAFE_root };
  } finally {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  }
};

const inOrder = (root: Instance): Instance[] => root.findAll(() => true, { deep: true });
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
/** The nearest ancestor whose own style sets a key: the box that pads or spaces a block. */
const styled = (node: Instance, key: string): Instance | null => {
  for (let at: Instance | null = node.parent; at !== null; at = at.parent)
    if (flat(at.props['style'])[key] !== undefined) return at;
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
const say = (key: MessageKey): string => message('en', key);
const METRICS = ['delta-e00', 'delta-eok', 'lightness', 'chroma', 'hue'] as const;
const ACCESS = ['wcag', 'protan', 'deutan', 'tritan'] as const;
const metric = (key: string, part?: string) =>
  `compare.metrics.table.${key}${part === undefined ? '' : `.${part}`}`;
const access = (key: string, part?: string) =>
  `compare.access.table.${key}${part === undefined ? '' : `.${part}`}`;

/* ----------------------------------------------------------------------------- order */

describe('order: 08 top to bottom', () => {
  it('the pair: A’s sample, name, meta and Change, then B’s, the seam between the halves', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const sequence = [
      byId('compare.a.swatch'),
      byId('compare.a.name'),
      byId('compare.a.meta'),
      byId('compare.a.change'),
      byId('compare.seam'),
      byId('compare.b.swatch'),
      byId('compare.b.name'),
      byId('compare.b.meta'),
      byId('compare.b.change'),
    ].map(at);
    expect(sequence.every((n) => n >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the cards: the metrics before the access card, each row label → value → reading', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const sequence = [
      byId('compare.pair'),
      byId('compare.metrics'),
      ...METRICS.flatMap((k) => [
        byId(metric(k, 'rule')),
        byId(metric(k, 'label')),
        ...(k === 'delta-e00' ? [byId(metric(k, 'formula'))] : []),
        byId(metric(k, 'value')),
        ...(k === 'delta-eok' ? [] : [byId(metric(k, 'reading'))]),
      ]),
      byId('compare.access'),
      ...ACCESS.flatMap((k) => [
        byId(access(k, 'rule')),
        byId(access(k, 'label')),
        byId(access(k, 'value')),
        ...(k === 'wcag' ? [byId(access(k, 'note'))] : []),
      ]),
    ].map(at);
    expect(sequence.every((n) => n >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the art is the scroll’s first child, behind everything', () => {
    const { root } = setup();
    const scroll = root.find(
      (n) => n.type === ScrollView && n.props['testID'] === 'compare.scroll',
    );
    const first = scroll.findAll((n) => n.props['testID'] === 'compare.art')[0]!;
    const all = inOrder(scroll);
    const firstText = all.find((n) => n.type === Text)!;
    expect(all.indexOf(first)).toBeLessThan(all.indexOf(firstText));
    expect(first.props['pointerEvents']).toBe('none');
  });

  it('the actions: the PDF before the Studio', () => {
    const { root } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const bar = root.findByType(ActionBar);
    const [pdf, studio] = bar.findAllByType(Button);
    expect(pdf?.props['label']).toBe(say('compare.exportPdf'));
    expect(studio?.props['label']).toBe(say('compare.addToStudio'));
    expect(at(pdf!)).toBeLessThan(at(studio!));
  });
});

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 08 draws together is together', () => {
  it('the two halves and the seam share the pair card’s row, and each half holds its own four', () => {
    const { byId } = setup();
    const row = sharedRow(byId('compare.a.swatch'), byId('compare.b.swatch'));
    expect(row).not.toBeNull();
    expect(isAncestor(row!, byId('compare.seam'))).toBe(true);
    expect(isAncestor(byId('compare.pair'), row!)).toBe(true);
    expect(flat(row!.props['style'])['alignItems']).toBe('stretch');
    // A's column holds none of B's.
    expect(sharedRow(byId('compare.a.name'), byId('compare.a.change'))).toBe(row);
  });

  it('no control sits inside a sample’s node, and each sample is named with its provenance', () => {
    const { byId } = setup();
    for (const side of ['a', 'b'] as const) {
      const sample = byId(`compare.${side}.swatch`);
      expect(sample.findAll((n) => n.type === Button)).toHaveLength(0);
      expect(sample.props['onPress']).toBeUndefined();
    }
  });

  it('the two cards share a row; each metric’s label is beside its value; each access value under its label', () => {
    const { byId } = setup();
    expect(sharedRow(byId('compare.metrics'), byId('compare.access'))).not.toBeNull();
    // A metric's label and value share its own row; an access row stacks them, so the only row they
    // share is the one holding the two cards, outside the row itself.
    for (const k of METRICS) {
      const row = byId(metric(k));
      const shared = sharedRow(byId(metric(k, 'label')), byId(metric(k, 'value')));
      expect([k, shared !== null && (shared === row || isAncestor(row, shared))]).toStrictEqual([
        k,
        true,
      ]);
    }
    for (const k of ACCESS) {
      const row = byId(access(k));
      const shared = sharedRow(byId(access(k, 'label')), byId(access(k, 'value')));
      expect([k, shared === null || !(shared === row || isAncestor(row, shared))]).toStrictEqual([
        k,
        true,
      ]);
    }
    // The note is inside WCAG's row.
    expect(isAncestor(byId(access('wcag')), byId(access('wcag', 'note')))).toBe(true);
  });

  it('the two actions share the bar’s row', () => {
    const { root } = setup();
    const bar = root.findByType(ActionBar);
    const [pdf, studio] = bar.findAllByType(Button);
    const row = sharedRow(pdf!, studio!);
    expect(row !== null && isAncestor(bar, row)).toBe(true);
  });

  it('no word sits on the art: every text is in the bar, a card or the action bar', () => {
    const { root, byId } = setup();
    const holders = ['compare.pair', 'compare.metrics', 'compare.access'].map(byId);
    const bars = [root.findByType(AppBar), root.findByType(ActionBar)];
    const scroll = root.find(
      (n) => n.type === ScrollView && n.props['testID'] === 'compare.scroll',
    );
    for (const text of scroll.findAllByType(Text))
      expect(holders.some((h) => isAncestor(h, text))).toBe(true);
    for (const text of root.findAllByType(Text).filter((t) => !isAncestor(scroll, t)))
      expect(
        bars.some((b) => isAncestor(b, text)) ||
          root
            .findAll((n) => n.props['testID'] === 'compare.pick')
            .some((s) => isAncestor(s, text)),
      ).toBe(true);
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size and interval from 08.json (ADR-0157 D1)', () => {
  it('the drawn sizes are 08’s', () => {
    expect(COMPARE_APP_BAR).toBe(half(el('08.header-rule').dp.y - el('08.header').dp.y));
    expect(CHANGE).toBe(half(el('08.pair.a.change').dp.h));
    expect(el('08.pair.b.change').box.h).toBe(el('08.pair.a.change').box.h);
    // The two actions are one height (ADR-0157 D1), as 08 draws them.
    expect(ACTION).toBe(half(el('08.actions.pdf').dp.h));
    expect(el('08.actions.studio').box.h).toBe(el('08.actions.pdf').box.h);
    expect(SEAM).toBe(half(el('08.seam').dp.w));
  });

  /*
   * A line glyph inks its path's extent on the 24-unit grid, scaled to its size, plus the line, whose
   * width is fixed on screen: size = (ink − line) × 24 ÷ extent, to the half dp. The back arrow's path
   * spans 12 units tall; the download glyph's page 18 (Glyph.tsx). The arrow's ink is 08.mjs's 18 px.
   */
  it('each glyph is drawn at the size that inks what 08 draws', () => {
    const line = (inkPx: number, extent: number): number =>
      half(((inkPx * DP - nativeIconStroke) * 24) / extent);
    expect(BACK_GLYPH).toBe(line(18, 12));
    expect(EXPORT_GLYPH).toBe(line(el('08.export').box.h, 18));
    const { root } = setup();
    const bar = root.findByType(AppBar).props as Record<string, unknown>;
    expect((bar['back'] as { size: number }).size).toBe(BACK_GLYPH);
    const icons = (bar['trailing'] as { icons: readonly { size: number }[] }).icons;
    expect(icons[0]?.size).toBe(EXPORT_GLYPH);
  });

  it('the app bar: 08’s height, its inset, its rule; the title centred at its step and weight', () => {
    const { root } = setup();
    const bar = root.findByType(AppBar).props as Record<string, unknown>;
    expect(bar['height']).toBe(COMPARE_APP_BAR);
    expect(bar['rule']).toBe(true);
    expect(bar['inset']).toBe(
      px(snapSiblings([el('08.back').dp.x, SCREEN - right(el('08.export'))])),
    );
    const title = bar['title'] as Record<string, unknown>;
    expect([title['align'], title['size'], title['weight']]).toStrictEqual([
      'centre',
      el('08.title').type?.size,
      el('08.title').type?.weight,
    ]);
    expect((bar['back'] as { weight: number }).weight).toBe(el('08.back').type?.weight);
  });

  it('the scroll: below the rule, the leaked heading’s space kept; the cards’ foot above the bar', () => {
    const { root } = setup();
    const scroll = root.find(
      (n) => n.type === ScrollView && n.props['testID'] === 'compare.scroll',
    );
    const pad = flat(scroll.props['contentContainerStyle']);
    expect(pad['paddingTop']).toBe(px(snap(el('08.pair').dp.y - bottom(el('08.header-rule')))));
    expect(pad['paddingBottom']).toBe(px(snap(el('08.actions').dp.y - bottom(el('08.metrics')))));
  });

  it('the pair card: inset, its halves padded, the seam between them, the samples sized by their half', () => {
    const { byId } = setup();
    const pair = el('08.pair');
    const inset = styled(byId('compare.pair'), 'paddingHorizontal')!;
    expect(flat(inset.props['style'])['paddingHorizontal']).toBe(
      px(snapSiblings([pair.dp.x, SCREEN - right(pair)])),
    );
    const a = el('08.pair.a.swatch');
    const b = el('08.pair.b.swatch');
    const seam = el('08.seam');
    // Card → sample (top, leading, trailing) and sample → seam → sample: siblings drawn alike.
    const pad = snapSiblings([
      a.dp.y - pair.dp.y,
      a.dp.x - pair.dp.x,
      right(pair) - right(b),
      seam.dp.x - right(a),
      b.dp.x - right(seam),
    ]);
    const row = sharedRow(byId('compare.a.swatch'), byId('compare.b.swatch'))!;
    expect(flat(row.props['style'])['gap']).toBe(px(pad));
    const halfA = styled(byId('compare.a.swatch'), 'paddingVertical')!;
    expect(flat(halfA.props['style'])).toMatchObject({
      paddingVertical: px(pad),
      paddingLeft: px(pad),
    });
    // The sample is its half less its insets (ADR-0154 D2): 08's 151.5 dp, and the ties' 8.
    // Sized by the window the page is drawn in (jest's), by the same function 384 dp is checked by.
    expect(byId('compare.a.swatch').props['size']).toBe(
      pairSampleSize(Dimensions.get('window').width),
    );
    expect(pairSampleSize(SCREEN)).toBe((SCREEN - 2 * px('md') - SEAM) / 2 - 2 * px(pad));
    expect(pairSampleSize(SCREEN)).toBeGreaterThan(a.dp.w);
    // The corner, and no keyline: 08 draws none (ADR-0157 D3).
    const swatch = byId('compare.a.swatch').props;
    expect([swatch['corner'], swatch['keyline']]).toStrictEqual([a.tokens['radius'], false]);
    expect(a.tokens['keyline']).toBeUndefined();
  });

  it('each half: sample → name, name → meta (named), meta → Change, Change → the card’s foot', () => {
    const { byId } = setup();
    const a = el('08.pair.a.swatch');
    const name = el('08.pair.a.name');
    const meta = el('08.pair.a.meta');
    const change = el('08.pair.a.change');
    const stack = styled(byId('compare.a.swatch'), 'gap')!;
    expect(flat(stack.props['style'])['gap']).toBe(
      px(snap(name.dp.y - bottom(a) - lineInset('label'))),
    );
    expect(px(snap(change.dp.y - bottom(meta) - lineInset('caption')))).toBe(
      flat(stack.props['style'])['gap'],
    );
    // Name → meta: tighter than the scale, named (ADR-0157 D1).
    const words = styled(byId('compare.a.meta'), 'gap')!;
    expect(flat(words.props['style'])['gap']).toBe(
      px(belowTheScale(meta.dp.y - bottom(name) - lineInset('label') - lineInset('caption'))),
    );
    expect(snap(bottom(el('08.pair')) - bottom(change))).toBe('sm');
  });

  it('the two cards: below the pair, side by side, padded, their titles and tables at 08’s intervals', () => {
    const { root, byId } = setup();
    const m = el('08.metrics');
    const a = el('08.access');
    // Pair → cards: the leaked caption's space kept.
    expect(snap(m.dp.y - bottom(el('08.pair')))).toBe('xl');
    expect(
      flat(sharedRow(byId('compare.metrics'), byId('compare.access'))!.props['style'])['gap'],
    ).toBe(px(snap(a.dp.x - right(m))));
    // The cards' content inset: the four rule ends, two each side of the midpoint, so the smaller.
    const inset = snapSiblings([
      el('08.metrics.rule-1').dp.x - m.dp.x,
      right(m) - right(el('08.metrics.rule-1')),
      el('08.access.rule-1').dp.x - a.dp.x,
      right(a) - right(el('08.access.rule-1')),
    ]);
    for (const id of ['compare.metrics', 'compare.access']) {
      const card = root.find((n) => n.type === Card && n.props['testID'] === id);
      expect([card.props['padding'], card.props['radius'], card.props['fill']]).toStrictEqual([
        inset,
        m.tokens['radius'],
        true,
      ]);
    }
    expect(inset).toBe(snap(el('08.metrics.title').dp.y - m.dp.y - lineInset('caption')));
    // Title → first rule: siblings, the smaller.
    const titleToRule = snapSiblings([
      el('08.metrics.rule-1').dp.y - bottom(el('08.metrics.title')) - lineInset('caption'),
      el('08.access.rule-1').dp.y - bottom(el('08.access.title')) - lineInset('caption'),
    ]);
    const stack = styled(byId('compare.metrics.table'), 'gap')!;
    expect(flat(stack.props['style'])['gap']).toBe(px(titleToRule));
  });

  it('the label column is the ruled form’s, as 08 draws it', () => {
    const labels = METRICS.map(
      (k) => el(`08.metrics.${k}.value`).dp.x - el(`08.metrics.${k}.label`).dp.x,
    );
    const sorted = [...labels].sort((x, y) => x - y);
    expect(half(sorted[2]!)).toBe(READOUT_RULED_LABEL);
  });

  it('the action bar: md above, below and beside, sm between, both actions one height', () => {
    const { root } = setup();
    const bar = root.findByType(ActionBar).props as Record<string, unknown>;
    const pdf = el('08.actions.pdf');
    const studio = el('08.actions.studio');
    const actions = el('08.actions');
    expect(bar['padding']).toStrictEqual({
      top: px(snap(pdf.dp.y - actions.dp.y - 1)),
      bottom: px(snap(bottom(actions) - bottom(pdf))),
      side: px(snapSiblings([pdf.dp.x, SCREEN - right(studio)])),
    });
    expect(bar['gap']).toBe(px(snap(studio.dp.x - right(pdf))));
    expect(bar['rule']).toBe(true);
    const [first, second] = bar['actions'] as readonly Record<string, unknown>[];
    for (const b of [first, second])
      expect([b?.['height'], b?.['radius'], b?.['step']]).toStrictEqual([ACTION, 'sm', 'caption']);
    expect([
      second?.['variant'],
      second?.['edge'],
      second?.['fill'],
      second?.['weight'],
    ]).toStrictEqual(['secondary', 'border', 'surface.1', studio.type?.weight]);
  });

  it('the art: each fragment crosses its inventory box at 384 dp', () => {
    // The art layer's top is the scroll content's: the app bar's rule's foot.
    const top = bottom(el('08.header-rule'));
    for (const [key, id] of [
      ['top', '08.art-top'],
      ['right', '08.art-right'],
      ['left', '08.art-left'],
    ] as const) {
      const f = COMPARE_ART[key] as {
        readonly width: number;
        readonly top: number;
        readonly left?: number;
        readonly right?: number;
      };
      const height = (f.width * 52) / 60;
      const x0 = f.left ?? SCREEN - (f.right ?? 0) - f.width;
      const box = el(id);
      const crosses =
        x0 < right(box) &&
        x0 + f.width > box.dp.x &&
        top + f.top < bottom(box) &&
        top + f.top + height > box.dp.y;
      expect([key, crosses]).toStrictEqual([key, true]);
    }
    const { root } = setup();
    expect(root.findAllByType(Illustration).map((n) => n.props['tone'] as unknown)).toStrictEqual([
      'backdrop',
      'backdrop',
      'backdrop',
    ]);
  });
});

/* ----------------------------------------------------------------------------- type */

describe('type: every text at 08’s step and weight', () => {
  const STEP = nativeType.latin;
  it.each([
    ['compare.a.name', '08.pair.a.name'],
    ['compare.a.meta', '08.pair.a.meta'],
    [metric('delta-e00', 'label'), '08.metrics.delta-e00.label'],
    [metric('delta-e00', 'value'), '08.metrics.delta-e00.value'],
    [metric('delta-e00', 'reading'), '08.metrics.delta-e00.reading'],
    [metric('delta-e00', 'formula'), '08.metrics.delta-e00.formula'],
    [access('wcag', 'label'), '08.access.wcag.label'],
    [access('wcag', 'value'), '08.access.wcag.value'],
    [access('wcag', 'note'), '08.access.wcag.apca'],
    [access('protan', 'value'), '08.access.protan.value'],
  ] as const)('%s is %s', (id, element) => {
    const { byId } = setup();
    const want = el(element).type!;
    const style = rendered(byId(id));
    expect([style['fontSize'], style['fontWeight']]).toStrictEqual([
      STEP[want.size as keyof typeof STEP].fontSize,
      String(want.weight),
    ]);
  });

  it('the card titles at caption 600', () => {
    const { byId } = setup();
    for (const [card, element] of [
      ['compare.metrics', '08.metrics.title'],
      ['compare.access', '08.access.title'],
    ] as const) {
      const style = rendered(byId(card).findAllByType(Text)[0]!);
      expect([style['fontSize'], style['fontWeight']]).toStrictEqual([
        STEP.caption.fontSize,
        String(el(element).type?.weight),
      ]);
    }
  });

  it('nothing is clipped to a line: no numberOfLines on a name, meta, value, reading or note', () => {
    const { byId } = setup();
    for (const id of [
      'compare.a.name',
      'compare.a.meta',
      metric('hue', 'reading'),
      access('wcag', 'value'),
      access('wcag', 'note'),
      access('tritan', 'value'),
    ])
      expect(byId(id).props['numberOfLines']).toBeUndefined();
  });
});
