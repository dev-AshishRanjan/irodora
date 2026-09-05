import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { nativeColors, nativeSpacing, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import { NavIcon, useTheme, type NavIconName } from '@irodora/ui';
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
 * ## Glyphs, and no words (F-168)
 *
 * The bar was typographic (F-145), then a glyph AND a word (F-162), and it is now the glyph
 * alone — because the middle version **wrapped to a second line on a real phone**. Five words at
 * the 10px label step with 0.16em tracking do not fit across a phone width, and a glyph above
 * each one made the lockup taller without making the words narrower.
 *
 * F-162's argument was about information: shape and word are two channels where the bar had one.
 * The failure was about space, and **a channel that overflows is not a channel** — a wrapped
 * label is worse than no label, so space wins.
 *
 * ## The selected tab still carries three channels
 *
 * NFR-9 and golden rule 13. Colour alone would fail, and so would shape alone for somebody not
 * looking: the active tab has a **visible indicator rule**, a **different foreground token**, and
 * **`accessibilityState.selected`**. `Tabs.Screen` sets the last through React Navigation; the
 * first two are drawn here, and the test asserts an inactive tab has neither.
 *
 * **The word is not deleted — it moves.** `tabBarAccessibilityLabel` carries it, so a screen
 * reader announces "Atlas" exactly as it did before. What is genuinely lost is a sighted person
 * who does not recognise a shape, and that is the cost of the decision rather than an argument
 * against it: it is what every navigation bar on a phone does, and it makes the legibility of
 * five hand-drawn glyphs load-bearing rather than merely desirable.
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
 * How big a glyph is when it is the only thing identifying a tab.
 *
 * `NavIcon`'s own default is 20, chosen when a word sat under it and carried the identity. With
 * the word gone the shape is doing all the work, so it grows — and it is a constant here rather
 * than a literal at the call site because it is a decision about this bar rather than about the
 * component.
 */
const TAB_GLYPH = 26;

/**
 * One tab: its glyph and its indicator.
 *
 * Drawn rather than handed to React Navigation as a name, because its own icon slot would take
 * its own typography and colour — and colour that does not come from a token is colour the
 * contrast gate never measured.
 */
function TabGlyph({
  icon,
  focused,
}: {
  readonly icon: NavIconName;
  readonly focused: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: nativeSpacing.xs }}>
      {/*
        THE INDICATOR, and it is a channel rather than a decoration. A rule above the active
        glyph is the second of the three NFR-9 requires; the third is the token below, and the
        first is the `selected` state React Navigation sets.

        It matters MORE now than it did with a label under it: two visual channels are what stop
        this bar from saying "which tab am I on" in colour alone.
      */}
      <View
        style={{
          height: 2,
          width: nativeSpacing.lg,
          backgroundColor: focused ? colors.foreground : 'transparent',
        }}
      />
      <NavIcon
        name={icon}
        size={TAB_GLYPH}
        color={focused ? colors.foreground : colors['foreground.2']}
      />
    </View>
  );
}

export default function TabLayout(): React.JSX.Element {
  const { colors } = useTheme();
  // `script` is gone with the label: the bar draws no type, so nothing on it needs a script.
  const { t } = useMessages();

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
            tabBarIcon: ({ focused }) => <TabGlyph icon={tab.icon} focused={focused} />,
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

/** Exported so the test can assert the bar clears a tap target rather than restating 56. */
export const TAB_BAR_HEIGHT = () => TAB_BAR_BASE;

/** The minimum a tab must be. Re-exported so the assertion reads against one source. */
export const TAB_MINIMUM = nativeTapTarget;

/**
 * The bar's own height, before the device's inset is added.
 *
 * A DESIGN VALUE AND IT STAYS ONE: it is what fits the selected indicator above a 26px glyph
 * without crowding either. Deriving the inset does not derive this, and pretending otherwise
 * would be dressing a chosen number as a measured one.
 *
 * It was 68 while a label sat under the glyph. Losing a line of type loses about twelve points
 * of it, and what is left still clears `nativeTapTarget` comfortably before any inset is added —
 * which the test asserts, because a bar that fits is not the same as a bar you can hit.
 */
const TAB_BAR_BASE = 56;
