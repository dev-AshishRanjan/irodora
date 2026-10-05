/**
 * Mockup 01's tab bar (F-234, criterion 1; ADR-0117).
 *
 * - **Every number is 01's, recomputed** from its inventory, with the values it replaced as decoys
 *   (a 56 dp bar, a 26 dp glyph, a 16 × 2 indicator).
 * - **The active tab carries three channels**: the indicator on the rule, the word and glyph in
 *   `foreground`, and `selected`. The `indicator` treatment reads the first two off the tree, and an
 *   ink change alone is reported.
 * - **A label never wraps**, is drawn and is the name.
 * - **The glyph fills only where the data says** (`activeGlyph`, 01's `raw.filled`; OQ-47).
 * - **The height absorbs the device inset into the drawn space** under the labels.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text as RNText, View } from 'react-native';
import { nativeColors, nativeType, type Theme } from '@irodora/design-tokens';
import {
  TabBar,
  TAB_BELOW,
  TAB_CONTENT,
  TAB_GLYPH,
  TAB_GLYPH_TOP,
  TAB_INDICATOR,
  TAB_LABEL_TOP,
  TAB_RULE,
  TAB_SIDE_INSET,
  tabLabelTop,
  ThemeProvider,
  type Script,
  type TabBarItem,
} from '../src/index.js';
import {
  checkSubject,
  flattenStyle,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

interface Element {
  readonly id: string;
  readonly dp: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly raw?: Readonly<Record<string, number | boolean>>;
}
const ONE = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '01.json'), 'utf8'),
) as { readonly elements: readonly Element[] };
const el = (id: string): Element => {
  const e = ONE.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(id);
  return e;
};
const KEYS = ['home', 'atlas', 'lens', 'wardrobe', 'profile'] as const;
const half = (v: number): number => Math.round(v * 2) / 2;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};

describe('every number is 01’s, recomputed', () => {
  const bar = el('01.tabs');
  const rule = bar.dp.y;
  const labels = KEYS.map((k) => el(`01.tabs.${k}.label`));
  const icons = KEYS.map((k) => el(`01.tabs.${k}.icon`));

  it('the content and the space under it: 41.5 and 35.5 dp, where the bar was 56', () => {
    const labelBottom = Math.max(...labels.map((l) => l.dp.y + l.dp.h));
    expect(labelBottom - rule).toBe(TAB_CONTENT);
    expect(bar.dp.y + bar.dp.h - labelBottom).toBe(TAB_BELOW);
    expect(TAB_CONTENT + TAB_BELOW).toBe(bar.dp.h);
    expect(TAB_CONTENT).not.toBe(56);
    // DECOY: the space under the labels is drawn, not the iPhone's 34 dp inset.
    expect(TAB_BELOW).not.toBe(34);
  });

  it('the side inset the five are evenly pitched in', () => {
    const centres = icons.map((i) => i.dp.x + i.dp.w / 2);
    const pitch = ((centres.at(-1) ?? NaN) - (centres[0] ?? NaN)) / 4;
    expect(Math.round(((centres[0] ?? NaN) - pitch / 2) * 10) / 10).toBe(TAB_SIDE_INSET);
    // DECOY, read off the drawing: five equal fifths of the frame would centre the first at 38.4 dp.
    expect(Math.abs((centres[0] ?? NaN) - bar.dp.w / 10)).toBeGreaterThan(10);
  });

  it('the indicator, and the rule it sits on', () => {
    const indicator = el('01.tabs.indicator');
    expect({ width: indicator.dp.w, height: indicator.dp.h }).toStrictEqual(TAB_INDICATOR);
    expect(TAB_INDICATOR).not.toStrictEqual({ width: 16, height: 2 });
    expect(Number(bar.raw?.['rulePx']) / 2).toBe(TAB_RULE);
  });

  it('the glyph: the median drawn glyph over the grid’s 18-unit live area, where it was 26', () => {
    expect(half(median(icons.map((i) => Math.max(i.dp.w, i.dp.h))) / (18 / 24))).toBe(TAB_GLYPH);
    expect(TAB_GLYPH).not.toBe(26);
  });

  it('where the glyph and the label sit below the rule', () => {
    const glyphCentre = median(icons.map((i) => i.dp.y + i.dp.h / 2)) - rule;
    expect(half(glyphCentre - TAB_GLYPH / 2)).toBe(TAB_GLYPH_TOP);
    const labelCentre = median(labels.map((l) => l.dp.y + l.dp.h / 2)) - rule;
    expect(half(labelCentre - nativeType.latin.caption.lineHeight / 2)).toBe(TAB_LABEL_TOP);
  });

  it('a Japanese label, on its taller line, keeps the Latin label’s centre', () => {
    const centre = (script: Script): number =>
      tabLabelTop(script) + nativeType[script].caption.lineHeight / 2;
    expect(centre('japanese')).toBeCloseTo(centre('latin'), 10);
    // DECOY: the Latin top on a Japanese line would sit the word low by half the extra leading.
    expect(tabLabelTop('japanese')).toBeLessThan(TAB_LABEL_TOP);
    const words = nodes(draw('home', 'dark', 34, 'japanese')).filter((n) => n.type === 'Text');
    for (const w of words)
      expect(flattenStyle(w.props['style'])['lineHeight']).toBe(
        nativeType.japanese.caption.lineHeight,
      );
  });
});

const ITEMS: readonly TabBarItem[] = KEYS.map((key) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  icon: key,
  activeGlyph: key === 'home' ? 'filled' : 'outline',
  testID: `tab-${key}`,
}));

function draw(
  active: string,
  theme: Theme = 'dark',
  bottomInset = 34,
  script: Script = 'latin',
): TestNode {
  const rendered = render(
    <ThemeProvider theme={theme}>
      <TabBar
        items={ITEMS}
        active={active}
        onSelect={() => undefined}
        bottomInset={bottomInset}
        script={script}
        testID="bar"
      />
    </ThemeProvider>,
  );
  const json = rendered.toJSON() as TestNode;
  rendered.unmount();
  return json;
}

function nodes(tree: TestNode): readonly TestNode[] {
  const out: TestNode[] = [tree];
  for (const child of tree.children ?? []) if (typeof child !== 'string') out.push(...nodes(child));
  return out;
}
const tabs = (tree: TestNode): readonly TestNode[] =>
  nodes(tree).filter((n) => n.props['accessibilityRole'] === 'tab');
const painted = (tree: TestNode, prop: string): readonly unknown[] =>
  nodes(tree).map((n) => flattenStyle(n.props['style'])[prop]);

describe('the active tab carries three channels', () => {
  it.each(KEYS)(
    '%s active: its indicator and its word in foreground, the others in foreground.2',
    (key) => {
      const tree = draw(key);
      const dark = nativeColors.dark;
      for (const tab of tabs(tree)) {
        const on = tab.props['accessibilityLabel'] === key.charAt(0).toUpperCase() + key.slice(1);
        expect(tab.props['accessibilityState']).toMatchObject({ selected: on });
        expect(painted(tab, 'backgroundColor').includes(dark.foreground)).toBe(on);
        expect(painted(tab, 'color')).toContain(on ? dark.foreground : dark['foreground.2']);
      }
    },
  );

  it('fills the glyph only where the data says: Home, of 01’s five (OQ-47)', () => {
    const fills = (key: string): number =>
      nodes(draw(key)).filter((n) => n.type === 'RNSVGPath' && n.props['fill'] !== null).length;
    // Home active draws a filled path; Atlas active draws none.
    expect(fills('home')).toBeGreaterThan(0);
    expect(fills('atlas')).toBe(0);
  });

  it('never wraps a label, and the word it draws is its name', () => {
    const tree = draw('lens');
    const words = nodes(tree).filter((n) => n.type === 'Text');
    expect(words).toHaveLength(5);
    for (const w of words) expect(w.props['numberOfLines']).toBe(1);
    expect(tabs(tree).map((t) => t.props['accessibilityLabel'])).toStrictEqual(
      ITEMS.map((i) => i.label),
    );
  });

  it('is a tablist of tabs, and says which was chosen', () => {
    const onSelect = jest.fn();
    const onLongPress = jest.fn();
    render(
      <ThemeProvider theme="dark">
        <TabBar
          items={ITEMS}
          active="home"
          onSelect={onSelect}
          onLongPress={onLongPress}
          bottomInset={0}
          testID="bar"
        />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByTestId('tab-atlas'));
    fireEvent(screen.getByTestId('tab-profile'), 'longPress');
    expect(onSelect).toHaveBeenCalledWith('atlas');
    expect(onLongPress).toHaveBeenCalledWith('profile');
    expect(screen.getByTestId('bar').props['accessibilityRole']).toBe('tablist');
  });
});

describe('the height absorbs the device inset into the drawn space (ADR-0117)', () => {
  it.each([
    [0, TAB_CONTENT + TAB_BELOW],
    [34, TAB_CONTENT + TAB_BELOW],
    [48, TAB_CONTENT + 48],
  ])('with an inset of %s dp the bar is %s dp', (inset, height) => {
    const bar = nodes(draw('home', 'dark', inset)).find((n) => n.props['testID'] === 'bar');
    expect(flattenStyle(bar?.props['style'])['height']).toBe(height);
  });

  it.each([20, 35])(
    'absorbs an inset of %s dp into the drawn space rather than stacking it under the bar',
    (inset) => {
      // A bar that stacked the inset (the shipped 56 + inset) grows here; 01's does not.
      const bar = nodes(draw('home', 'dark', inset)).find((n) => n.props['testID'] === 'bar');
      expect(flattenStyle(bar?.props['style'])['height']).toBe(TAB_CONTENT + TAB_BELOW);
    },
  );
});

describe('the `indicator` treatment reads the picture off the tree', () => {
  const subject = (render_: () => React.JSX.Element): ConformanceSubject => ({
    name: 'Tab',
    kind: 'interactive',
    selectable: true,
    treatment: 'indicator',
    render: (_state, theme) => {
      const rendered = render(<ThemeProvider theme={theme}>{render_()}</ThemeProvider>);
      const json = rendered.toJSON() as TestNode;
      rendered.unmount();
      return json;
    },
  });
  const treatment = (s: ConformanceSubject): number =>
    checkSubject(s, ['dark']).filter((f) => f.rule === 'selection-treatment').length;

  it('passes the tab bar', () => {
    expect(
      treatment(
        subject(() => (
          <TabBar items={ITEMS} active="atlas" onSelect={() => undefined} bottomInset={0} />
        )),
      ),
    ).toBe(0);
  });

  it('DECOY: reports a tab that changes only its ink', () => {
    const dark = nativeColors.dark;
    expect(
      treatment(
        subject(() => (
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }}>
            <View />
            <RNText style={{ color: dark.foreground }}>Atlas</RNText>
          </Pressable>
        )),
      ),
    ).toBe(1);
  });
});
