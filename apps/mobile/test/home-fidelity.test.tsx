/**
 * Home is mockup 01 in order, grouping and proportion (F-242, criterion 1).
 *
 * The inventory sweep in `screens.test` asks whether each of 01's 44 elements is DRAWN. This asks
 * the rest of the first criterion, on the same rendered screen:
 *
 * - **Order**: the blocks come in 01's reading order, and the hero's names in the order 01 sets
 *   them on the sample.
 * - **Grouping**: what 01 draws side by side shares a row, and what it draws inside something is
 *   inside it on the tree — the names on the sample, each badge on its tile.
 * - **Proportion**: every size, corner, line, step and interval the screen passes is recomputed
 *   here from `mockups/inventory/01.json` through R9 §2's snap, not restated.
 *
 * What a tree cannot show — that it looks like 01 — is the person's capture (criterion 4).
 * 01's tab bar is held to the same inventory by `packages/ui/test/tab-bar.test.tsx`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { nativeSpacing, nativeType } from '@irodora/design-tokens';
import {
  Button,
  Card,
  Chip,
  illustrationBox,
  Illustration,
  Screen,
  Stack,
  STATE_TEST_IDS,
  Swatch,
  Text,
  TextureBadge,
  ThemeProvider,
  Wordmark,
} from '@irodora/ui';
import type { SavedColorRow, StoredGarment } from '@irodora/store';
import { colourOfTheDay, HOME_HERO, HOME_TILE } from '../src/home';
import { HOME_ART, Home } from '../src/screens/Home';
import { en } from '../src/i18n/en';

interface Element {
  readonly id: string;
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly type: { readonly face: string; readonly size: string; readonly weight: number } | null;
  readonly tokens: Readonly<Record<string, string>>;
  readonly raw?: Readonly<Record<string, number>>;
}
const ONE = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '01.json'), 'utf8'),
) as { readonly elements: readonly Element[] };
const el = (id: string): Element => {
  const e = ONE.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(`01 records no ${id}`);
  return e;
};

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
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};

/* ----------------------------------------------------------------------------- the screen */

const DAY = Date.UTC(2026, 8, 3, 12);
const TODAY = colourOfTheDay(DAY);
if (TODAY === null) throw new Error('the corpus is empty');

const row = (i: number): SavedColorRow =>
  ({
    id: `c${String(i)}`,
    created_at: i,
    updated_at: i,
    deleted_at: null,
    name: `Colour ${String(i)}`,
    xyz_x: 0.1712,
    xyz_y: 0.1699,
    xyz_z: 0.2381,
    hex: ['#4E5D6C', '#E8E4DA', '#5E7A5A', '#A8503E', '#5C4A64'][i] ?? '#4E5D6C',
    source: 'reference',
    confidence: 1,
    corpus_slug: null,
  }) as unknown as SavedColorRow;
const GARMENTS = [0, 1, 2, 3, 4].map(
  (i) =>
    ({
      id: `g${String(i)}`,
      createdAt: 10 - i,
      updatedAt: 10 - i,
      deletedAt: null,
      type: 'shirt',
      name: null,
      material: 'Wool',
      color: row(i),
    }) as unknown as StoredGarment,
);

const drawHome = (garments: readonly StoredGarment[]) =>
  render(
    <ThemeProvider theme="dark">
      <Home
        store={{ listGarments: () => garments }}
        now={() => DAY}
        coverage={{ valid: 4, threshold: 60 }}
        onOpenCombinations={() => undefined}
        onOpenGarment={() => undefined}
        onOpenLens={() => undefined}
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
/** The nearest ancestor both share that lays its children out in a row. */
const sharedRow = (a: Instance, b: Instance): Instance | null => {
  for (let at: Instance | null = a.parent; at !== null; at = at.parent) {
    const style: unknown = at.props['style'];
    const layers: readonly unknown[] = Array.isArray(style) ? (style as unknown[]).flat() : [style];
    const row = layers.some(
      (s) =>
        typeof s === 'object' &&
        s !== null &&
        (s as Record<string, unknown>)['flexDirection'] === 'row',
    );
    if (row && isAncestor(at, b)) return at;
  }
  return null;
};

describe('order: 01’s blocks in its reading order', () => {
  /** Each test draws its own tree: the testing library unmounts one after every test. */
  const drawnAt = () => {
    const all = inOrder(drawHome(GARMENTS).UNSAFE_root);
    return (match: (n: Instance) => boolean, what: string): number => {
      const i = all.findIndex(match);
      if (i < 0) throw new Error(`${what} is not drawn`);
      return i;
    };
  };
  const byText = (text: string) => (n: Instance) => n.type === Text && textOf(n) === text;
  const byId = (id: string) => (n: Instance) => n.props['testID'] === id;

  it('lockup, tagline, pill, hero, wardrobe preview, colour card', () => {
    const at = drawnAt();
    const order = [
      at((n) => n.type === Wordmark, 'the lockup'),
      at(byText(`${en['home.what1']}\n${en['home.what2']}\n${en['home.what3']}`), 'the tagline'),
      at((n) => n.type === Chip && n.props['label'] === en['home.onDevice'], 'the pill'),
      at(byId('home.hero'), 'the hero'),
      at(byId('home.wardrobe'), 'the wardrobe preview'),
      at(byId('home.colourCard'), 'the colour card'),
    ];
    expect(order).toStrictEqual([...order].sort((a, b) => a - b));
  });

  it('on the sample: kanji, kana, name, OKLCh; and the sample before the action', () => {
    const at = drawnAt();
    const order = [
      at(byText(TODAY.entry.name.kanji), 'the kanji'),
      at(byText(TODAY.entry.name.kana), 'the kana'),
      at(
        (n) =>
          n.type === Text && textOf(n).startsWith(TODAY.entry.name.romaji.charAt(0).toUpperCase()),
        'the name',
      ),
      at((n) => n.type === Text && textOf(n).startsWith(en['coord.oklch']), 'the OKLCh line'),
      at((n) => n.type === Button, 'the action'),
    ];
    expect(order).toStrictEqual([...order].sort((a, b) => a - b));
  });

  it('first run: 27’s card stands in the preview’s place, between the hero and the colour card', () => {
    const first = inOrder(drawHome([]).UNSAFE_root);
    const index = (id: string) => first.findIndex((n) => n.props['testID'] === id);
    expect(index('home.hero')).toBeLessThan(index(STATE_TEST_IDS.empty));
    expect(index(STATE_TEST_IDS.empty)).toBeLessThan(index('home.colourCard'));
    expect(index('home.wardrobe')).toBe(-1);
  });
});

describe('grouping: what 01 draws together is together on the tree', () => {
  /** Each test draws its own tree: the testing library unmounts one after every test. */
  const setup = () => {
    const tree = drawHome(GARMENTS);
    const swatches = tree.UNSAFE_getAllByType(Swatch);
    const hero = swatches[0];
    if (hero === undefined) throw new Error('no hero');
    const texts = tree.UNSAFE_getAllByType(Text);
    const textNamed = (s: string): Instance => {
      const found = texts.find((n) => textOf(n) === s);
      if (found === undefined) throw new Error(`no text ${s}`);
      return found;
    };
    return { tree, swatches, hero, textNamed };
  };

  it('sets the hero’s names on its sample, and the action outside it', () => {
    const { tree, hero, textNamed } = setup();
    for (const s of [TODAY.entry.name.kanji, TODAY.entry.name.kana])
      expect(isAncestor(hero, textNamed(s))).toBe(true);
    expect(isAncestor(hero, tree.UNSAFE_getByType(Button))).toBe(false);
  });

  it('puts each badge on a tile of its own', () => {
    const { tree, swatches } = setup();
    const tiles = swatches.slice(1, 6);
    const badges = tree.UNSAFE_getAllByType(TextureBadge);
    expect(badges).toHaveLength(5);
    for (const [i, badge] of badges.entries()) expect(isAncestor(tiles[i]!, badge)).toBe(true);
  });

  it('draws side by side what 01 draws side by side', () => {
    const { tree, swatches, hero, textNamed } = setup();
    const tagline = textNamed(`${en['home.what1']}\n${en['home.what2']}\n${en['home.what3']}`);
    const chips = tree.UNSAFE_getAllByType(Chip);
    expect(sharedRow(tagline, chips[0]!)).not.toBeNull();
    expect(sharedRow(textNamed(en['home.wardrobePreview']), chips[1]!)).not.toBeNull();
    const cardSample = swatches[swatches.length - 1]!;
    expect(sharedRow(textNamed(en['home.colourCard']), cardSample)).not.toBeNull();
    // DECOY: the hero's sample and its action are drawn one above the other, in no row together.
    expect(sharedRow(hero, tree.UNSAFE_getByType(Button))).toBeNull();
  });
});

describe('proportion: each size the screen passes is 01’s, recomputed', () => {
  /** Each test draws its own tree: the testing library unmounts one after every test. */
  const setup = () => {
    const tree = drawHome(GARMENTS);
    return { tree, swatches: tree.UNSAFE_getAllByType(Swatch) };
  };

  it('the hero: full width, its height and line as drawn, its corner sm', () => {
    const { swatches } = setup();
    const sample = el('01.hero.sample');
    expect(HOME_HERO).toBe(sample.dp.h);
    const hero = swatches[0];
    expect(hero?.props['width']).toBe('fill');
    expect(hero?.props['height']).toBe(sample.dp.h);
    expect(hero?.props['keylineWidth']).toBe((sample.raw?.['keylinePx'] ?? NaN) / 2);
    expect(hero?.props['corner'] ?? 'sm').toBe(sample.tokens['radius']);
  });

  it('the tiles and the colour card’s sample, at their drawn sizes', () => {
    const { swatches } = setup();
    const widths = [1, 2, 3, 4, 5].map((n) => el(`01.wardrobe.tile-${String(n)}`).dp.w);
    expect(HOME_TILE).toBe(median(widths));
    for (const tile of swatches.slice(1, 6)) expect(tile.props['size']).toBe(HOME_TILE);
    const card = el('01.colour-card.sample');
    const last = swatches[swatches.length - 1];
    expect([last?.props['width'], last?.props['height']]).toStrictEqual([card.dp.w, card.dp.h]);
  });

  it('the action and the two pills, at their drawn heights and steps', () => {
    const { tree } = setup();
    expect(tree.UNSAFE_getByType(Button).props['height']).toBe(el('01.hero.cta').dp.h);
    const [onDevice, count] = tree.UNSAFE_getAllByType(Chip);
    expect(onDevice?.props['height']).toBe(el('01.header.chip').dp.h);
    expect(count?.props['height']).toBe(el('01.wardrobe.count').dp.h);
    expect([onDevice?.props['size'], count?.props['size']]).toStrictEqual([
      el('01.header.chip').type?.size,
      el('01.wardrobe.count').type?.size,
    ]);
  });

  it('each text at the face, step and weight 01 records', () => {
    const { tree } = setup();
    const texts = tree.UNSAFE_getAllByType(Text);
    const find = (match: (s: string) => boolean): Instance => {
      const found = texts.find((n) => match(textOf(n)));
      if (found === undefined) throw new Error('not drawn');
      return found;
    };
    const cases: readonly [string, Instance][] = [
      ['01.header.tagline', find((s) => s.startsWith(en['home.what1']))],
      ['01.hero.sample.kanji', find((s) => s === TODAY.entry.name.kanji)],
      ['01.hero.sample.kana', find((s) => s === TODAY.entry.name.kana)],
      ['01.hero.sample.oklch', find((s) => s.startsWith(en['coord.oklch']))],
      ['01.wardrobe.title', find((s) => s === en['home.wardrobePreview'])],
      ['01.colour-card.title', find((s) => s === en['home.colourCard'])],
      ['01.colour-card.note', find((s) => s === TODAY.entry.provenance.source)],
    ];
    /*
     * THE WEIGHT AS RENDERED, NOT AS PASSED (F-242's review, B1): a step carries its own weight —
     * the Japanese title's is 600 — so a Text that passes none is drawn at the step's, and only the
     * host node's style says what a person sees.
     */
    const renderedWeight = (node: Instance): string => {
      const host = node.findAll((n) => (n.type as unknown) === 'Text')[0];
      const style = StyleSheet.flatten(host?.props['style'] as StyleProp<TextStyle>);
      return String(style.fontWeight ?? '400');
    };
    for (const [id, node] of cases) {
      const type = el(id).type;
      expect({ [id]: node.props['size'] as unknown }).toStrictEqual({ [id]: type?.size });
      const face =
        (node.props['face'] as string | undefined) ?? (id.includes('kan') ? 'gothic' : 'sans');
      expect({ [id]: face }).toStrictEqual({ [id]: type?.face });
      expect({ [id]: renderedWeight(node) }).toStrictEqual({ [id]: String(type?.weight) });
    }
    // DECOY: the Japanese title step is 600, so a kanji passed no weight would be drawn at 600 —
    // which 01 records as 400 — and the check above would say so.
    expect(nativeType.japanese.title.fontWeight).toBe('600');
    expect(el('01.hero.sample.kanji').type?.weight).toBe(400);
  });

  it('each ink 01 records, as the token the screen passes', () => {
    const { tree } = setup();
    // The README's names, as the manifest's tokens (R9 §5).
    const TOKEN: Readonly<Record<string, string>> = {
      'text.primary': 'foreground',
      'text.secondary': 'foreground.2',
    };
    const texts = tree.UNSAFE_getAllByType(Text);
    const color = (s: string): unknown =>
      texts.find((n) => textOf(n) === s || textOf(n).startsWith(s))?.props['color'];
    for (const [id, words] of [
      ['01.header.tagline', en['home.what1']],
      ['01.wardrobe.title', en['home.wardrobePreview']],
      ['01.colour-card.title', en['home.colourCard']],
      ['01.colour-card.note', TODAY.entry.provenance.source],
    ] as const)
      expect({ [id]: color(words) }).toStrictEqual({ [id]: TOKEN[el(id).tokens['fg'] ?? ''] });
    // The three cards are level 1 with their resting edge, as 01 records (bg level1, border).
    for (const card of tree.UNSAFE_getAllByType(Card)) {
      expect(card.props['level']).toBe(el('01.hero').tokens['bg']?.replace('level', ''));
      expect(card.props['edge'] ?? true).toBe(true);
    }
    // The pills are outlined, not filled (border.subtle, no bg); the action is the primary pill.
    for (const chip of tree.UNSAFE_getAllByType(Chip)) expect(chip.props['fill']).toBeUndefined();
    expect(tree.UNSAFE_getByType(Button).props['variant'] ?? 'primary').toBe('primary');
  });

  it('the page inset, the cards’ padding and the intervals: 01’s, snapped, as the screen passes them', () => {
    const { tree } = setup();
    // The inset: 01's content starts 36.5–37 dp in (ADR-0139) — and the Screen is given it.
    expect(tree.UNSAFE_getByType(Screen).props['padding']).toBe(snap(el('01.hero').dp.x));
    // A card's padding: the hero's sample sits 13 dp inside its card.
    const cardPad = snap(el('01.hero.sample').dp.x - el('01.hero').dp.x);
    expect(cardPad).toBe('md');
    for (const card of tree.UNSAFE_getAllByType(Card))
      expect(card.props['padding'] ?? 'md').toBe(cardPad);

    const hero = el('01.hero');
    const wardrobe = el('01.wardrobe');
    const card = el('01.colour-card');
    const chip = el('01.header.chip');
    const lockup = el('01.header.lockup');
    const tagline = el('01.header.tagline');
    const sample = el('01.hero.sample');
    const cta = el('01.hero.cta');
    const count = el('01.wardrobe.count');
    const tile = el('01.wardrobe.tile-1');
    /*
     * The tagline's box is its ink. Its line box starts above the ink by about half the leading
     * the body step adds, (lineHeight − em) / 2, so that much of the drawn gap is the text's own
     * (ADR-0128 D2's method); every other box here is a drawn shape, and its gap is the interval.
     */
    const leadingAbove = (nativeType.latin.body.lineHeight - nativeType.latin.body.fontSize) / 2;
    const expected = [
      // The page: the header, then the cards — from the pill's foot to the hero (16.5).
      snap(hero.dp.y - (chip.dp.y + chip.dp.h)),
      // The header: the lockup, then the tagline (21.5 ink, less the leading above it).
      snap(tagline.dp.y - (lockup.dp.y + lockup.dp.h) - leadingAbove),
      // Between the cards: 7.5 and 5.5, siblings drawn alike, a tie, so the smaller (§2).
      snapSiblings([
        wardrobe.dp.y - (hero.dp.y + hero.dp.h),
        card.dp.y - (wardrobe.dp.y + wardrobe.dp.h),
      ]),
      // Inside the hero: the sample, then the action (11.5).
      snap(cta.dp.y - (sample.dp.y + sample.dp.h)),
      // Inside the preview: the title row, then the tiles (13).
      snap(tile.dp.y - (count.dp.y + count.dp.h)),
    ];
    expect(expected).toStrictEqual(['md', 'md', 'xs', 'sm', 'md']);
    // The Stacks, in tree order: the page, the header, the cards, the hero, the preview.
    expect(tree.UNSAFE_getAllByType(Stack).map((s) => s.props['gap'] as unknown)).toStrictEqual(
      expected,
    );
  });

  it('three plum branches, where 01 draws them, at the drawing’s own proportion', () => {
    const { tree } = setup();
    const [bw, bh] = illustrationBox('plum-branch');
    const art = tree.UNSAFE_getAllByType(Illustration);
    expect(
      art.map((a): readonly unknown[] => [a.props['name'], a.props['tone'], a.props['color']]),
    ).toStrictEqual(Array(3).fill(['plum-branch', 'backdrop', 'foreground']));
    const header = el('01.header.line-art');
    expect(HOME_ART.header).toStrictEqual({
      right: 384 - (header.dp.x + header.dp.w),
      top: header.dp.y,
      width: header.dp.w,
    });
    const right = el('01.side-art-right');
    expect(HOME_ART.right.top).toBe(right.dp.y);
    expect(HOME_ART.right.width + HOME_ART.right.right).toBe(right.dp.w);
    expect((HOME_ART.right.width * bh) / bw).toBeCloseTo(right.dp.h, 0);
    const left = el('01.side-art');
    expect(HOME_ART.left.top).toBe(left.dp.y);
    expect(HOME_ART.left.width + HOME_ART.left.left).toBe(left.dp.w);
    expect(Math.abs((HOME_ART.left.width * bh) / bw - left.dp.h)).toBeLessThan(0.5);
  });

  it('DECOY — the snap can tell the steps apart, so the assertions above are not all one answer', () => {
    expect([snap(13), snap(36.5), snap(5.5), snap(7.5), snap(20)]).toStrictEqual([
      'md',
      'xl',
      'xs',
      'sm',
      'md',
    ]);
  });
});
