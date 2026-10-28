/**
 * The Finder is mockup 09 in order, grouping and proportion (F-250, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 09's elements is DRAWN. This asks the rest
 * of the first criterion, on the same rendered page:
 *
 * - **Order**: the bar, the query card (the field, its clear, the three chips), the sliders' title and
 *   card (each row label → track → value), the results heading and the cards, each card's lines, in
 *   09's reading order.
 * - **Grouping**: the field, its clear and the chips are inside the query card; each slider's three
 *   parts share one row inside the sliders card; two cards share a row; no control sits inside a
 *   card's words, and each card is one stop named with its words and its provenance.
 * - **Proportion**: every size, corner, step and interval the page passes is recomputed here from
 *   `mockups/inventory/09.json` through R9 §2's snap, each text's own line inset subtracted, not
 *   restated; the three intervals the drawing sets tighter than the scale are named (ADR-0161 D1);
 *   and every text is drawn at the step, weight and ink 09 records.
 *
 * What a tree cannot show — that it looks like 09 — is the person's capture (criterion 4).
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { FlatList, Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { wcagContrast } from '@irodora/color-difference';
import {
  nativeArtOpacity,
  nativeColors,
  nativeIconStroke,
  nativeSpacing,
  nativeType,
} from '@irodora/design-tokens';
import {
  AppBar,
  Button,
  Card,
  ChoiceGroup,
  Illustration,
  illustrationBox,
  platformTapTarget,
  SearchField,
  Slider,
  Stack,
  Swatch,
  Text,
  ThemeProvider,
} from '@irodora/ui';
import {
  BACK_GLYPH_09,
  CLEAR_GLYPH,
  FINDER_APP_BAR,
  FINDER_ART,
  MODE_CHIP,
  QUERY_CLEAR_GLYPH,
  RESULT_HEIGHT,
} from '../src/finder-readout';
import { t as message, type MessageKey } from '../src/i18n';
import { Finder } from '../src/screens/Finder';

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
const NINE = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '09.json'), 'utf8'),
) as Inventory;
/** 09 is full-bleed: 768 px for 384 dp. */
const DP = NINE.frame.screens[0]?.dpPerPx ?? NaN;
/** An element, its dp recomputed from its measured pixels (F-248's lesson: rounded dp mislead a snap). */
const el = (id: string): Element => {
  const e = NINE.elements.find((x) => x.id === id);
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
/** Tighter than the scale can draw — negative, or under half `xs` — so the floor, `xs`, named (§2). */
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

/** The fixture phrase: 09 as drawn, its chip chosen, its region ranked from its medoid. */
const PHRASE = 'muted green';
const ignore = (): void => undefined;
type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

const setup = (tag = DEFAULT_LANGUAGE_TAG, theme: 'dark' | 'light' = 'dark') => {
  mockLanguageTag = tag;
  try {
    const tree = render(
      <ThemeProvider theme={theme}>
        <Finder initialQuery={PHRASE} onBack={ignore} onOpenColour={ignore} />
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
const AXES = ['lightness', 'chroma', 'hue'] as const;
const card = (i: number, part?: string): string =>
  `finder.result.${String(i)}${part === undefined ? '' : `.${part}`}`;
/** The Card a testID names (the component, whose props are what the page passes). */
const cardOf = (root: Instance, id: string): Instance =>
  root.find((n) => n.type === Card && n.props['testID'] === id);
/** The box inside a card that pads its content past the card's own step (the screen names it). */
const innerOf = (body: Instance): Readonly<Record<string, unknown>> => flat(body.props['style']);

/* ----------------------------------------------------------------------------- order */

describe('order: 09 top to bottom', () => {
  it('the page: the query card, the sliders’ title and card, the results heading, the cards', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const sequence = [
      byId('finder.search'),
      byId('finder.dimensions'),
      byId('finder.sliders'),
      byId('finder.nearest'),
      byId(card(0)),
      byId(card(1)),
      byId(card(2)),
      byId(card(3)),
    ].map(at);
    expect(sequence.every((n) => n >= 0)).toBe(true);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the bar: back, then the title, then Clear', () => {
    const { root } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const bar = root.findByType(AppBar);
    const words = bar
      .findAll((n) => n.type === Text)
      .map((n) => [n, String(n.props['children'])] as const);
    const of = (text: string): Instance => words.find(([, w]) => w.startsWith(text))![0];
    const sequence = [of(say('tab.atlas')), of(say('finder.title')), of(say('finder.clear'))].map(
      at,
    );
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the query card: the field, its clear, then the chips in 09’s order', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const radios = byId('finder.search').findAll(
      (n) => typeof n.type === 'string' && n.props['role'] === 'radio',
    );
    expect(radios.map((r) => r.props['accessibilityLabel'] as unknown)).toStrictEqual([
      say('finder.mode.phrase'),
      say('finder.mode.name'),
      say('finder.mode.hex'),
    ]);
    const sequence = [byId('finder.search.query'), byId('finder.search.clear'), ...radios].map(at);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('the sliders: lightness, chroma, hue; each label → track → value', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    const sequence = AXES.flatMap((a) => [
      byId(`finder.sliders.${a}.label`),
      byId(`finder.sliders.${a}.track`),
      byId(`finder.sliders.${a}.value`),
    ]).map(at);
    expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
  });

  it('each card: name → English → distance, and the nearest its OKLCh line last', () => {
    const { root, byId } = setup();
    const at = (n: Instance) => inOrder(root).indexOf(n);
    for (let i = 0; i < 4; i += 1) {
      const sequence = [
        byId(card(i, 'name')),
        byId(card(i, 'english')),
        byId(card(i, 'distance')),
        ...(i === 0 ? [byId(card(0, 'oklch'))] : []),
      ].map(at);
      expect([...sequence].sort((a, b) => a - b)).toStrictEqual(sequence);
    }
    // 09 draws the OKLCh line on the nearest card only.
    expect(root.findAll((n) => n.props['testID'] === card(1, 'oklch'))).toHaveLength(0);
  });

  it('the art is the header’s first child, behind everything, touching nothing', () => {
    const { root, byId } = setup();
    const art = byId('finder.art');
    const all = inOrder(root);
    const firstText = all.find((n) => n.type === Text && !isAncestor(root.findByType(AppBar), n))!;
    expect(all.indexOf(art)).toBeLessThan(all.indexOf(firstText));
    expect(art.props['pointerEvents']).toBe('none');
  });
});

/* ----------------------------------------------------------------------------- grouping */

describe('grouping: what 09 draws together is together', () => {
  it('the field, its clear and the chips are inside the query card', () => {
    const { byId } = setup();
    const search = byId('finder.search');
    for (const id of ['finder.search.query', 'finder.search.clear', 'finder.modes'])
      expect({ [id]: isAncestor(search, byId(id)) }).toStrictEqual({ [id]: true });
  });

  it('each slider’s label, track and value share one row, inside the sliders card', () => {
    const { byId } = setup();
    for (const a of AXES) {
      const label = byId(`finder.sliders.${a}.label`);
      const row = sharedRow(label, byId(`finder.sliders.${a}.value`));
      expect(row).not.toBeNull();
      expect(isAncestor(row!, byId(`finder.sliders.${a}.track`))).toBe(true);
      expect(isAncestor(byId('finder.sliders'), row!)).toBe(true);
    }
    // DECOY — two sliders do not share one row: each is its own.
    expect(
      sharedRow(byId('finder.sliders.lightness.label'), byId('finder.sliders.chroma.label')),
    ).toBeNull();
  });

  it('two cards share a row, and the third starts the next', () => {
    const { byId } = setup();
    expect(sharedRow(byId(card(0)), byId(card(1)))).not.toBeNull();
    expect(sharedRow(byId(card(2)), byId(card(3)))).not.toBeNull();
    expect(sharedRow(byId(card(1)), byId(card(2)))).toBeNull();
  });

  it('each card is one stop: its words hidden beneath its own name, no control inside them', () => {
    const { root, byId } = setup();
    for (let i = 0; i < 4; i += 1) {
      const sample = root.find((n) => n.type === Swatch && n.props['testID'] === card(i, 'open'));
      expect(sample.findAll((n) => n.type === Button)).toHaveLength(0);
      const words = styled(byId(card(i, 'name')), 'paddingVertical')!;
      expect(words.props['pointerEvents']).toBe('none');
      expect(words.props['importantForAccessibility']).toBe('no-hide-descendants');
      // Its name holds its words, its distance from the search point and its provenance.
      const host = root.findAll(
        (n) => typeof n.type === 'string' && n.props['testID'] === card(i, 'open'),
      )[0]!;
      const name = String(host.props['accessibilityLabel']);
      const english = String(byId(card(i, 'english')).props['children']).slice(1, -1);
      expect(name).toContain(String(byId(card(i, 'name')).props['children']));
      expect(name).toContain(english);
      expect(name).toContain(say('finder.fromPoint'));
      expect(name.length).toBeGreaterThan(String(sample.props['name']).length);
    }
  });
});

/* ----------------------------------------------------------------------------- proportion */

describe('proportion: every size and interval recomputed from 09.json', () => {
  it('the app bar: 09’s height and inset, no rule; the title centred at its step and weight', () => {
    const { root } = setup();
    const bar = root.findByType(AppBar).props as Record<string, unknown>;
    expect(bar['height']).toBe(half(bottom(el('09.header'))));
    expect(FINDER_APP_BAR).toBe(bar['height']);
    expect(bar['rule']).toBeUndefined();
    expect(bar['inset']).toBe(
      px(snapSiblings([el('09.back').dp.x, SCREEN - right(el('09.clear'))])),
    );
    const title = bar['title'] as Record<string, unknown>;
    expect([title['align'], title['size'], title['weight']]).toStrictEqual([
      'centre',
      el('09.title').type?.size,
      el('09.title').type?.weight,
    ]);
    expect((bar['back'] as { size: number }).size).toBe(BACK_GLYPH_09);
    const clear = (bar['trailing'] as { button: Record<string, unknown> }).button;
    expect([clear['glyph'], clear['glyphSize'], clear['step']]).toStrictEqual([
      'close',
      CLEAR_GLYPH,
      el('09.clear').type?.size,
    ]);
  });

  it('the glyphs by 06’s rule, from each glyph’s own ink in 09.json', () => {
    // A solid draws no line, so its size is its ink over the drawing's extent: the disc, 20 units.
    expect(QUERY_CLEAR_GLYPH).toBe(half((el('09.search.clear').dp.w * 24) / 20));
    // A line glyph: (ink − the line's fixed width) × 24 ÷ the path's extent — the back arrow's path
    // spans 15.5 × 12 units (its two readings averaged), Clear's × 11 × 11.
    const ink = (id: string): readonly [number, number] => {
      const raw = (NINE.elements.find((e) => e.id === id) as { raw?: Record<string, number> }).raw;
      return [(raw?.['glyphWPx'] ?? NaN) * DP, (raw?.['glyphHPx'] ?? NaN) * DP];
    };
    const [bw, bh] = ink('09.back');
    expect(BACK_GLYPH_09).toBe(
      half((((bw - nativeIconStroke) * 24) / 15.5 + ((bh - nativeIconStroke) * 24) / 12) / 2),
    );
    const [cw] = ink('09.clear');
    expect(CLEAR_GLYPH).toBe(half(((cw - nativeIconStroke) * 24) / 11));
  });

  it.each([['ios'], ['android']] as const)(
    'the field’s and its clear’s targets lie inside the body that holds them, on %s (review, S2)',
    (os) => {
      const replaced = jest.replaceProperty(Platform, 'OS', os);
      try {
        const target = platformTapTarget(os);
        const { root, byId } = setup();
        const body = flat(byId('finder.search.body').props['style']);
        const field = root.findByType(SearchField).props as Record<string, unknown>;
        const line = nativeType.latin.body.lineHeight;
        const spare = target - line;
        const above = Math.min(spare / 2, Number(field['touchAbove']));
        // Above the words: no more than the body's own top padding.
        expect(above).toBeLessThanOrEqual(Number(body['paddingTop']));
        // The clear's target overhangs its glyph by half the difference: inside the body's end.
        const reach = (target - QUERY_CLEAR_GLYPH) / 2;
        expect(reach).toBeLessThanOrEqual(Number(body['paddingRight']));
        // And the body reaches no further than the card's own inset, inside the card.
        const pad = px(cardOf(root, 'finder.search').props['padding'] as SpacingStep);
        expect(-Number(body['marginTop'])).toBeLessThanOrEqual(pad);
        expect(-Number(body['marginRight'])).toBeLessThanOrEqual(pad);
      } finally {
        replaced.restore();
      }
    },
  );

  it('the list: the leaked heading’s space kept above the query card; the page inset', () => {
    const { root } = setup();
    const list = root.findByType(FlatList);
    const content = flat(list.props['contentContainerStyle']);
    expect(content['paddingTop']).toBe(px(snap(el('09.search').dp.y - bottom(el('09.header')))));
    const inset = px(
      snapSiblings([
        el('09.search').dp.x,
        SCREEN - right(el('09.search')),
        el('09.results.result-1').dp.x,
        SCREEN - right(el('09.results.result-2')),
      ]),
    );
    expect(flat(list.props['columnWrapperStyle'])['paddingHorizontal']).toBe(inset);
  });

  it('the query card: its corner and insets; the field’s words → the chips; the chips’ height and gap', () => {
    const { root, byId } = setup();
    const search = el('09.search');
    const query = el('09.search.query');
    const phrase = el('09.search.mode-phrase');
    const c = cardOf(root, 'finder.search');
    expect([c.props['radius'], c.props['level']]).toStrictEqual([search.tokens['radius'], '1']);
    const pad = px(c.props['padding'] as SpacingStep);
    const inner = innerOf(byId('finder.search.body'));
    // Top: the card to the words' line; sides: to the words and the clear; foot: under the chips.
    // The body reaches into the card's inset with negative margins it gives back as padding (S2), so
    // each side is the card's padding, the body's margin and its padding together.
    const side = (key: 'Top' | 'Left' | 'Right' | 'Bottom'): number =>
      pad + Number(inner[`padding${key}`] ?? 0) + Number(inner[`margin${key}`] ?? 0);
    expect(side('Top')).toBe(px(snap(query.dp.y - search.dp.y - lineInset('body'))));
    const sides = px(
      snapSiblings([query.dp.x - search.dp.x, right(search) - right(el('09.search.clear'))]),
    );
    expect([side('Left'), side('Right')]).toStrictEqual([sides, sides]);
    // The card's foot (review, S1): to its edge at row 342 — 17 dp, md.
    expect(side('Bottom')).toBe(px(snap(bottom(search) - bottom(phrase))));
    expect(snap(bottom(search) - bottom(phrase))).toBe('md');
    const chips = styled(byId('finder.modes'), 'marginTop')!;
    expect(flat(chips.props['style'])['marginTop']).toBe(
      px(snap(phrase.dp.y - bottom(query) - lineInset('body'))),
    );
    const pills = root.findByType(ChoiceGroup).props['pills'] as Record<string, unknown>;
    expect(pills['height']).toBe(half(phrase.dp.h));
    expect(MODE_CHIP).toBe(pills['height']);
    expect(pills['gap']).toBe(snap(el('09.search.mode-kanji').dp.x - right(phrase)));
    expect([pills['radius'], pills['restFill']]).toStrictEqual([
      phrase.tokens['radius'],
      'surface.3',
    ]);
    expect(phrase.tokens['bg']).toBe('level3');
    // The field is bare (09 draws it neither filled nor outlined) and holds its clear.
    const field = root.findByType(SearchField).props as Record<string, unknown>;
    expect([field['bare'], (field['clear'] as { size: number }).size]).toStrictEqual([
      true,
      QUERY_CLEAR_GLYPH,
    ]);
  });

  it('the sliders: the title → the card (named), the card’s insets, the rows’ gap, each row’s gaps', () => {
    const { root, byId } = setup();
    const sliders = el('09.sliders');
    const title = el('09.sliders.title');
    expect(flat(styled(byId('finder.dimensions'), 'marginTop')!.props['style'])['marginTop']).toBe(
      px(snap(title.dp.y - bottom(el('09.search')) - lineInset('body'))),
    );
    // Tighter than the scale: 09 sets the card 0.2 dp inside the title's own line (ADR-0161 D1).
    expect(
      flat(styled(cardOf(root, 'finder.sliders'), 'marginTop')!.props['style'])['marginTop'],
    ).toBe(px(belowTheScale(sliders.dp.y - bottom(title) - lineInset('body'))));
    const c = cardOf(root, 'finder.sliders');
    expect(c.props['radius']).toBe(sliders.tokens['radius']);
    const pad = px(c.props['padding'] as SpacingStep);
    const inner = innerOf(byId('finder.sliders.body'));
    const first = el('09.sliders.lightness.label');
    const last = el('09.sliders.hue.label');
    expect(pad + Number(inner['paddingTop'] ?? 0)).toBe(
      px(snap(first.dp.y - sliders.dp.y - lineInset('label'))),
    );
    expect(pad + Number(inner['paddingBottom'] ?? 0)).toBe(
      px(snap(bottom(sliders) - bottom(last) - lineInset('label'))),
    );
    expect(pad).toBe(
      px(
        snapSiblings([
          first.dp.x - sliders.dp.x,
          right(sliders) - right(el('09.sliders.lightness.value')),
        ]),
      ),
    );
    expect(c.findByType(Stack).props['gap']).toBe(
      snapSiblings([
        el('09.sliders.chroma.label').dp.y - bottom(first) - 2 * lineInset('label'),
        last.dp.y - bottom(el('09.sliders.chroma.label')) - 2 * lineInset('label'),
      ]),
    );
    // Label → track → value: the row's gap.
    const row = sharedRow(
      byId('finder.sliders.lightness.label'),
      byId('finder.sliders.lightness.value'),
    )!;
    expect(flat(row.props['style'])['gap']).toBe(
      px(
        snapSiblings([
          el('09.sliders.lightness.track').dp.x - right(first),
          el('09.sliders.lightness.value').dp.x - right(el('09.sliders.lightness.track')),
        ]),
      ),
    );
    for (const s of root.findAllByType(Slider))
      expect([s.props['layout'], s.props['valueColor']]).toStrictEqual(['row', 'foreground.2']);
  });

  it('the results: the sliders → the heading → the cards; the grid’s gaps; each card’s width and least height', () => {
    const { root, byId } = setup();
    const heading = el('09.results.heading');
    const one = el('09.results.result-1');
    const two = el('09.results.result-2');
    const three = el('09.results.result-3');
    const box = styled(byId('finder.nearest'), 'marginTop')!;
    expect(flat(box.props['style'])['marginTop']).toBe(
      px(snap(heading.dp.y - bottom(el('09.sliders')) - lineInset('body'))),
    );
    expect(flat(box.props['style'])['marginBottom']).toBe(
      px(snap(one.dp.y - bottom(heading) - lineInset('body'))),
    );
    // The column gap is each cell's inner padding, twice; the row gap the separator.
    const cell = styled(byId(card(0)), 'maxWidth')!;
    const cellStyle = flat(cell.props['style']);
    const column = 2 * Number(cellStyle['paddingRight']);
    expect(column).toBe(px(snap(two.dp.x - right(one))));
    const list = root.findByType(FlatList);
    const Separator = list.props['ItemSeparatorComponent'] as () => React.JSX.Element;
    expect(flat((Separator().props as { style?: unknown }).style)['height']).toBe(
      px(snap(three.dp.y - bottom(one))),
    );
    // A card's width, from what the tree lays out: half the row less the insets and the gap — 09's 172.
    // No layout engine runs here, so the width is read from the styles the row is built of, which hold
    // no width of their own: the same styles give 140 at 320 dp and 160 at 360.
    const inset = Number(flat(list.props['columnWrapperStyle'])['paddingHorizontal']);
    const widthAt = (screenWidth: number): number => (screenWidth - 2 * inset - column) / 2;
    expect(widthAt(SCREEN)).toBe(one.dp.w);
    expect([widthAt(320), widthAt(360)]).toStrictEqual([140, 160]);
    expect(cellStyle['maxWidth']).toBe('50%');
    expect(cellStyle['width']).toBeUndefined();
    // Its least height: 09's 108 and 110.5, two each — the tie takes the smaller (ADR-0161 D2).
    const heights = [one, two, three, el('09.results.result-4')].map((e) => e.dp.h);
    expect(RESULT_HEIGHT).toBe(Math.min(...heights));
    expect(flat(byId(card(0)).props['style'])['minHeight']).toBe(RESULT_HEIGHT);
    // The card is the sample: its corner, no keyline.
    const sample = root.find((n) => n.type === Swatch && n.props['testID'] === card(0, 'open'));
    expect([sample.props['corner'], sample.props['keyline']]).toStrictEqual([
      one.tokens['radius'],
      false,
    ]);
  });

  it('each card’s words: their insets, and the three gaps 09 draws tighter than the scale (named)', () => {
    const { byId } = setup();
    const one = el('09.results.result-1');
    const name = el('09.results.result-1.name');
    const english = el('09.results.result-1.english');
    const distance = el('09.results.result-1.distance');
    const oklch = el('09.results.result-1.oklch');
    const words = flat(styled(byId(card(0, 'name')), 'paddingVertical')!.props['style']);
    expect(words['paddingVertical']).toBe(px(snap(name.dp.y - one.dp.y - lineInset('body'))));
    expect(words['paddingHorizontal']).toBe(
      px(
        snapSiblings([
          name.dp.x - one.dp.x,
          el('09.results.result-2.name').dp.x - el('09.results.result-2').dp.x,
        ]),
      ),
    );
    // Name → English and distance → OKLCh are tighter than the scale; English → distance is xs.
    belowTheScale(english.dp.y - bottom(name) - 2 * lineInset('body'));
    belowTheScale(oklch.dp.y - bottom(distance) - 2 * lineInset('label'));
    expect(snap(distance.dp.y - bottom(english) - lineInset('body') - lineInset('label'))).toBe(
      'xs',
    );
    expect(words['gap']).toBe(px('xs'));
  });

  it('the art: the leaves cross their inventory box at 384 dp, behind the opaque cards', () => {
    // The art layer's top is the list's content top: the bar's foot.
    const top = half(bottom(el('09.header')));
    const [gridW, gridH] = illustrationBox('leaves');
    const height = (FINDER_ART.width * gridH) / gridW;
    const x0 = SCREEN - FINDER_ART.right - FINDER_ART.width;
    const box = el('09.art');
    expect(
      x0 < right(box) &&
        x0 + FINDER_ART.width > box.dp.x &&
        top + FINDER_ART.top < bottom(box) &&
        top + FINDER_ART.top + height > box.dp.y,
    ).toBe(true);
    // At the strokes' height, from where they start.
    expect(top + FINDER_ART.top).toBe(box.dp.y);
    expect(height).toBe(box.dp.h);
    const { root, byId } = setup();
    expect(root.findAllByType(Illustration).map((n) => n.props['tone'] as unknown)).toStrictEqual([
      'backdrop',
    ]);
    expect(flat(byId('finder.art').props['style'])['overflow']).toBe('hidden');
  });
});

describe('the art against the words (F-247’s lesson; ADR-0161 D6)', () => {
  it('every text but the two headings sits in an opaque box: a card, the bar, or a result card', () => {
    const { root, byId } = setup();
    const bar = root.findByType(AppBar);
    const boxes = [
      byId('finder.search'),
      byId('finder.sliders'),
      bar,
      // Every result card: each is the sample itself, opaque.
      ...root.findAll((n) => /^finder\.result\.\d+$/u.test(String(n.props['testID'] ?? ''))),
    ];
    const headings = [byId('finder.dimensions'), byId('finder.nearest')];
    const loose = root
      .findAll((n) => n.type === Text)
      .filter((n) => !boxes.some((b) => b === n || isAncestor(b, n)))
      .filter((n) => !headings.some((h) => h === n || isAncestor(h, n) || isAncestor(n, h)));
    expect(loose.map((n) => String(n.props['children']))).toStrictEqual([]);
  });

  it('the two headings clear 4.5:1 over a stroke of the leaves, in every palette', () => {
    const rgb = (hex: string): readonly [number, number, number] => {
      const n = Number.parseInt(hex.replace('#', ''), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    };
    for (const [palette, colors] of Object.entries(nativeColors)) {
      const ground = rgb(colors.background);
      const ink = rgb(colors.foreground);
      // A stroke: the foreground over the ground at the backdrop's opacity.
      const stroke = ground.map((g, i) => g + ((ink[i] ?? 0) - g) * nativeArtOpacity) as [
        number,
        number,
        number,
      ];
      expect({ [palette]: wcagContrast(ink, stroke) >= 4.5 }).toStrictEqual({ [palette]: true });
    }
  });
});

/* ----------------------------------------------------------------------------- type */

describe('type: every text at 09’s step and weight', () => {
  const STEP = nativeType.latin;
  it.each([
    ['finder.dimensions', '09.sliders.title'],
    ['finder.nearest', '09.results.heading'],
    ['finder.sliders.lightness.label', '09.sliders.lightness.label'],
    ['finder.sliders.chroma.value', '09.sliders.chroma.value'],
    [card(0, 'name'), '09.results.result-1.name'],
    [card(0, 'english'), '09.results.result-1.english'],
    [card(0, 'distance'), '09.results.result-1.distance'],
    [card(0, 'oklch'), '09.results.result-1.oklch'],
  ] as const)('%s is %s', (id, element) => {
    const { byId } = setup();
    const want = el(element).type!;
    const style = rendered(byId(id));
    expect([style['fontSize'], style['fontWeight']]).toStrictEqual([
      STEP[want.size as keyof typeof STEP].fontSize,
      String(want.weight),
    ]);
  });

  it('the bar’s words and the field’s at body; the chips’ at label', () => {
    const { root, byId } = setup();
    const bar = root.findByType(AppBar);
    for (const word of [say('tab.atlas'), say('finder.clear')]) {
      const node = bar.findAll((n) => n.type === Text && n.props['children'] === word)[0]!;
      expect({ [word]: rendered(node)['fontSize'] }).toStrictEqual({
        [word]: STEP[el('09.back').type!.size as Step].fontSize,
      });
    }
    const input = byId('finder.search').findAll(
      (n) => typeof n.type === 'string' && n.props['testID'] === 'finder.search.query',
    )[0]!;
    expect(flat(input.props['style'])['fontSize']).toBe(
      STEP[el('09.search.query').type!.size as Step].fontSize,
    );
    const radio = byId('finder.search').findAll(
      (n) => n.type === Text && n.props['children'] === say('finder.mode.hex'),
    )[0]!;
    expect(rendered(radio)['fontSize']).toBe(
      STEP[el('09.search.mode-hex').type!.size as Step].fontSize,
    );
  });

  it('nothing is clipped to a line: no numberOfLines on a name, an English line, a distance or a reading', () => {
    const { byId } = setup();
    for (const id of [
      card(0, 'name'),
      card(0, 'english'),
      card(0, 'distance'),
      card(0, 'oklch'),
      'finder.sliders.chroma.value',
      'finder.dimensions',
      'finder.nearest',
    ])
      expect({ [id]: byId(id).props['numberOfLines'] as unknown }).toStrictEqual({
        [id]: undefined,
      });
  });
});

/* ----------------------------------------------------------------------------- ink */

describe('ink: every text in the ink 09 records, in both themes', () => {
  const TOKEN: Readonly<Record<string, string>> = {
    'text.primary': 'foreground',
    'text.secondary': 'foreground.2',
  };
  it.each(['dark', 'light'] as const)('in %s', (theme) => {
    const { byId } = setup(DEFAULT_LANGUAGE_TAG, theme);
    for (const [id, element] of [
      ['finder.dimensions', '09.sliders.title'],
      ['finder.nearest', '09.results.heading'],
      ['finder.sliders.lightness.label', '09.sliders.lightness.label'],
      ['finder.sliders.lightness.value', '09.sliders.lightness.value'],
    ] as const) {
      const fg = el(element).tokens['fg'];
      expect({ [id]: byId(id).props['color'] as unknown }).toStrictEqual({ [id]: TOKEN[fg ?? ''] });
    }
    // On a card every line takes the one ink its colour takes (C8, ADR-0116): a sample, not a token.
    for (const part of ['name', 'english', 'distance', 'oklch']) {
      const node = byId(card(0, part));
      expect({
        [part]: [node.props['color'], (node.props['on'] as { hex?: string } | undefined)?.hex],
      }).toStrictEqual({
        [part]: [undefined, byId(card(0, 'open')).props['hex']],
      });
    }
  });
});

/* ----------------------------------------------------------------------------- Japanese */

describe('the Japanese steps: each text at its step, set in the Japanese face’s own line', () => {
  it('in ja-JP, the headings, the slider labels and readings take the Japanese line', () => {
    const { byId } = setup('ja-JP');
    const JA = nativeType.japanese;
    for (const [id, step] of [
      ['finder.dimensions', 'body'],
      ['finder.nearest', 'body'],
      ['finder.sliders.lightness.label', 'label'],
      ['finder.sliders.chroma.value', 'label'],
    ] as const) {
      const style = rendered(byId(id));
      expect({ [id]: [style['fontSize'], style['lineHeight']] }).toStrictEqual({
        [id]: [JA[step].fontSize, JA[step].lineHeight],
      });
    }
    // DECOY: the Japanese line is not the Latin one, so the assertion could fail.
    expect(JA.label.lineHeight).not.toBe(nativeType.latin.label.lineHeight);
  });
});
