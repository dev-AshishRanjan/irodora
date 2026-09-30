/**
 * The action bar (F-234, criterion 3; ADR-0118).
 *
 * - **Its defaults are the full-bleed bars' medians**, recomputed, with the spacing steps as decoys.
 * - **Primary first, as drawn**: every bar with two actions puts its primary first except `20`, which
 *   is pinned. The bar keeps the caller's order, so this is a claim about the drawings.
 * - **One or two actions, by type.**
 * - **`Screen` puts it after the scroller, in flow**: the content ends above it and it covers
 *   nothing. An absolutely positioned bar is the decoy.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { nativeColors, nativeSpacing } from '@irodora/design-tokens';
import {
  ActionBar,
  ACTION_BAR_BOTTOM,
  ACTION_BAR_GAP,
  ACTION_BAR_RULE,
  ACTION_BAR_SIDE,
  ACTION_BAR_TOP,
  Screen,
  Text,
  ThemeProvider,
  type Action,
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
  readonly tokens?: Readonly<Record<string, string>>;
}
interface Inventory {
  readonly elements: readonly Element[];
}
const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
const inventory = (n: string): Inventory =>
  JSON.parse(readFileSync(join(INVENTORY, `${n}.json`), 'utf8')) as Inventory;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;

/** Every drawn action bar, with its buttons in drawing order (left to right, then top to bottom). */
const BARS = readdirSync(INVENTORY)
  .filter((f) => /^\d\d\.json$/u.test(f))
  .flatMap((f) => {
    const j = inventory(f.slice(0, 2));
    return j.elements
      .filter((e) => e.component === 'ui:ActionBar')
      .map((bar) => ({
        bar,
        buttons: j.elements
          .filter((e) => e.parent === bar.id && e.component === 'ui:Button')
          .sort((a, b) => (Math.abs(a.dp.y - b.dp.y) > 8 ? a.dp.y - b.dp.y : a.dp.x - b.dp.x)),
      }));
  });

describe('the defaults are the full-bleed bars’ medians (08 10 12 13 17)', () => {
  const FULL_BLEED = new Set(['08', '10', '12', '13', '17']);
  const drawn = BARS.filter(({ bar }) => FULL_BLEED.has(bar.id.slice(0, 2)));

  it('reads five bars', () => {
    expect(drawn).toHaveLength(5);
  });

  it('above, below and beside the actions', () => {
    const top = drawn.map(({ bar, buttons }) => Math.min(...buttons.map((b) => b.dp.y)) - bar.dp.y);
    const bottom = drawn.map(
      ({ bar, buttons }) => bar.dp.y + bar.dp.h - Math.max(...buttons.map((b) => b.dp.y + b.dp.h)),
    );
    const side = drawn.map(
      ({ bar, buttons }) => Math.min(...buttons.map((b) => b.dp.x)) - bar.dp.x,
    );
    expect(median(top)).toBe(ACTION_BAR_TOP);
    expect(median(bottom)).toBe(ACTION_BAR_BOTTOM);
    expect(median(side)).toBe(ACTION_BAR_SIDE);
    // DECOY: the spacing steps a bar would take if nobody had measured one.
    expect([ACTION_BAR_TOP, ACTION_BAR_BOTTOM, ACTION_BAR_SIDE]).not.toContain(nativeSpacing.md);
    expect([ACTION_BAR_TOP, ACTION_BAR_BOTTOM, ACTION_BAR_SIDE]).not.toContain(nativeSpacing.lg);
  });

  it('between two actions, to half a dp', () => {
    const gaps = drawn
      .filter(({ buttons }) => buttons.length === 2)
      .map(({ buttons: [a, b] }) =>
        a === undefined || b === undefined ? NaN : b.dp.x - (a.dp.x + a.dp.w),
      );
    expect(gaps).toHaveLength(2);
    expect(half(median(gaps))).toBe(ACTION_BAR_GAP);
  });
});

describe('primary first, as every bar draws it but 20', () => {
  const primary = (e: Element | undefined): boolean => e?.tokens?.['bg'] === 'action.primary';
  const pairs = BARS.filter(({ buttons }) => buttons.length === 2);

  it('holds on every two-action bar except 20', () => {
    const late = pairs.filter(({ buttons }) => !primary(buttons[0])).map(({ bar }) => bar.id);
    expect(late).toStrictEqual(['20.actions']);
    expect(pairs.length).toBeGreaterThanOrEqual(9);
  });

  it('DECOY: 20 really does draw its primary second, so the exception is a drawing', () => {
    const twenty = pairs.find(({ bar }) => bar.id === '20.actions');
    expect(primary(twenty?.buttons[1])).toBe(true);
  });

  it('keeps the caller’s order rather than sorting it', () => {
    render(
      <ThemeProvider theme="dark">
        <ActionBar
          actions={[
            { variant: 'tonal', level: 2, label: 'Save as PDF', testID: 'save' },
            { label: 'Share', testID: 'share' },
          ]}
        />
      </ThemeProvider>,
    );
    const labels = screen.getAllByRole('button').map((b): unknown => b.props['accessibilityLabel']);
    expect(labels).toStrictEqual(['Save as PDF', 'Share']);
  });
});

describe('one or two actions, by type', () => {
  it('refuses none and three', () => {
    const a: Action = { label: 'Save' };
    // @ts-expect-error — no mockup draws an empty action bar.
    const none = <ActionBar actions={[]} />;
    // @ts-expect-error — no mockup draws three actions.
    const three = <ActionBar actions={[a, a, a]} />;
    // DECOY: one and two compile.
    const fine = [<ActionBar key="1" actions={[a]} />, <ActionBar key="2" actions={[a, a]} />];
    expect([none, three, ...fine]).toHaveLength(4);
  });
});

describe('what it draws', () => {
  const draw = (node: React.JSX.Element): TestNode =>
    render(<ThemeProvider theme="dark">{node}</ThemeProvider>).toJSON() as TestNode;
  const find = (node: TestNode, id: string): TestNode | undefined =>
    node.props['testID'] === id
      ? node
      : (node.children ?? [])
          .filter((c): c is TestNode => typeof c !== 'string')
          .map((c) => find(c, id))
          .find((n) => n !== undefined);

  it('a rule in border above it, and 06’s fill', () => {
    const tree = draw(<ActionBar actions={[{ label: 'Wear' }]} fill="surface.1" testID="bar" />);
    const style = flattenStyle(find(tree, 'bar')?.props['style']);
    expect(style['borderTopWidth']).toBe(ACTION_BAR_RULE);
    expect(style['borderTopColor']).toBe(nativeColors.dark.border);
    expect(style['backgroundColor']).toBe(nativeColors.dark['surface.1']);
  });

  it('two actions share a row equally, and a column stacks them', () => {
    const shares = (layout: 'row' | 'column'): readonly unknown[] => {
      const bar = find(
        draw(<ActionBar actions={[{ label: 'A' }, { label: 'B' }]} layout={layout} testID="bar" />),
        'bar',
      );
      return (bar?.children ?? []).map((c) =>
        typeof c === 'string' ? undefined : flattenStyle(c.props['style'])['flex'],
      );
    };
    expect(shares('row')).toStrictEqual([1, 1]);
    expect(shares('column')).toStrictEqual([undefined, undefined]);
  });
});

describe('Screen puts it after the scroller, in flow (ADR-0118)', () => {
  const tree = (): TestNode =>
    render(
      <ThemeProvider theme="dark">
        <Screen testID="page" actionBar={{ actions: [{ label: 'Save' }], testID: 'bar' }}>
          <Text size="body" color="foreground">
            Ai-nezumi
          </Text>
        </Screen>
      </ThemeProvider>,
    ).toJSON() as TestNode;

  /** The node holding `id` among its children, and the ids of those children in order. */
  const holder = (node: TestNode, id: string): readonly unknown[] | undefined => {
    const ids = (node.children ?? []).map((c) => (typeof c === 'string' ? c : c.props['testID']));
    if (ids.includes(id)) return ids;
    for (const c of node.children ?? []) {
      if (typeof c === 'string') continue;
      const found = holder(c, id);
      if (found !== undefined) return found;
    }
    return undefined;
  };

  /** Whether a bar is drawn over the content: positioned out of flow. */
  const covers = (node: TestNode | undefined): boolean =>
    flattenStyle(node?.props['style'])['position'] === 'absolute';

  it('is the next sibling after the scroller', () => {
    expect(holder(tree(), 'bar')).toStrictEqual(['page', 'bar']);
  });

  it('is never positioned over the content', () => {
    const find = (node: TestNode): TestNode | undefined =>
      node.props['testID'] === 'bar'
        ? node
        : (node.children ?? [])
            .filter((c): c is TestNode => typeof c !== 'string')
            .map(find)
            .find((n) => n !== undefined);
    expect(covers(find(tree()))).toBe(false);
    // DECOY: the shape that would cover the end of the content is reported.
    expect(
      covers({
        type: 'View',
        props: { style: { position: 'absolute', bottom: 0 } },
        children: null,
      }),
    ).toBe(true);
  });
});
