/**
 * The tab bar — mockup `01`'s, the only one in the app (C1, P5; F-234, ADR-0117).
 *
 * ## What `01` draws, and what this draws
 *
 * - **Five destinations, each a glyph and a word**, evenly pitched inside a side inset
 *   ({@link TAB_SIDE_INSET}), not five equal fifths of the screen.
 * - **A rule across the top** of the bar, one dp of `border`, on the page's own ground
 *   (`background`), not on a lifted fill.
 * - **The active tab** carries three channels, none of them colour alone: a short bar directly
 *   under the rule over it ({@link TAB_INDICATOR}), its word and glyph in `foreground` where the
 *   others are `foreground.2`, and `accessibilityState.selected`.
 * - **The glyph's shape** is the governing drawing's: `01` draws only Home active, filled. What an
 *   active Atlas, Lens, Wardrobe or Profile tab draws is OQ-47, a person's; until then each keeps the
 *   outline `01` gives it, and the choice is data (`activeGlyph`), not code.
 * - **The height** is the drawn content ({@link TAB_CONTENT}) and the drawn space under the labels
 *   ({@link TAB_BELOW}), which absorbs the device's bottom inset where it fits: on an iPhone the bar
 *   is `01`'s 77 dp exactly (ADR-0117).
 *
 * Every number is read off `01`'s inventory, and `tab-bar.test` recomputes each.
 *
 * ## Presentational, on purpose
 *
 * It takes items, the active key and a callback, and knows nothing about the navigator: the app's
 * adapter maps React Navigation's props onto it, so this is a conformance subject in every palette.
 */

import { Pressable, View } from 'react-native';
import { nativeType } from '@irodora/design-tokens';
import { hitArea } from './hitArea.js';
import { NavIcon, type NavIconName } from './NavIcon.js';
import { FocusRing } from './selection.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** From the rule to the bottom of the labels, in dp (`01`: 611 → 652.5). */
export const TAB_CONTENT = 41.5;

/** The drawn space under the labels, in dp: `01` leaves 35.5 to the frame's edge. */
export const TAB_BELOW = 35.5;

/** The side inset the five items are pitched within, in dp (`01`: centres 68.25 … 315.75). */
export const TAB_SIDE_INSET = 37.3;

/** The rule across the top, in dp: 2 px at 2 px per dp. */
export const TAB_RULE = 1;

/** The active tab's indicator, in dp: `01.tabs.indicator`, directly under the rule. */
export const TAB_INDICATOR = { width: 47.5, height: 2.5 } as const;

/**
 * The glyph's size in dp: the median drawn glyph (18 dp) over the 18-unit live area of the 24-unit
 * grid the set is drawn on (the atlas sphere and the camera span 3 → 21).
 */
export const TAB_GLYPH = 24;

/** The glyph box's top below the rule, in dp: the drawn glyphs' median centre less half the box. */
export const TAB_GLYPH_TOP = 7.5;

/**
 * The label's line box's top below the rule, in dp: the drawn labels' centre less half a Latin
 * caption line. A Japanese line is taller at the same size, so it moves up by half the difference
 * and its centre stays where `01`'s is.
 */
export const TAB_LABEL_TOP = 30;

/** Where the label's line box starts in `script`: its centre held at `01`'s. */
export function tabLabelTop(script: Script): number {
  return (
    TAB_LABEL_TOP +
    (nativeType.latin.caption.lineHeight - nativeType[script].caption.lineHeight) / 2
  );
}

export interface TabBarItem {
  /** The route's key, returned to `onSelect`. */
  readonly key: string;
  /** The word under the glyph, and the tab's accessible name. */
  readonly label: string;
  readonly icon: NavIconName;
  /** The shape the glyph takes when this tab is active: the governing inventory's (OQ-47). */
  readonly activeGlyph: 'filled' | 'outline';
  readonly testID?: string;
}

export interface TabBarProps {
  readonly items: readonly TabBarItem[];
  /** The active item's key. */
  readonly active: string;
  readonly onSelect: (key: string) => void;
  readonly onLongPress?: (key: string) => void;
  /** The device's bottom inset, in dp. The bar grows only by what exceeds {@link TAB_BELOW}. */
  readonly bottomInset: number;
  /** The labels' script, which picks the caption's line height (Japanese leads more). */
  readonly script?: Script;
  /** Focused by a keyboard or Switch Control, drawn as a ring outside the item (E-151). */
  readonly focused?: string;
  readonly testID?: string;
}

export function TabBar({
  items,
  active,
  onSelect,
  onLongPress,
  bottomInset,
  script = 'latin',
  focused,
  testID,
}: TabBarProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        height: TAB_CONTENT + Math.max(TAB_BELOW, bottomInset),
        paddingHorizontal: TAB_SIDE_INSET,
        backgroundColor: colors.background,
        borderTopWidth: TAB_RULE,
        borderTopColor: colors.border,
      }}
    >
      {items.map((item) => {
        const on = item.key === active;
        const ink = on ? colors.foreground : colors['foreground.2'];
        return (
          <Pressable
            key={item.key}
            {...(item.testID === undefined ? {} : { testID: item.testID })}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              onSelect(item.key);
            }}
            {...(onLongPress === undefined
              ? {}
              : {
                  onLongPress: () => {
                    onLongPress(item.key);
                  },
                })}
            // The item is drawn at the bar's content height; the target is in the hit area.
            hitSlop={hitArea(TAB_CONTENT, TAB_CONTENT)}
            style={{
              flex: 1,
              minWidth: TAB_CONTENT,
              minHeight: TAB_CONTENT,
              height: TAB_CONTENT,
              alignItems: 'center',
              overflow: 'visible',
            }}
          >
            {/*
              THE INDICATOR, on the rule over the active tab. Transparent elsewhere rather than
              absent, so the active tab moving changes a colour, not the tree's shape.
            */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}
            >
              <View
                style={{
                  width: TAB_INDICATOR.width,
                  height: TAB_INDICATOR.height,
                  backgroundColor: on ? colors.foreground : 'transparent',
                }}
              />
            </View>
            <View style={{ position: 'absolute', top: TAB_GLYPH_TOP }}>
              <NavIcon
                name={item.icon}
                color={ink}
                size={TAB_GLYPH}
                filled={on && item.activeGlyph === 'filled'}
              />
            </View>
            <View
              style={{
                position: 'absolute',
                top: tabLabelTop(script),
                left: 0,
                right: 0,
                alignItems: 'center',
              }}
            >
              <Text
                size="caption"
                script={script}
                weight={500}
                color={on ? 'foreground' : 'foreground.2'}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
            <FocusRing visible={focused === item.key} radius={0} />
          </Pressable>
        );
      })}
    </View>
  );
}
