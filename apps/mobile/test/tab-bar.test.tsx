/**
 * The app's tab bar: the registry, the adapter, and the route that hands the bar to it.
 *
 * - **Every tab has a glyph, and every glyph belongs to a tab.** The status icon registry has
 *   asserted exactly this since F-003, in both directions, and the reason is in `Icon.tsx`: one
 *   direction alone lets the registry grow names nothing declares, or lets a declared token quietly
 *   lose its glyph. Navigation icons are a SECOND registry, and the rule applies to it again.
 * - **The active glyph is the governing inventory's** (`01`'s `raw.filled`; OQ-47).
 * - **The words are back** (F-234 reverses F-168, ADR-0117), each one line, each the tab's name.
 * - **A press does what React Navigation's own bar does**: `tabPress`, preventable, and a
 *   navigation only to a tab that is not already active and only when nobody prevented it.
 *
 * `01`'s numbers are recomputed by `@irodora/ui`'s own `tab-bar.test`; this file holds the app's
 * half. The route is read as text and never executed (E-099).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { NAV_ICON_NAMES, ThemeProvider } from '@irodora/ui';
import { AppTabBar, tabItems, type NavigatorTabBar } from '../src/tabBar';
import { TABS, TAB_TESTID_PREFIX } from '../src/tabs';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';

describe('the tab bar and the navigation glyphs agree', () => {
  it('every tab names a glyph that exists', () => {
    for (const tab of TABS)
      expect(`${tab.name}: ${String(NAV_ICON_NAMES.includes(tab.icon))}`).toBe(`${tab.name}: true`);
  });

  it('every glyph belongs to a tab', () => {
    // THE DIRECTION THAT IS EASY TO FORGET. Without it the registry accumulates glyphs for
    // screens that were renamed or removed, and nothing says so — the icons simply stop being
    // drawn while continuing to compile.
    const used = new Set(TABS.map((t) => t.icon));
    for (const name of NAV_ICON_NAMES)
      expect(`${name}: ${String(used.has(name))}`).toBe(`${name}: true`);
  });

  it('derives every e2e id from the tab it addresses', () => {
    /*
     * THE INVARIANT A TEMPLATE USED TO HOLD.
     *
     * The route wrote the id as a template on `tab.name`, so it could not drift. It also could not
     * be READ: `generate-e2e-flows.mjs` expands a template only when the prefix and the name list
     * share a file. So the id is a literal the generator can see, and the guarantee is here. Both
     * directions: every id derives from its name, and no two tabs share one.
     */
    for (const tab of TABS)
      expect(`${tab.name}: ${tab.testID}`).toBe(`${tab.name}: ${TAB_TESTID_PREFIX}${tab.name}`);
    expect(new Set(TABS.map((t) => t.testID)).size).toBe(TABS.length);
  });

  it('no two tabs share a glyph', () => {
    // Two tabs with one shape is the failure NFR-9 is about: the shape channel would say nothing.
    expect(new Set(TABS.map((t) => t.icon)).size).toBe(TABS.length);
  });
});

describe('the active glyph is the governing inventory’s (OQ-47)', () => {
  interface Element {
    readonly id: string;
    readonly raw?: Readonly<Record<string, unknown>>;
  }
  const ONE = JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', '01.json'), 'utf8'),
  ) as { readonly elements: readonly Element[] };

  it('fills a glyph exactly where 01 draws it filled', () => {
    for (const tab of TABS) {
      const icon = ONE.elements.find((e) => e.id === `01.tabs.${tab.icon}.icon`);
      expect(icon).toBeDefined();
      const drawn = icon?.raw?.['filled'] === true ? 'filled' : 'outline';
      expect(`${tab.name}: ${tab.activeGlyph}`).toBe(`${tab.name}: ${drawn}`);
    }
  });

  it('DECOY: does not fill every glyph because Home is filled', () => {
    expect(TABS.filter((t) => t.activeGlyph === 'filled').map((t) => t.name)).toStrictEqual([
      'index',
    ]);
  });
});

/** The navigator, as plain objects: what `tabBar` receives, and a record of what the bar did. */
function navigator(index: number, prevent = false) {
  const emitted: { type: string; target: string; canPreventDefault?: true }[] = [];
  const navigated: { name: string; params: object | undefined }[] = [];
  const props: NavigatorTabBar = {
    state: {
      index,
      routes: TABS.map((t) => ({ key: `${t.name}-key`, name: t.name, params: { from: t.name } })),
    },
    navigation: {
      emit: (event) => {
        emitted.push(event);
        return { type: event.type, defaultPrevented: prevent && event.canPreventDefault === true };
      },
      navigate: (name, params) => {
        navigated.push({ name, params });
      },
    },
    insets: { bottom: 34 },
  };
  return { props, emitted, navigated };
}

function drawBar(props: NavigatorTabBar): void {
  render(
    <ThemeProvider theme="dark">
      <AppTabBar {...props} />
    </ThemeProvider>,
  );
}

describe('the words are back, one line each (F-234 reverses F-168)', () => {
  it('the route hands the whole bar to the adapter, and sets no label or icon of its own', () => {
    const source = readFileSync(join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
    expect(source).toContain('tabBar={(props) => <AppTabBar {...props} />}');
    // F-168's switches, and the icon slot React Navigation would have drawn into.
    expect(source).not.toContain('tabBarShowLabel');
    expect(source).not.toContain('tabBarIcon');
  });

  it('draws each tab’s word, on one line, and names the tab by it', () => {
    drawBar(navigator(0).props);
    for (const tab of TABS) {
      const word = en[tab.labelKey];
      const drawn = screen.getByText(word);
      expect(drawn.props['numberOfLines']).toBe(1);
      expect(screen.getByTestId(tab.testID).props['accessibilityLabel']).toBe(word);
    }
  });

  it('reads each word from the locale it is given', () => {
    const routes = TABS.map((t) => ({ key: t.name, name: t.name }));
    expect(tabItems(routes, (k) => ja[k]).map((i) => i.label)).toStrictEqual(
      TABS.map((t) => ja[t.labelKey]),
    );
  });

  it('refuses a route the registry does not know rather than drawing it unnamed', () => {
    expect(() => tabItems([{ key: 'x', name: 'settings' }], (k) => en[k])).toThrow(
      /"settings" has no tab/u,
    );
  });

  it('marks the navigator’s active route as the selected tab', () => {
    drawBar(navigator(2).props);
    for (const tab of TABS)
      expect(screen.getByTestId(tab.testID).props['accessibilityState']).toMatchObject({
        selected: tab.name === 'lens',
      });
  });
});

describe('a press does what React Navigation’s own bar does', () => {
  it('emits tabPress and navigates to a tab that is not active', () => {
    const { props, emitted, navigated } = navigator(0);
    drawBar(props);
    fireEvent.press(screen.getByTestId('tab-atlas'));
    expect(emitted).toStrictEqual([
      { type: 'tabPress', target: 'atlas-key', canPreventDefault: true },
    ]);
    expect(navigated).toStrictEqual([{ name: 'atlas', params: { from: 'atlas' } }]);
  });

  it('emits tabPress for the active tab, and does not navigate', () => {
    // A screen listening for a second press (to scroll to its top) still hears it.
    const { props, emitted, navigated } = navigator(1);
    drawBar(props);
    fireEvent.press(screen.getByTestId('tab-atlas'));
    expect(emitted).toHaveLength(1);
    expect(navigated).toHaveLength(0);
  });

  it('does not navigate when a listener prevented the press', () => {
    const { props, emitted, navigated } = navigator(0, true);
    drawBar(props);
    fireEvent.press(screen.getByTestId('tab-profile'));
    expect(emitted).toHaveLength(1);
    expect(navigated).toHaveLength(0);
  });

  it('emits tabLongPress on a long press, and navigates nowhere', () => {
    const { props, emitted, navigated } = navigator(0);
    drawBar(props);
    fireEvent(screen.getByTestId('tab-wardrobe'), 'longPress');
    expect(emitted).toStrictEqual([{ type: 'tabLongPress', target: 'wardrobe-key' }]);
    expect(navigated).toHaveLength(0);
  });
});
