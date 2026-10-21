/**
 * The Atlas is mockup 05 in order, grouping and proportion (F-246, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 05's 63 elements is DRAWN. This asks
 * the rest of the first criterion, on the same rendered screen:
 *
 * - **Order**: the bar, the filters and the cards come in 05's reading order, and each card's lines
 *   in the order 05 sets them.
 * - **Grouping**: what 05 draws side by side shares a row, and what it draws inside something is
 *   inside it on the tree — each card's sample and words, each chip's dot.
 * - **Proportion**: every size, corner, step and interval the screen passes is recomputed here from
 *   `mockups/inventory/05.json` through R9 §2's snap, not restated; and every text is drawn at the
 *   step, weight and ink 05 records.
 *
 * What a tree cannot show — that it looks like 05 — is the person's capture (criterion 4). 05's tab
 * bar is 01's under C1, held by `packages/ui/test/tab-bar.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { nativeRadius, nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  Bilingual,
  Button,
  Card,
  Chip,
  ChoiceGroup,
  IconButton,
  Row,
  Screen,
  SearchField,
  SelectionDot,
  Stack,
  Swatch,
  Text,
  ThemeProvider,
} from '@irodora/ui';
import {
  APP_BAR,
  ATLAS_MEDIA_INSET,
  ATLAS_SAMPLE,
  atlasOklch,
  atlasShown,
  capitalisedRomaji,
  COUNT_PILL,
  FAMILY_CHIP,
  familyGroups,
  MORE_GLYPH,
  NAV_PILL,
  NO_FILTERS,
  SEARCH_FIELD,
  SEARCH_GLYPH,
  SEASON_PILL,
  seasonLine,
} from '../src/atlas';
import { allEntries } from '../src/corpus';
import { en } from '../src/i18n/en';
import { japaneseRun, t as message, type MessageKey } from '../src/i18n';
import { Atlas } from '../src/screens/Atlas';

interface Element {
  readonly id: string;
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly type: { readonly face: string; readonly size: string; readonly weight: number } | null;
  readonly tokens: Readonly<Record<string, string>>;
  readonly raw?: Readonly<Record<string, number>>;
}
const FIVE = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '05.json'), 'utf8'),
) as { readonly elements: readonly Element[] };
const el = (id: string): Element => {
  const e = FIVE.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`05 records no ${id}`);
  return e;
};
const bottom = (e: Element): number => e.dp.y + e.dp.h;
const right = (e: Element): number => e.dp.x + e.dp.w;

/** R9 §2's snap: the nearest step of the scale, the smaller on a tie. */
const STEPS = Object.entries(nativeSpacing) as readonly (readonly [string, number])[];
const snap = (dp: number): string => {
  const ranked = [...STEPS].sort(
    (a, b) => Math.abs(a[1] - dp) - Math.abs(b[1] - dp) || a[1] - b[1],
  );
  return ranked[0]?.[0] ?? '';
};
/** Siblings drawn alike take one step: the one most of them snap to, the smaller on a tie (§2). */
const snapSiblings = (dps: readonly number[]): string => {
  const counts = new Map<string, number>();
  for (const d of dps) counts.set(snap(d), (counts.get(snap(d)) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const tied = [...counts.entries()].filter(([, n]) => n === best).map(([s]) => s);
  const size = (step: string): number => STEPS.find(([name]) => name === step)?.[1] ?? NaN;
  return tied.sort((a, b) => size(a) - size(b))[0] ?? '';
};
/** Siblings drawn alike take one size: the one most of them are drawn at, the smaller on a tie. */
const mode = (xs: readonly number[]): number => {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const best = Math.max(...counts.values());
  return Math.min(...[...counts.entries()].filter(([, n]) => n === best).map(([x]) => x));
};
/**
 * A text box's line inset, above or below its ink: half the leading its step adds,
 * (lineHeight − em) / 2 — the part of a drawn gap that is the text's own (ADR-0128 D2's method).
 * A drawn shape (a field, a pill, a rule, a card) has none.
 */
const inset = (step: 'caption' | 'label' | 'body', script: 'latin' | 'japanese' = 'latin') =>
  (nativeType[script][step].lineHeight - nativeType[script][step].fontSize) / 2;

/* ----------------------------------------------------------------------------- the screen */

/** 05's state: *Autumn* chosen, so every card prints its last line — the sweep's own fixture. */
const CARDS = atlasShown(allEntries(), '', { ...NO_FILTERS, season: 'autumn' }).slice(0, 4);
const card = (n: number) => {
  const c = CARDS[n];
  if (c === undefined) throw new Error(`fewer than ${String(n + 1)} autumn entries`);
  return c;
};

beforeEach(() => {
  // The sheet's mapper ticks after a render; nothing here is about a frame (F-158).
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/** `null` draws 05's own state, nothing chosen; the default is the sweep's, *Autumn* chosen. */
const drawAtlas = (season: 'autumn' | null = 'autumn') =>
  render(
    <ThemeProvider theme="dark">
      <Atlas
        {...(season === null ? {} : { initialSeason: season })}
        bookmarked={new Set()}
        onSelect={() => undefined}
        onOpenFinder={() => undefined}
        onOpenCompare={() => undefined}
        onOpenPalettes={() => undefined}
      />
    </ThemeProvider>,
  );

type Instance = ReturnType<ReturnType<typeof render>['UNSAFE_getByType']>;

/** Every instance in tree (document) order. */
const inOrder = (root: Instance): Instance[] => root.findAll(() => true, { deep: true });
const textOf = (n: Instance): string => {
  const children: unknown = n.props['children'];
  return (Array.isArray(children) ? (children as unknown[]) : [children])
    .filter((c): c is string => typeof c === 'string')
    .join('');
};
const isAncestor = (a: Instance, b: Instance): boolean => {
  for (let at: Instance | null = b.parent; at !== null; at = at.parent) if (at === a) return true;
  return false;
};
const flat = (style: unknown): Readonly<Record<string, unknown>> =>
  ((StyleSheet.flatten(style as StyleProp<ViewStyle>) as unknown) ?? {}) as Readonly<
    Record<string, unknown>
  >;
/** The nearest ancestor both share that lays its children out in a row. */
const sharedRow = (a: Instance, b: Instance): Instance | null => {
  for (let at: Instance | null = a.parent; at !== null; at = at.parent)
    if (flat(at.props['style'])['flexDirection'] === 'row' && isAncestor(at, b)) return at;
  return null;
};
/** The nearest ancestor of a type. */
const nearest = (node: Instance, type: unknown): Instance | null => {
  for (let at: Instance | null = node.parent; at !== null; at = at.parent)
    if (at.type === type) return at;
  return null;
};

/** Each test draws its own tree: the testing library unmounts one after every test. */
const setup = (season: 'autumn' | null = 'autumn') => {
  const tree = drawAtlas(season);
  const texts = tree.UNSAFE_getAllByType(Text);
  const text = (s: string): Instance => {
    const found = texts.find((n) => textOf(n) === s);
    if (found === undefined) throw new Error(`no text ${s}`);
    return found;
  };
  const byId = (id: string): Instance => {
    const found = tree.UNSAFE_root.findAll((n) => n.props['testID'] === id)[0];
    if (found === undefined) throw new Error(`nothing carries ${id}`);
    return found;
  };
  const button = (key: MessageKey): Instance => {
    const found = tree.UNSAFE_getAllByType(Button).find((b) => b.props['label'] === en[key]);
    if (found === undefined) throw new Error(`no ${key} button`);
    return found;
  };
  return { tree, text, byId, button };
};

describe('order: 05’s elements in its reading order', () => {
  const at = (all: readonly Instance[], match: (n: Instance) => boolean, what: string): number => {
    const i = all.findIndex(match);
    if (i < 0) throw new Error(`${what} is not drawn`);
    return i;
  };
  const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

  it('the bar: title, overflow, count, Compare, Finder, Palettes, rule', () => {
    const { tree, byId, button } = setup();
    const all = inOrder(tree.UNSAFE_root);
    const order = [
      at(all, (n) => n.type === Bilingual, 'the title'),
      at(all, (n) => n.type === IconButton && n.props['name'] === 'more', 'the overflow'),
      all.indexOf(byId('atlas.count')),
      all.indexOf(button('atlas.compare')),
      all.indexOf(button('atlas.finder')),
      all.indexOf(button('atlas.palettes')),
      all.indexOf(byId('app-bar.rule')),
    ];
    expect(order).toStrictEqual(sorted(order));
  });

  it('the filters: search, the seasons, the family label and chips, the rule, the heading', () => {
    const { tree, text, byId } = setup();
    const all = inOrder(tree.UNSAFE_root);
    const order = [
      all.indexOf(tree.UNSAFE_getByType(SearchField)),
      ...(
        ['atlas.all', 'season.spring', 'season.summer', 'season.autumn', 'season.winter'] as const
      ).map((key) => all.indexOf(text(en[key]))),
      all.indexOf(text(en['atlas.family'])),
      // ADR-0108's order: 05's six, then the three it draws past the edge.
      ...familyGroups().map((g) => all.indexOf(byId(`atlas.family.${g.group}`))),
      all.indexOf(byId('atlas.filters.rule')),
      all.indexOf(text(en['atlas.heading'])),
    ];
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toStrictEqual(sorted(order));
    expect(
      familyGroups()
        .map((g) => g.group)
        .slice(0, 6),
    ).toStrictEqual(['ao', 'aka', 'midori', 'murasaki', 'cha', 'kuro']);
  });

  it('the cards in the list’s order, and in each: sample, kanji, hex, romaji, OKLCh, season', () => {
    const { tree, byId } = setup();
    const all = inOrder(tree.UNSAFE_root);
    const cards = [0, 1, 2, 3].map((n) => byId(`atlas.card.${String(n)}`));
    expect(cards.map((c) => all.indexOf(c))).toStrictEqual(
      sorted(cards.map((c) => all.indexOf(c))),
    );
    for (const [n, c] of cards.entries()) {
      const inside = inOrder(c);
      const entry = card(n);
      const order = [
        at(inside, (x) => x.type === Swatch, 'the sample'),
        at(inside, (x) => x.type === Text && textOf(x) === entry.entry.name.kanji, 'the kanji'),
        at(inside, (x) => x.type === Text && textOf(x) === entry.derived.hex, 'the hex'),
        at(
          inside,
          (x) => x.type === Text && textOf(x) === capitalisedRomaji(entry.entry.name.romaji),
          'the romaji',
        ),
        at(
          inside,
          (x) =>
            x.type === Text && textOf(x) === atlasOklch(entry.derived.oklch, en['coord.oklch']),
          'the OKLCh line',
        ),
        at(inside, (x) => x.type === Text && textOf(x) === en['season.autumn'], 'the season'),
      ];
      expect({ [n]: order }).toStrictEqual({ [n]: sorted(order) });
    }
  });
});

describe('grouping: what 05 draws together is together on the tree', () => {
  it('draws side by side what 05 draws side by side', () => {
    const { tree, text, byId, button } = setup();
    const title = tree.UNSAFE_getByType(Bilingual);
    const more = tree.UNSAFE_getAllByType(IconButton).find((n) => n.props['name'] === 'more')!;
    expect(sharedRow(title, more)).not.toBeNull();
    expect(sharedRow(byId('atlas.count'), button('atlas.compare'))).not.toBeNull();
    expect(sharedRow(button('atlas.compare'), button('atlas.palettes'))).not.toBeNull();
    expect(sharedRow(text(en['season.spring']), text(en['season.winter']))).not.toBeNull();
    const c = card(0);
    const first = byId('atlas.card.0');
    const kanjiHex = sharedRow(text(c.entry.name.kanji), text(c.derived.hex));
    expect(kanjiHex !== null && isAncestor(first, kanjiHex)).toBe(true);
    expect(sharedRow(first, byId('atlas.card.1'))).not.toBeNull();
    // DECOY: 05 draws a card's romaji under its kanji: the only row they share is the grid's.
    const kanjiRomaji = sharedRow(
      text(c.entry.name.kanji),
      text(capitalisedRomaji(c.entry.name.romaji)),
    );
    expect(kanjiRomaji === null || !isAncestor(first, kanjiRomaji)).toBe(true);
  });

  it('runs the family chips in a row that scrolls, padded md at both ends and xs apart', () => {
    const { byId } = setup();
    const chips = familyGroups().map((g) => byId(`atlas.family.${g.group}`));
    const scroller = nearest(chips[0]!, ScrollView);
    expect(scroller?.props['horizontal']).toBe(true);
    for (const chip of chips) expect(isAncestor(scroller!, chip)).toBe(true);
    const first = el('05.filters.family.ao');
    const gaps = ['ao', 'aka', 'midori', 'murasaki', 'cha', 'kuro'].slice(1).map((g, i) => {
      const prev = el(`05.filters.family.${['ao', 'aka', 'midori', 'murasaki', 'cha'][i]!}`);
      return el(`05.filters.family.${g}`).dp.x - right(prev);
    });
    expect(scroller?.props['contentContainerStyle']).toStrictEqual({
      paddingHorizontal: nativeSpacing[snap(first.dp.x) as keyof typeof nativeSpacing],
      gap: nativeSpacing[snapSiblings(gaps) as keyof typeof nativeSpacing],
    });
  });

  it('sets each card’s sample and words inside it, and each chip’s dot on its chip', () => {
    const { tree, text, byId } = setup();
    for (const n of [0, 1, 2, 3]) {
      const c = byId(`atlas.card.${String(n)}`);
      const entry = card(n);
      expect(c.findAllByType(Swatch)).toHaveLength(1);
      for (const words of [entry.entry.name.kanji, entry.derived.hex])
        expect(
          isAncestor(c, text(words)) ||
            c.findAll((x) => x.type === Text && textOf(x) === words).length > 0,
        ).toBe(true);
    }
    for (const g of familyGroups())
      expect(isAncestor(byId(`atlas.family.${g.group}`), byId(`atlas.family.${g.group}.dot`))).toBe(
        true,
      );
    // The sample is the card's, once: hidden from assistive technology so the card is heard once.
    expect(tree.UNSAFE_getAllByType(Swatch).every((s) => nearest(s, Card) !== null)).toBe(true);
  });
});

describe('proportion: each size the screen passes is 05’s, recomputed', () => {
  it('the bar: its height to the rule, its inset and gap, its rule, its overflow', () => {
    const { tree } = setup();
    const bar = tree.UNSAFE_getByType(Screen).props['appBar'] as Readonly<Record<string, unknown>>;
    expect(APP_BAR).toBe(el('05.header-rule').dp.y);
    expect(bar['height']).toBe(APP_BAR);
    expect(bar['inset']).toBe(
      nativeSpacing[snap(el('05.title').dp.x) as keyof typeof nativeSpacing],
    );
    expect(bar['rule']).toBe(true);
    // Between the title's row and the pills' row: 1 dp of ink, less the title's own inset — xs.
    expect(snap(el('05.count').dp.y - bottom(el('05.title')) - inset('body'))).toBe('xs');
    expect(bar['gap']).toBe(nativeSpacing.xs);
    const icons = (bar['trailing'] as { icons: readonly { size: number; glyph: string }[] }).icons;
    expect(icons.map((i) => i.glyph)).toStrictEqual(['more']);
    expect(icons[0]?.size).toBe(MORE_GLYPH);
    // The three dots ink 0.633 of the grid: drawn at MORE_GLYPH they ink 05's width, within a dp.
    expect(Math.abs(MORE_GLYPH * 0.633 - el('05.more').dp.w)).toBeLessThan(1);
  });

  it('the pills, the field, the chips and the samples, at their drawn heights', () => {
    const { tree, byId, button } = setup();
    const heights = (ids: readonly string[]) => ids.map((id) => el(id).dp.h);
    const seasons = ['all', 'spring', 'summer', 'autumn', 'winter'].map(
      (s) => `05.filters.season.${s}`,
    );
    expect(SEASON_PILL).toBe(mode(heights(seasons)));
    expect(FAMILY_CHIP).toBe(
      mode(
        heights(
          ['ao', 'aka', 'midori', 'murasaki', 'cha', 'kuro'].map((g) => `05.filters.family.${g}`),
        ),
      ),
    );
    expect(COUNT_PILL).toBe(el('05.count').dp.h);
    expect(NAV_PILL).toBe(mode(heights(['05.compare', '05.finder', '05.palettes'])));
    expect(SEARCH_FIELD).toBe(el('05.search').dp.h);
    expect(ATLAS_SAMPLE).toBe(
      mode(heights([1, 2, 3, 4].map((n) => `05.card-${String(n)}.swatch`))),
    );

    const group = tree
      .UNSAFE_getAllByType(ChoiceGroup)
      .find((g) => g.props['label'] === en['filter.season']);
    expect(group?.props['pills']).toMatchObject({
      height: SEASON_PILL,
      size: el(seasons[1]!).type?.size,
      gap: 'xs',
    });
    for (const g of familyGroups()) {
      const chip =
        nearest(byId(`atlas.family.${g.group}`), Chip) ?? byId(`atlas.family.${g.group}`);
      expect([chip.props['height'], chip.props['size'], chip.props['ground']]).toStrictEqual([
        FAMILY_CHIP,
        el('05.filters.family.ao').type?.size,
        'surface.1',
      ]);
    }
    const count = tree.UNSAFE_getAllByType(Chip).find((c) => c.props['form'] === 'badge')!;
    expect([
      count.props['height'],
      count.props['size'],
      count.props['fill'],
      count.props['icon'],
    ]).toStrictEqual([COUNT_PILL, el('05.count').type?.size, 'surface.2', 'list']);
    expect(byId('atlas.count')).toBeDefined();
    for (const key of ['atlas.compare', 'atlas.finder', 'atlas.palettes'] as const) {
      const b = button(key);
      expect([
        b.props['variant'],
        b.props['edge'],
        b.props['height'],
        b.props['step'],
        b.props['inset'],
      ]).toStrictEqual(['secondary', 'border', NAV_PILL, el('05.compare').type?.size, 'sm']);
    }
    const field = tree.UNSAFE_getByType(SearchField);
    expect([
      field.props['height'],
      field.props['icon'],
      field.props['iconSize'],
      field.props['size'],
    ]).toStrictEqual([SEARCH_FIELD, 'search', SEARCH_GLYPH, el('05.search').type?.size]);
    // The field's corner is 05's md, drawn by its outline.
    expect(el('05.search').tokens['radius']).toBe('md');
    expect(
      field.findAll((n) => flat(n.props['style'])['borderRadius'] === nativeRadius.md).length,
    ).toBeGreaterThan(0);
  });

  it('the cards: level 1, corner sm, padded sm, the sample 5 dp in, its corner and line as drawn', () => {
    const { tree } = setup();
    const one = el('05.card-1');
    expect(ATLAS_MEDIA_INSET).toBe(el('05.card-1.swatch').dp.x - one.dp.x);
    for (const c of tree.UNSAFE_getAllByType(Card)) {
      expect(c.props['level']).toBe(one.tokens['bg']?.replace('level', ''));
      expect(c.props['radius']).toBe(one.tokens['radius']);
      expect(c.props['padding']).toBe(snap(el('05.card-1.romaji').dp.x - one.dp.x));
      expect(c.props['mediaInset']).toBe(ATLAS_MEDIA_INSET);
      expect(c.props['fill']).toBe(true);
    }
    for (const s of tree.UNSAFE_getAllByType(Swatch)) {
      expect([
        s.props['width'],
        s.props['height'],
        s.props['corner'],
        s.props['keyline'],
      ]).toStrictEqual(['fill', ATLAS_SAMPLE, el('05.card-1.swatch').tokens['radius'], true]);
      // C20's line at 1 dp: no width passed, so the default.
      expect(s.props['keylineWidth']).toBeUndefined();
    }
  });

  it('the page inset, the grid and every interval: 05’s, snapped, as the screen passes them', () => {
    const { tree, text } = setup();
    const search = el('05.search');
    const rule = el('05.header-rule');
    const seasons = ['all', 'spring', 'summer', 'autumn', 'winter'].map((s) =>
      el(`05.filters.season.${s}`),
    );
    const label = el('05.filters.family-label');
    const ao = el('05.filters.family.ao');
    const filtersRule = el('05.filters-rule');
    const heading = el('05.heading');
    const [one, two, three] = [el('05.card-1'), el('05.card-2'), el('05.card-3')];
    const expected = {
      page: snap(search.dp.x),
      // From the bar's rule to the field (the leaked label is not drawn; the field keeps its place).
      top: snap(search.dp.y - bottom(rule)),
      // The field, the seasons, the chips and the rule: drawn shapes, so the gap is the interval.
      header: snapSiblings([
        ...seasons.map((s) => s.dp.y - bottom(search)),
        filtersRule.dp.y - bottom(ao),
        // A text's line inset is its own: the label's above it, the heading's above it.
        label.dp.y - bottom(seasons[3]!) - inset('caption'),
        heading.dp.y - bottom(filtersRule) - inset('label'),
      ]),
      // The label sits on its chips: 5.5 dp of ink, less the label's inset below.
      family: snap(ao.dp.y - bottom(label) - inset('caption')),
      // The heading to the first row: 9 dp of ink, less the heading's inset below.
      grid: snap(one.dp.y - bottom(heading) - inset('label')),
      columns: snap(two.dp.x - right(one)),
      rows: snap(three.dp.y - bottom(one)),
    };
    expect(expected).toStrictEqual({
      page: 'md',
      top: 'xl',
      header: 'sm',
      family: 'xs',
      grid: 'xs',
      columns: 'sm',
      rows: 'sm',
    });
    const step = (s: string) => nativeSpacing[s as keyof typeof nativeSpacing];

    expect(tree.UNSAFE_getByType(Screen).props['bleed']).toBe(true);
    const list = tree.UNSAFE_getByType(FlatList);
    expect(list.props['numColumns']).toBe(2);
    expect(list.props['contentContainerStyle']).toMatchObject({ paddingTop: step(expected.top) });
    expect(list.props['columnWrapperStyle']).toStrictEqual({
      paddingHorizontal: step(expected.page),
    });
    expect(list.props['ListHeaderComponentStyle']).toStrictEqual({
      paddingBottom: step(expected.grid),
    });
    const separator = (list.props['ItemSeparatorComponent'] as () => React.JSX.Element)();
    const separatorStyle: unknown = (separator.props as { style?: unknown }).style;
    expect(flat(separatorStyle)['height']).toBe(step(expected.rows));
    // Each cell pads its inner side xs: two cells, sm between them, as the rows.
    // The host views: a composite and its host carry the same style.
    const cells = tree.UNSAFE_root.findAll(
      (n) => (n.type as unknown) === 'View' && flat(n.props['style'])['maxWidth'] === '50%',
    );
    expect(cells.length).toBeGreaterThan(1);
    for (const [i, c] of cells.slice(0, 4).entries()) {
      const style = flat(c.props['style']);
      expect(style[i % 2 === 0 ? 'paddingRight' : 'paddingLeft']).toBe(step(expected.columns) / 2);
    }
    // The header's blocks, and the label with its chips.
    const header = nearest(tree.UNSAFE_getByType(SearchField), Stack);
    expect(header?.props['gap']).toBe(expected.header);
    expect(nearest(text(en['atlas.family']), Stack)?.props['gap']).toBe(expected.family);
  });

  it('a card’s lines and the pills’ gaps: xs, as drawn', () => {
    const { tree, text } = setup();
    const lines = snapSiblings([
      el('05.card-1.romaji').dp.y -
        bottom(el('05.card-1.kanji')) -
        inset('body', 'japanese') -
        inset('label'),
      el('05.card-1.oklch').dp.y -
        bottom(el('05.card-1.romaji')) -
        inset('label') -
        inset('caption'),
      el('05.card-1.era').dp.y - bottom(el('05.card-1.oklch')) - 2 * inset('caption'),
    ]);
    expect(lines).toBe('xs');
    expect(nearest(text(card(0).entry.name.kanji), Stack)?.props['gap']).toBe(lines);
    const seasons = ['all', 'spring', 'summer', 'autumn', 'winter'].map((s) =>
      el(`05.filters.season.${s}`),
    );
    const pills = snapSiblings(seasons.slice(1).map((s, i) => s.dp.x - right(seasons[i]!)));
    expect(pills).toBe('xs');
    const nav = snapSiblings([
      el('05.finder').dp.x - right(el('05.compare')),
      el('05.palettes').dp.x - right(el('05.finder')),
    ]);
    expect(nav).toBe('xs');
    const navRow = nearest(tree.UNSAFE_getAllByType(Button)[0]!, Row);
    expect(navRow?.props['gap']).toBe(nav);
  });

  it('each text at the face, step, weight and ink 05 records', () => {
    const { tree, text } = setup();
    // The README's names, as the manifest's tokens (R9 §5); tertiary on a card is its card form.
    const TOKEN: Readonly<Record<string, string>> = {
      'text.primary': 'foreground',
      'text.secondary': 'foreground.2',
      'text.tertiary': 'foreground.3.card',
    };
    const c = card(0);
    const cases: readonly [string, Instance][] = [
      ['05.filters.family-label', text(en['atlas.family'])],
      ['05.heading', text(en['atlas.heading'])],
      ['05.card-1.kanji', text(c.entry.name.kanji)],
      ['05.card-1.hex', text(c.derived.hex)],
      ['05.card-1.romaji', text(capitalisedRomaji(c.entry.name.romaji))],
      ['05.card-1.oklch', text(atlasOklch(c.derived.oklch, en['coord.oklch']))],
      [
        '05.card-1.era',
        tree
          .UNSAFE_getAllByType(Text)
          .find(
            (n) =>
              textOf(n) === seasonLine(c, (k) => message('en', k), 'latin') &&
              nearest(n, Card) !== null,
          )!,
      ],
    ];
    /*
     * THE WEIGHT AS RENDERED, NOT AS PASSED (F-242's review, B1): a step carries its own weight, so
     * only the host node's style says what a person sees.
     */
    const rendered = (node: Instance): Readonly<Record<string, unknown>> => {
      const host = node.findAll((n) => (n.type as unknown) === 'Text')[0];
      return ((StyleSheet.flatten(host?.props['style'] as StyleProp<TextStyle>) as unknown) ??
        {}) as Readonly<Record<string, unknown>>;
    };
    for (const [id, node] of cases) {
      const e = el(id);
      const script = id.endsWith('.kanji') ? 'japanese' : 'latin';
      const step = e.type?.size as 'caption' | 'label' | 'body';
      expect({ [id]: node.props['size'] as unknown }).toStrictEqual({ [id]: e.type?.size });
      expect({ [id]: (node.props['face'] as string | undefined) ?? 'sans' }).toStrictEqual({
        [id]: e.type?.face,
      });
      expect({
        [id]: (rendered(node)['fontWeight'] as string | undefined) ?? '400',
      }).toStrictEqual({
        [id]: String(e.type?.weight),
      });
      expect({ [id]: rendered(node)['fontSize'] }).toStrictEqual({
        [id]: nativeType[script][step].fontSize,
      });
      expect({ [id]: node.props['color'] as unknown }).toStrictEqual({
        [id]: TOKEN[e.tokens['fg'] ?? ''],
      });
    }
    // The title: one heading at body 600, the Japanese run after it (ADR-0142).
    const title = tree.UNSAFE_getByType(Bilingual);
    expect([
      title.props['size'],
      title.props['weight'],
      title.props['text'],
      title.props['ja'],
    ]).toStrictEqual([
      el('05.title').type?.size,
      el('05.title').type?.weight,
      en['atlas.title'],
      japaneseRun('atlas.titleJa'),
    ]);
    // DECOY: the Japanese body step is drawn at 400 and the heading's label step at 400 by default,
    // so a weight left to the step would read 400 where 05 records 600 for the heading.
    expect(nativeType.latin.label.fontWeight).toBe('400');
    expect(el('05.heading').type?.weight).toBe(600);
  });

  it('the season row: All chosen in accent, led by its dot; the others outlined', () => {
    const { tree } = setup(null);
    const group = tree
      .UNSAFE_getAllByType(ChoiceGroup)
      .find((g) => g.props['label'] === en['filter.season'])!;
    expect(el('05.filters.season.all').tokens['bg']).toBe('action.primary');
    expect(group.props['pills']).toMatchObject({ selectedFill: 'accent', selectedEdge: false });
    expect(group.props['value']).toBeNull();
    const dots = group.findAllByType(SelectionDot).filter((d) => d.props['visible'] === true);
    expect(dots).toHaveLength(1);
  });

  it('wraps every row 05 draws on one line, so none clips (§4 E3), and the title too', () => {
    const { tree, text, byId, button } = setup();
    const c = card(0);
    const rows = [
      nearest(byId('atlas.count'), Row),
      nearest(button('atlas.compare'), Row),
      nearest(text(en['atlas.heading']), Row),
      nearest(text(c.entry.name.kanji), Row),
    ];
    for (const r of rows) expect(r?.props['wrap']).toBe(true);
    const seasonRow = sharedRow(text(en['season.spring']), text(en['season.winter']));
    expect(flat(seasonRow?.props['style'])['flexWrap']).toBe('wrap');
    expect(tree.UNSAFE_getByType(Bilingual).props['numberOfLines']).toBeUndefined();
  });

  it('DECOY — the snap can tell the steps apart, so the assertions above are not all one answer', () => {
    expect([snap(17.5), snap(31.5), snap(9.5), snap(2.9), snap(10), snap(5.2)]).toStrictEqual([
      'md',
      'xl',
      'sm',
      'xs',
      'sm',
      'xs',
    ]);
  });
});

describe('the words each locale draws', () => {
  it('the count and the title in Japanese are the catalogue’s, joined as Japanese joins them', () => {
    expect(message('ja', 'atlas.title')).toBe('色図鑑');
    expect(japaneseRun('atlas.titleJa')).toBe(message('ja', 'atlas.titleJa'));
  });
});
