/**
 * The navigator's tab bar, drawn by `@irodora/ui`'s `TabBar` (F-234, ADR-0117).
 *
 * ## Why an adapter, and why here
 *
 * `01` draws its five destinations evenly pitched inside a side inset, with the indicator on the
 * rule and a word under each glyph. React Navigation's own bar wraps the icon slot in its own
 * spacing and label layout, so `app/(tabs)/_layout.tsx` hands the whole bar to this through
 * `tabBar`, and `TabBar` draws `01`.
 *
 * It lives in `src/`, not beside the route, for the reason `src/tabs.ts` does: a test that imports
 * a route file boots the navigator, and that is the import that turned gate 4 red on Linux only
 * (E-099). It takes the navigator through {@link NavigatorTabBar}, a structural type, so a test
 * drives it with plain objects and nothing here imports `expo-router` at runtime.
 *
 * ## What it does with a press, which is what React Navigation's own bar does
 *
 * It emits `tabPress`, preventable, and navigates only when the tab was not already active and
 * nobody prevented it — so a screen that listens for a second press (to scroll to its top, say)
 * still hears it. A long press emits `tabLongPress`. That is the documented custom-bar contract.
 */

import { TabBar, type TabBarItem } from '@irodora/ui';
import { useMessages } from './i18n/useMessages';
import { TABS } from './tabs';

/** A route in the navigator's state: what the adapter reads of it. */
export interface NavigatorRoute {
  readonly key: string;
  readonly name: string;
  readonly params?: object | undefined;
}

/**
 * What the adapter reads of React Navigation's `BottomTabBarProps`, and nothing more. The route's
 * `tabBar` passes the navigator's own props, which satisfy it.
 */
export interface NavigatorTabBar {
  readonly state: { readonly index: number; readonly routes: readonly NavigatorRoute[] };
  readonly navigation: {
    readonly emit: (event: {
      readonly type: 'tabPress' | 'tabLongPress';
      readonly target: string;
      readonly canPreventDefault?: true;
    }) => { readonly type: string; readonly defaultPrevented?: boolean };
    readonly navigate: (name: string, params?: object) => void;
  };
  readonly insets: { readonly bottom: number };
}

/**
 * The bar's items, in the registry's order, for the routes the navigator holds.
 *
 * Keyed by the route's KEY, which is what the navigator's events target; named by the registry,
 * which is what a person reads. A route the registry does not know is refused rather than drawn
 * unnamed: every route in `(tabs)` owns a tab (F-145), and a sixth would be a decision.
 */
export function tabItems(
  routes: readonly NavigatorRoute[],
  t: (key: (typeof TABS)[number]['labelKey']) => string,
): readonly TabBarItem[] {
  return routes.map((route) => {
    const tab = TABS.find((x) => x.name === route.name);
    if (tab === undefined) throw new Error(`the route "${route.name}" has no tab in src/tabs.ts`);
    return {
      key: route.key,
      label: t(tab.labelKey),
      icon: tab.icon,
      activeGlyph: tab.activeGlyph,
      testID: tab.testID,
    };
  });
}

export function AppTabBar({ state, navigation, insets }: NavigatorTabBar): React.JSX.Element {
  const { t, script } = useMessages();
  const active = state.routes[state.index]?.key ?? '';
  const routeOf = (key: string): NavigatorRoute | undefined =>
    state.routes.find((r) => r.key === key);
  return (
    <TabBar
      items={tabItems(state.routes, t)}
      active={active}
      script={script}
      bottomInset={insets.bottom}
      onSelect={(key) => {
        const route = routeOf(key);
        if (route === undefined) return;
        const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
        if (key !== active && event.defaultPrevented !== true)
          navigation.navigate(route.name, route.params);
      }}
      onLongPress={(key) => {
        navigation.emit({ type: 'tabLongPress', target: key });
      }}
    />
  );
}
