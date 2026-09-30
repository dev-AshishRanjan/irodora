import { Tabs } from 'expo-router';
import { useTheme } from '@irodora/ui';
/*
  THE REGISTRY AND THE BAR ARE CONTENT AND LIVE IN `src/`, not here.

  A route file's first line is `import { Tabs } from 'expo-router'`, and everything a test
  imports from it arrives with a navigator attached. `test/tab-icons.test.tsx` wanted five
  records and got `expo-glass-effect` calling `requireNativeViewManager` at module scope —
  which resolves to a working implementation on Windows and to a `throw` on Linux, so gate 4
  was red on CI for three pushes while the suite passed here (E-099).

  `scripts/a11y-scope.mjs` already states the rule for `src/screens`: the content lives
  outside `app/` precisely so it can be checked. This is the same rule, one directory along.
*/
import { TABS } from '../../src/tabs';
import { AppTabBar } from '../../src/tabBar';

/**
 * The information architecture (F-145, FR-71).
 *
 * ## What this replaces
 *
 * `app/_layout.tsx` was a bare `<Stack>` and `index.tsx` pushed ten routes from a scrolling list
 * of identical secondary buttons. The whole product was push navigation over that list — which is
 * why every screen read as a prototype however correct its contents were, and why `/palettes` and
 * `/compare` were reachable *only* by scrolling past nine other buttons and finding them.
 *
 * Five tabs, and five is not arbitrary: it is the ceiling at which a 44px target stays comfortable
 * across the width of a phone, and it is what
 * [BRAND.md §8](../../../../docs/design/BRAND.md#8-naming-inside-the-product)'s vocabulary divides
 * into. **Every route now has a tab that owns it**, and the secondary screens are pushed within
 * the tab they belong to rather than from the front door.
 *
 * ## The Lens is reachable from everywhere, structurally
 *
 * Criterion 4 asks for that, and the tab bar delivers it by construction rather than by adding a
 * button to nine screens. It sits in the centre because a reading is the product.
 *
 * ## The bar is `01`'s, drawn by our own component (F-234, ADR-0117)
 *
 * `tabBar` hands the whole bar to `AppTabBar`, which draws `@irodora/ui`'s `TabBar`: five glyphs
 * each with its word, evenly pitched inside `01`'s side inset, a one-dp rule across the top, and
 * the indicator on the rule over the active tab. React Navigation's own bar could not draw that
 * faithfully — it wraps the icon slot in its own spacing and label layout.
 *
 * **The words are back**, which reverses F-168. F-168 removed them because five uppercase labels
 * at 0.16 em tracking wrapped on a real phone; `01` sets them in the caption step without either,
 * one line each, and a label that does not fit truncates rather than wraps. The cost is stated in
 * ADR-0117.
 *
 * **The active tab carries three channels** (NFR-9, golden rule 13): the indicator, its word and
 * glyph in `foreground` where the others are `foreground.2`, and `accessibilityState.selected`.
 * Each tab's name, e2e id and glyph come from the registry, not from options set here.
 */
export default function TabLayout(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
