import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { nativeColors, nativeSpacing, nativeType } from '@irodora/design-tokens';
import { NavIcon, Text, useTheme, type NavIconName } from '@irodora/ui';
import { useMessages } from '../../src/i18n/useMessages';
import type { MessageKey } from '../../src/i18n/index';

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
 * ## Why the bar is typographic
 *
 * `@irodora/ui` has three icons — check, alert, cross — drawn as `View`s because ADR-0057 refuses
 * an icon font. A tab bar needs five more, and inventing an icon language inside a navigation
 * feature is how a product ends up with five icons nobody designed.
 *
 * So the tabs are set in the **`label` step**: 10px, uppercase, 0.16em tracking. That step exists
 * for exactly this, it is the bottom of the scale the editorial direction is built on, and
 * near-monochrome retail apps navigate this way. It is the register rather than a shortcut — and
 * if it reads as unfinished on a device, icons are a later feature and none of this lockup
 * changes.
 *
 * ## The selected tab carries three channels
 *
 * NFR-9 and golden rule 13. Colour alone would fail, and so would weight alone for somebody not
 * looking: the active tab has a **different foreground token**, a **visible indicator rule**, and
 * **`accessibilityState.selected`**. `Tabs.Screen` sets the last one through React Navigation;
 * the first two are drawn here, and `tabs.test.tsx` asserts an inactive tab has neither.
 */

/** The five, in bar order. The Lens is third because the centre is where a thumb rests. */
export const TABS = [
  { name: 'index', labelKey: 'tab.home', icon: 'home' },
  { name: 'atlas', labelKey: 'tab.atlas', icon: 'atlas' },
  { name: 'lens', labelKey: 'tab.lens', icon: 'lens' },
  { name: 'wardrobe', labelKey: 'tab.wardrobe', icon: 'wardrobe' },
  { name: 'profile', labelKey: 'tab.profile', icon: 'profile' },
] as const satisfies readonly {
  readonly name: string;
  readonly labelKey: MessageKey;
  readonly icon: NavIconName;
}[];

/**
 * One tab's label and its indicator.
 *
 * Rendered rather than handed to `tabBarLabel` as a string, because a string would take React
 * Navigation's own typography and colour — and colour that does not come from a token is colour
 * the contrast gate never measured.
 */
function TabLabel({
  label,
  icon,
  focused,
  script,
}: {
  readonly label: string;
  readonly icon: NavIconName;
  readonly focused: boolean;
  readonly script: 'latin' | 'japanese';
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: nativeSpacing.xs }}>
      {/*
        THE INDICATOR, and it is a channel rather than a decoration. A rule above the active
        label is the second of the three NFR-9 requires; the third is the token below, and the
        first is the `selected` state React Navigation sets.
      */}
      <View
        style={{
          height: 2,
          width: nativeSpacing.lg,
          backgroundColor: focused ? colors.foreground : 'transparent',
        }}
      />
      {/*
        THE GLYPH AND THE WORD, not one or the other.

        F-145 made this bar typographic on purpose and the reporter asked for icons. Both is
        strictly better for NFR-9 than either: shape and word are two channels where the bar
        previously had one plus a colour, and the indicator rule above makes three.

        The icon takes the same colour as the label rather than a colour of its own — a glyph
        that changed hue on selection would be adding a fourth channel that says nothing the
        other three do not.
      */}
      <NavIcon name={icon} color={focused ? colors.foreground : colors['foreground.2']} />
      <Text size="label" color={focused ? 'foreground' : 'foreground.2'} script={script}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout(): React.JSX.Element {
  const { colors } = useTheme();
  const { t, script } = useMessages();

  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Every colour on the bar comes from the manifest. React Navigation's defaults are its
        // own blue and its own greys, and neither has ever been measured by the contrast gate.
        tabBarStyle: {
          /*
            NO RULE ABOVE THE BAR. It carried `borderTopWidth: 1` in `border.strong`, which the
            reporter saw as "a white border/outline … in navbar" and called unprofessional.
            `surface.1` already separates the bar from `background` — that is what a tonal
            elevation system is FOR, and ADR-0044's "elevation lifts by tint, never by shadow"
            is the same argument one step along. A line on top of a tint is the system not
            trusting itself.
          */
          backgroundColor: colors['surface.1'],
          /*
            THE INSET IS MEASURED, NOT ASSUMED.

            This read `height: Platform.OS === 'ios' ? 88 : 68` with the comment "iOS adds its
            own safe-area inset below this" — an assumption, and the wrong one twice over. An
            explicit `height` is precisely what stops react-navigation applying the inset
            itself, and Android with gesture navigation has a bottom inset that 68 knows nothing
            about.

            NO `Platform.OS` BRANCH EITHER. The inset already differs per device; branching on
            the platform is guessing at the thing the API reports. `BASE` is what the bar needs
            for an indicator above a label — a design value, chosen — and the inset is what the
            hardware needs, measured.
          */
          height: TAB_BAR_BASE + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: nativeSpacing.sm,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            // The accessible name is set explicitly. Without it a screen reader announces the
            // route segment — "index", "atlas" — which is the file name rather than the word a
            // person reading the bar sees.
            tabBarAccessibilityLabel: t(tab.labelKey),
            /*
              A STABLE ID FOR THE PRIMARY NAVIGATION, and it is not a convenience.

              A flow selects on the text a person sees, which is right almost everywhere and
              impossible here: the Atlas tab reads "Atlas" and the screen behind it is titled
              "Colour Atlas", so a text selector matches two elements and a tap must not
              choose. The alternatives were renaming product copy to suit a test, or letting
              the journey tap something ambiguous. Both are worse than an id.

              Derived from the route name, so it cannot drift from the tab it addresses.
            */
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ focused }) => (
              <TabLabel label={t(tab.labelKey)} icon={tab.icon} focused={focused} script={script} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

/**
 * The bar's own colours, exported so a test can assert against the same values the bar uses.
 *
 * Re-deriving them in the test would let the test and the bar drift apart and still both pass —
 * which is the failure `verify-token-reach` exists to prevent one level down.
 */
export const TAB_BAR_COLORS = nativeColors;
export const TAB_LABEL_STEP = nativeType.latin.label;

/**
 * The bar's own height, before the device's inset is added.
 *
 * A DESIGN VALUE AND IT STAYS ONE: it is what fits the selected indicator above the label
 * without crowding either. Deriving the inset does not derive this, and pretending otherwise
 * would be dressing a chosen number as a measured one.
 */
const TAB_BAR_BASE = 68;
