/**
 * The app bar (F-234, criterion 2; ADR-0118).
 *
 * - **Its defaults are the inventories'**, recomputed with the values they could have been as decoys.
 * - **A title is one heading node** holding both scripts, the Japanese run in the Japanese face.
 * - **Every control in it is named**: a back control by where it goes (*Back to Atlas*), the drawn
 *   word inside that name (WCAG 2.5.3); a trailing icon by what it does.
 * - **The type refuses what no mockup draws**: a back control with a lead, four icons, a stacked
 *   title without its Japanese step.
 * - **A centred title is centred on the bar**, not on the space between its controls.
 * - **`Screen` pins it above the scroller**, moves the status bar's inset into it, and lets a fill
 *   run behind the status bar. The content still cannot reach the status bar (E-084).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { nativeColors, nativeFamilies, nativeSpacing } from '@irodora/design-tokens';
import {
  AppBar,
  APP_BAR_HEIGHT,
  APP_BAR_INSET,
  APP_BAR_RULE,
  APP_BAR_STACKED,
  Screen,
  Text,
  ThemeProvider,
  type AppBarProps,
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
  readonly parent?: string | null;
  readonly component?: string | null;
  readonly dp: Box;
}
interface Inventory {
  readonly elements: readonly Element[];
  readonly frame: { readonly screens: readonly { readonly box: Box; readonly dpPerPx: number }[] };
  readonly notDesign?: readonly { readonly what: string; readonly box: Box }[];
}
const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
const inventory = (n: string): Inventory =>
  JSON.parse(readFileSync(join(INVENTORY, `${n}.json`), 'utf8')) as Inventory;
const el = (j: Inventory, id: string): Element => {
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

describe('the defaults are the inventories’', () => {
  /** 7.5 % of a full-bleed frame's height: a plausible header, and no mockup's. */
  const guess = (() => {
    const frame = inventory('08').frame.screens[0];
    return frame === undefined ? NaN : 0.075 * frame.box.h * frame.dpPerPx;
  })();

  it('a single-line bar: the median of the drawn rules’ tops, over the bars that draw one', () => {
    const tops = ['08', '12', '13', '16', '18'].map((n) => {
      const j = inventory(n);
      return el(j, `${n}.header-rule`).dp.y - el(j, `${n}.header`).dp.y;
    });
    expect(median(tops)).toBe(APP_BAR_HEIGHT);
    expect(half(guess)).not.toBe(APP_BAR_HEIGHT);
    expect(APP_BAR_HEIGHT).not.toBe(56);
  });

  it('a stacked bar: 24’s drawn fill, less the status bar drawn into it', () => {
    const j = inventory('24');
    const bar = el(j, '24.header');
    const status = j.notDesign?.find((x) => x.what === 'status-bar');
    const frame = j.frame.screens[0];
    if (status === undefined || frame === undefined) throw new Error('24: no status bar');
    const statusBottom = (status.box.y + status.box.h - frame.box.y) * frame.dpPerPx;
    expect(half(bar.dp.y + bar.dp.h - statusBottom)).toBe(APP_BAR_STACKED);
    // DECOY: the whole fill, status bar and all, is not the bar the device draws under its own.
    expect(bar.dp.h).not.toBe(APP_BAR_STACKED);
  });

  it('the side inset: the median left edge of what each bar draws first', () => {
    const lefts: number[] = [];
    for (const file of readdirSync(INVENTORY).filter((f) => /^\d\d\.json$/u.test(f))) {
      const j = inventory(file.slice(0, 2));
      for (const bar of j.elements.filter((e) => e.component === 'ui:AppBar')) {
        const left = j.elements.filter(
          (e) =>
            e.parent === bar.id &&
            !/rule|divider/u.test(e.id) &&
            e.dp.x + e.dp.w / 2 < bar.dp.w / 3,
        );
        if (left.length > 0) lefts.push(Math.min(...left.map((e) => e.dp.x)));
      }
    }
    expect(lefts).toHaveLength(17);
    expect(median(lefts)).toBe(APP_BAR_INSET);
    // DECOY: the page's own padding, which the content below the bar keeps.
    expect(APP_BAR_INSET).not.toBe(nativeSpacing.lg);
  });
});

function draw(node: React.JSX.Element, theme: 'light' | 'dark' = 'dark'): void {
  render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
}
const noop = (): void => undefined;

describe('a title is one heading node, holding both scripts', () => {
  const headings = (): ReturnType<typeof screen.getAllByRole> => screen.getAllByRole('header');

  it('inline: English • 日本語 on one line', () => {
    draw(
      <AppBar
        title={{
          text: 'Compare',
          ja: '比較',
          layout: 'inline',
          align: 'centre',
          placement: 'bar',
          size: 'title',
          weight: 500,
        }}
      />,
    );
    const [heading] = headings();
    expect(headings()).toHaveLength(1);
    expect(heading?.props['numberOfLines']).toBe(1);
    const japanese = screen.getByText(' • 比較');
    expect(flattenStyle(japanese.props['style'])['fontFamily']).toBe(nativeFamilies.jp);
    // The run is inside the heading, not beside it. Compared as a boolean: a failed identity match
    // between two render instances makes jest print both, and that exhausts the heap.
    let inside = false;
    for (let n = japanese.parent; n !== null; n = n.parent) if (n === heading) inside = true;
    expect(inside).toBe(true);
  });

  it('stacked: the Japanese under the English, in its own step and in foreground.2', () => {
    draw(
      <AppBar
        title={{
          text: 'Combinations',
          ja: '組み合わせ',
          layout: 'stacked',
          align: 'centre',
          placement: 'bar',
          size: 'title',
          weight: 600,
          jaSize: 'body',
        }}
      />,
    );
    expect(headings()).toHaveLength(1);
    const japanese = screen.getByText('組み合わせ');
    const style = flattenStyle(japanese.props['style']);
    expect(style['fontFamily']).toBe(nativeFamilies.jp);
    expect(style['color']).toBe(nativeColors.dark['foreground.2']);
    expect(flattenStyle(headings()[0]?.props['style'])['textAlign']).toBe('center');
  });
});

describe('every control in it is named', () => {
  it('names the back control by where it goes, and it presses', () => {
    const onPress = jest.fn();
    draw(
      <AppBar
        back={{ glyph: 'back', label: 'Atlas', name: 'Back to Atlas', onPress, testID: 'back' }}
      />,
    );
    // DECOY in the assertion: the drawn word alone is the Atlas tab's name too.
    expect(screen.getByTestId('back').props['accessibilityLabel']).toBe('Back to Atlas');
    fireEvent.press(screen.getByTestId('back'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('refuses a name that leaves out the drawn word (WCAG 2.5.3)', () => {
    // React logs the render error before the throw reaches the test; it is the expected outcome.
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => {
      draw(<AppBar back={{ glyph: 'back', label: 'Atlas', name: 'Go back', onPress: noop }} />);
    }).toThrow(/does not contain the visible label/u);
    quiet.mockRestore();
  });

  it('a glyph alone takes the name it is given (22)', () => {
    draw(<AppBar back={{ glyph: 'chevron-left', name: 'Back', onPress: noop, testID: 'back' }} />);
    expect(screen.getByTestId('back').props['accessibilityLabel']).toBe('Back');
  });

  it('names each trailing icon, and the mark standing alone', () => {
    draw(
      <AppBar
        trailing={{
          icons: [
            { glyph: 'bookmark', label: 'Bookmark this colour', onPress: noop, testID: 'a' },
            { glyph: 'share', label: 'Share this colour', onPress: noop, testID: 'b' },
          ],
        }}
      />,
    );
    expect(screen.getByTestId('a').props['accessibilityLabel']).toBe('Bookmark this colour');
    expect(screen.getByTestId('b').props['accessibilityLabel']).toBe('Share this colour');
  });

  it('refuses what no mockup draws', () => {
    const back = { glyph: 'back' as const, label: 'Back', name: 'Back to Back', onPress: noop };
    const icon = { glyph: 'share' as const, label: 'Share', onPress: noop };
    // @ts-expect-error — a back control and a lead are drawn in the same place; never both.
    const both = <AppBar back={back} lead={<View />} />;
    // @ts-expect-error — no bar draws four trailing icons.
    const four = <AppBar trailing={{ icons: [icon, icon, icon, icon] }} />;
    const stacked: AppBarProps = {
      // @ts-expect-error — a stacked title's Japanese line has its own step.
      title: {
        text: 'A',
        ja: 'あ',
        layout: 'stacked',
        align: 'centre',
        placement: 'bar',
        size: 'title',
        weight: 600,
      },
    };
    // DECOY: each alone compiles.
    const fine = [
      <AppBar key="a" back={back} trailing={{ icons: [icon, icon, icon] }} />,
      <AppBar key="b" lead={<View />} />,
    ];
    expect([both, four, stacked, ...fine]).toHaveLength(5);
  });
});

describe('a centred title is centred on the bar', () => {
  it('lays both sides out at the wider side’s width', () => {
    const tree = render(
      <ThemeProvider theme="dark">
        <AppBar
          back={{ glyph: 'back', label: 'Atlas', name: 'Back to Atlas', onPress: noop }}
          title={{
            text: 'Compare',
            layout: 'inline',
            align: 'centre',
            placement: 'bar',
            size: 'title',
            weight: 500,
          }}
          trailing={{ icons: [{ glyph: 'export', label: 'Export', onPress: noop }] }}
        />
      </ThemeProvider>,
    );
    // The bar's two sides: the hosts whose own box grows from zero (`flexBasis: 0`). The content
    // measured is the host inside each — the controls carry measurements of their own.
    const sides = tree.UNSAFE_root.findAll(
      (n) => typeof n.type === 'string' && flattenStyle(n.props['style'])['flexBasis'] === 0,
    );
    expect(sides).toHaveLength(2);
    const [start, end] = sides.map((side) =>
      side.find((n) => typeof n.type === 'string' && typeof n.props['onLayout'] === 'function'),
    );
    if (start === undefined || end === undefined) throw new Error('unmeasured');
    fireEvent(start, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 62, height: 20 } } });
    fireEvent(end, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 24, height: 24 } } });
    const drawn = tree.UNSAFE_root.findAll(
      (n) => typeof n.type === 'string' && flattenStyle(n.props['style'])['flexBasis'] === 0,
    ).map((n) => flattenStyle(n.props['style']));
    // DECOY: each side at its own width would put the title off-centre by (62 − 24) / 2.
    for (const side of drawn) expect(side['minWidth']).toBe(62);
  });

  it('draws no balanced sides when the title leads', () => {
    const tree = render(
      <ThemeProvider theme="dark">
        <AppBar
          title={{
            text: 'Colour Atlas',
            layout: 'inline',
            align: 'leading',
            placement: 'bar',
            size: 'title',
            weight: 600,
          }}
        />
      </ThemeProvider>,
    );
    expect(
      tree.UNSAFE_root.findAll(
        (n) => typeof n.type === 'string' && flattenStyle(n.props['style'])['flexBasis'] === 0,
      ),
    ).toHaveLength(0);
  });
});

describe('Screen pins it above the scroller, and the inset moves into it (E-084)', () => {
  const INSET = { top: 47, bottom: 34, left: 0, right: 0 };
  const withInsets = (node: React.JSX.Element) =>
    render(
      <SafeAreaInsetsContext.Provider value={INSET}>
        <ThemeProvider theme="dark">{node}</ThemeProvider>
      </SafeAreaInsetsContext.Provider>,
    );
  const bar = {
    back: { glyph: 'back' as const, label: 'Atlas', name: 'Back to Atlas', onPress: noop },
    fill: 'surface.1' as const,
    rule: true,
    testID: 'bar',
  };

  /** Whether a node sits inside a scroller. */
  const scrolls = (node: ReturnType<typeof screen.getByTestId> | null): boolean => {
    for (let n = node?.parent ?? null; n !== null; n = n.parent)
      if (String(n.type) === 'RCTScrollView') return true;
    return false;
  };

  it('draws the bar outside the scroller, padded by the status bar, its fill behind it', () => {
    withInsets(
      <Screen testID="page" appBar={bar}>
        <Text size="body" color="foreground">
          Ai-nezumi
        </Text>
      </Screen>,
    );
    const drawn = screen.getByTestId('bar');
    expect(scrolls(drawn)).toBe(false);
    const style = flattenStyle(drawn.props['style']);
    expect(style['paddingTop']).toBe(INSET.top);
    // On the SAME node as the inset, so the fill runs behind the status bar (18 19 24).
    expect(style['backgroundColor']).toBe(nativeColors.dark['surface.1']);
    expect(style['borderBottomWidth']).toBe(APP_BAR_RULE);
  });

  it('DECOY: a bar handed to the page as content scrolls away', () => {
    withInsets(
      <Screen testID="page">
        <AppBar {...bar} />
      </Screen>,
    );
    expect(scrolls(screen.getByTestId('bar'))).toBe(true);
  });

  it('moves the inset rather than counting it twice, and never onto the content', () => {
    withInsets(<Screen testID="page" appBar={bar} />);
    const content = flattenStyle(screen.getByTestId('page').props['contentContainerStyle']);
    for (const value of Object.values(content)) expect(value).not.toBe(INSET.top);
    for (let n = screen.getByTestId('page').parent; n !== null; n = n.parent)
      expect(flattenStyle(n.props['style'])['paddingTop']).not.toBe(INSET.top);
  });

  it('draws the bar first, then the scroller, as siblings on the ground', () => {
    const root = withInsets(<Screen testID="page" appBar={bar} />).toJSON() as TestNode;
    const idsOf = (node: TestNode): readonly unknown[] =>
      (node.children ?? []).map((c) => (typeof c === 'string' ? c : c.props['testID']));
    const find = (node: TestNode): TestNode | undefined =>
      idsOf(node).includes('bar')
        ? node
        : (node.children ?? [])
            .filter((c): c is TestNode => typeof c !== 'string')
            .map(find)
            .find((n) => n !== undefined);
    const ground = find(root);
    expect(ground === undefined ? [] : idsOf(ground)).toStrictEqual(['bar', 'page']);
  });
});
