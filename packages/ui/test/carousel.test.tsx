/**
 * The carousel and the page dots (F-235, criterion 3; mockups 20, 22, 23 and 25; ADR-0120).
 *
 * - **Every number is the drawing's**, recomputed with the value it could have been as a decoy.
 * - **The peeks are held in dp**: a wider phone widens the item, not the peeks.
 * - **A neighbour is a button whose target reaches the platform's**, and items no one can see say
 *   nothing (WCAG 2.2 2.5.7).
 * - **The current page is a capsule** (rule 13), the others `foreground.3`, and a small dot means the
 *   pages go on past it (OQ-52).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { nativeColors } from '@irodora/design-tokens';
import {
  ACTION_BAR_GAP,
  Carousel,
  CAROUSEL_GAP,
  CAROUSEL_LEADING_GAP,
  CAROUSEL_PEEK,
  centredWidth,
  PAGE_DOT,
  PAGE_DOT_CURRENT,
  PAGE_DOT_SMALL,
  PAGE_DOTS_PITCH,
  PAGE_DOTS_WINDOW,
  PageDots,
  pageDots,
  platformTapTarget,
  ThemeProvider,
  type CarouselProps,
} from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
interface Element {
  readonly id: string;
  readonly component?: string | null;
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
const finder =
  (j: Inventory) =>
  (id: string): Element => {
    const e = j.elements.find((x) => x.id === id);
    if (e === undefined) throw new Error(id);
    return e;
  };
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;
const right = (b: Box): number => b.x + b.w;
const nodes = (n: TestNode): readonly TestNode[] => [
  n,
  ...(n.children ?? []).flatMap((c) => (typeof c === 'string' ? [] : nodes(c))),
];

describe('the carousel’s numbers are 20’s, 22’s and 23’s', () => {
  it('20: the peeks, the gaps, and the item they leave', () => {
    const at = finder(inventory('20'));
    const previous = at('20.carousel.previous').dp;
    const next = at('20.carousel.next').dp;
    const card = at('20.card').dp;
    expect(median([previous.w, next.w])).toBe(CAROUSEL_PEEK);
    expect(card.x - right(previous)).toBe(CAROUSEL_GAP);
    expect(next.x - right(card)).toBe(CAROUSEL_GAP);
    expect(centredWidth(at('20.carousel').dp.w)).toBe(card.w);
    expect(at('20.carousel').component).toBe('ui:Carousel');
    // DECOY: peeks proportional to the width would give a 360 dp phone a different peek.
    expect(centredWidth(360)).toBe(360 - (384 - card.w));
    expect(centredWidth(360)).not.toBe(Math.round((360 * card.w) / 384));
  });

  it('a neighbour’s target, its peek and the gap toward the centre, reaches both platforms’', () => {
    expect(CAROUSEL_PEEK + CAROUSEL_GAP).toBeGreaterThanOrEqual(platformTapTarget('android'));
    expect(CAROUSEL_PEEK + CAROUSEL_GAP).toBeGreaterThanOrEqual(platformTapTarget('ios'));
    // DECOY: the peek alone does not.
    expect(CAROUSEL_PEEK).toBeLessThan(platformTapTarget('android'));
  });

  it('22 and 23: the leading gap', () => {
    const t22 = finder(inventory('22'));
    const t23 = finder(inventory('23'));
    const gaps = [
      t22('22.compat.garment-2').dp.x - right(t22('22.compat.garment-1').dp),
      t22('22.compat.garment-3').dp.x - right(t22('22.compat.garment-2').dp),
      t23('23.palettes.kasane-2').dp.x - right(t23('23.palettes.kasane-1').dp),
      t23('23.palettes.kasane-3').dp.x - right(t23('23.palettes.kasane-2').dp),
    ];
    expect(half(median(gaps))).toBe(CAROUSEL_LEADING_GAP);
    expect(t22('22.compat').component).toBe('ui:Carousel');
    expect(t23('23.palettes.row').component).toBe('ui:Carousel');
    // DECOY: the action bar's gap, the nearest step-like value.
    expect(CAROUSEL_LEADING_GAP).not.toBe(ACTION_BAR_GAP);
  });
});

describe('the page dots’ numbers are 25’s', () => {
  const at = finder(inventory('25'));
  const dots = at('25.dots');
  const dpPerPx = inventory('25').frame.screens[0]?.dpPerPx ?? NaN;
  const raw = (k: string): number => dots.raw?.[k] ?? NaN;

  it('the dot, the current dot, the small dot and the pitch', () => {
    expect(half(raw('dotPx') * dpPerPx)).toBe(PAGE_DOT);
    expect(half(raw('activePx') * dpPerPx)).toBe(PAGE_DOT_CURRENT);
    expect(half(raw('smallPx') * dpPerPx)).toBe(PAGE_DOT_SMALL);
    expect(half(raw('pitchPx') * dpPerPx)).toBe(PAGE_DOTS_PITCH);
    // Four drawn: three pitches between the current dot's centre and the small one's.
    const span = (PAGE_DOTS_WINDOW - 1) * PAGE_DOTS_PITCH + (PAGE_DOT_CURRENT + PAGE_DOT_SMALL) / 2;
    expect(Math.abs(span - dots.dp.w)).toBeLessThanOrEqual(1.5);
  });
});

describe('which pages show, and how (OQ-52)', () => {
  const kinds = (current: number, total: number): readonly string[] =>
    pageDots(current, total).map((d) => d.dot);

  it('25’s window: the first of five or more, its fourth small', () => {
    expect(kinds(0, 6)).toStrictEqual(['current', 'page', 'page', 'more']);
    // DECOY: with no pages beyond the window, no dot is small.
    expect(kinds(0, 4)).toStrictEqual(['current', 'page', 'page', 'page']);
  });

  it('slides to keep the current page off its edges, and never draws it small', () => {
    expect(pageDots(3, 6).map((d) => d.page)).toStrictEqual([1, 2, 3, 4]);
    expect(kinds(3, 6)).toStrictEqual(['more', 'page', 'current', 'more']);
    expect(kinds(5, 6)).toStrictEqual(['more', 'page', 'page', 'current']);
    for (let total = 1; total <= 9; total += 1)
      for (let current = 0; current < total; current += 1) {
        const shown = pageDots(current, total);
        expect(shown.filter((d) => d.dot === 'current')).toHaveLength(1);
        expect(shown.find((d) => d.dot === 'current')?.page).toBe(current);
      }
  });

  it('refuses a page outside the set', () => {
    expect(() => pageDots(4, 4)).toThrow(RangeError);
    expect(() => pageDots(0, 0)).toThrow(RangeError);
  });
});

describe('the page dots as drawn', () => {
  const draw = (current: number, total: number, label: string): TestNode => {
    render(
      <ThemeProvider theme="light">
        <PageDots current={current} total={total} label={label} />
      </ThemeProvider>,
    );
    return screen.toJSON() as TestNode;
  };

  it('draws the current page as a capsule in the ink, the others in foreground.3', () => {
    const tree = draw(0, 6, 'Colour 1 of 6');
    const shapes = nodes(tree)
      .map((n) => flattenStyle(n.props['style']))
      .filter((s) => s['backgroundColor'] !== undefined);
    expect(shapes).toHaveLength(4);
    const [current, ...others] = shapes;
    expect(current?.['width']).toBe(2 * PAGE_DOT_CURRENT);
    expect(current?.['backgroundColor']).toBe(nativeColors.light.foreground);
    for (const s of others) expect(s['backgroundColor']).toBe(nativeColors.light['foreground.3']);
    expect(others.map((s) => s['width'])).toStrictEqual([PAGE_DOT, PAGE_DOT, PAGE_DOT_SMALL]);
    expect(screen.getByLabelText('Colour 1 of 6')).toBeTruthy();
  });

  it('refuses words that drop the page or the total', () => {
    expect(() => draw(0, 6, 'Colours')).toThrow(/must print the page/u);
    expect(() => draw(0, 6, 'Colour 1 of 16')).toThrow(/must print the page/u);
  });
});

const ITEMS = ['Ai-nezumi', 'Kuchiba', 'Sabi-asagi', 'Toki-iro'].map((name) => ({
  key: name,
  name: `Show ${name}`,
  node: <Text>{name}</Text>,
}));

describe('the carousel as drawn', () => {
  it('centred: the neighbours are buttons reaching toward the centre; the far items say nothing', () => {
    const changes: number[] = [];
    render(
      <ThemeProvider theme="dark">
        <Carousel
          form="centred"
          items={ITEMS}
          index={1}
          onIndexChange={(i) => changes.push(i)}
          testID="c"
        />
      </ThemeProvider>,
    );
    fireEvent(screen.getByTestId('c'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 384, height: 600 } },
    });
    const previous = screen.getByLabelText('Show Ai-nezumi');
    const next = screen.getByLabelText('Show Sabi-asagi');
    expect(previous.props['accessibilityRole']).toBe('button');
    expect(previous.props['hitSlop']).toStrictEqual({ right: CAROUSEL_GAP });
    expect(next.props['hitSlop']).toStrictEqual({ left: CAROUSEL_GAP });
    fireEvent.press(next);
    expect(changes).toStrictEqual([2]);
    // The far item is hidden from a screen reader; the current item is not a button.
    expect(screen.queryByLabelText('Show Toki-iro')).toBeNull();
    expect(screen.queryByLabelText('Show Kuchiba')).toBeNull();
    const widths = nodes(screen.toJSON() as TestNode)
      .map((n) => flattenStyle(n.props['style'])['width'])
      .filter((w) => w === centredWidth(384));
    expect(widths).toHaveLength(ITEMS.length);
  });

  it('leading: from the screen’s inset, the drawn gap apart', () => {
    render(
      <ThemeProvider theme="dark">
        <Carousel form="leading" inset={16} items={ITEMS} testID="l" />
      </ThemeProvider>,
    );
    const style = flattenStyle(screen.getByTestId('l').props['contentContainerStyle']);
    expect(style['gap']).toBe(CAROUSEL_LEADING_GAP);
    expect(style['paddingHorizontal']).toBe(16);
  });

  it('takes only what each form has, by type, and refuses an item outside the set', () => {
    const forms: CarouselProps[] = [
      // @ts-expect-error — the leading form shows no current item.
      { form: 'leading', inset: 16, items: ITEMS, index: 0 },
      // @ts-expect-error — the centred form needs one.
      { form: 'centred', items: ITEMS },
      // DECOY: as drawn, it compiles.
      { form: 'centred', items: ITEMS, index: 0, onIndexChange: () => undefined },
    ];
    expect(forms).toHaveLength(3);
    expect(() =>
      render(<Carousel form="centred" items={ITEMS} index={4} onIndexChange={() => undefined} />),
    ).toThrow(RangeError);
  });
});
