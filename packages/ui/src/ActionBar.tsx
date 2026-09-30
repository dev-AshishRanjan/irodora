/**
 * The action bar — the one or two actions a screen ends with (F-234, criterion 3; ADR-0118).
 *
 * ## What the mockups draw
 *
 * Fifteen screens draw one, recorded as a `ui:ActionBar` container with its buttons: one action
 * (`10 12 16 17 19 24`) or two (`03 06 07 08 13 20 22 23 26`), side by side or stacked (`22 23`),
 * usually under a rule in `border` and once on `surface.1` (`06`). **One or two, by type**: no mockup
 * draws none or three.
 *
 * ## It keeps the caller's order
 *
 * Every bar with two actions draws its primary first except `20`, which draws *Save* before
 * *Share*. The criterion's "primary first" is a summary of the drawings, and `20` is a drawing
 * (rule 14), so the bar sorts nothing: a screen passes its actions in the order it draws them, and
 * `action-bar.test` holds the inventories to "primary first" with `20` pinned as the exception.
 *
 * ## Where it sits
 *
 * `Screen actionBar` renders it after the scroller, in normal flow, never absolutely: the content
 * ends above it, so it never covers anything. The tab bar is laid out below the whole scene, so the
 * action bar sits above the tab bar, and the device's bottom inset is the tab bar's (R9 §4 E4).
 *
 * ## Numbers
 *
 * Each action carries its own drawn height and corner (`Button`). The bar's padding and gap default
 * to the medians over the full-bleed bars (`08 10 12 13 17`), recomputed by `action-bar.test`; a
 * screen whose drawing differs passes its own.
 */

import { View } from 'react-native';
import { Button, type ButtonProps } from './Button.js';
import type { GlyphName } from './Glyph.js';
import { useTheme } from './theme.js';

/** Above the actions, in dp: the median over the full-bleed bars. */
export const ACTION_BAR_TOP = 17.5;
/** Below the actions, in dp. */
export const ACTION_BAR_BOTTOM = 18.5;
/** Either side, in dp. */
export const ACTION_BAR_SIDE = 18;
/** Between two actions, in dp: the median over the two-action full-bleed bars, to half a dp. */
export const ACTION_BAR_GAP = 8;
/** The rule above the bar, in dp: one dp of `border`, as the app bar's and the tab bar's. */
export const ACTION_BAR_RULE = 1;

/** An action: a labelled button, in any of the forms `Button` draws with a word. */
export type Action = Exclude<ButtonProps, { readonly icon: GlyphName }>;

export interface ActionBarProps {
  /** One or two, in the order the screen draws them. */
  readonly actions: readonly [Action] | readonly [Action, Action];
  /** Side by side, or stacked (`22 23`). */
  readonly layout?: 'row' | 'column';
  /** `06`'s bar is on `surface.1`. */
  readonly fill?: 'surface.1';
  /** A rule above the bar. Most bars draw one; `03`, `16` and `22` do not. */
  readonly rule?: boolean;
  readonly padding?: { readonly top?: number; readonly bottom?: number; readonly side?: number };
  readonly gap?: number;
  readonly testID?: string;
}

export function ActionBar({
  actions,
  layout = 'row',
  fill,
  rule = true,
  padding = {},
  gap = ACTION_BAR_GAP,
  testID,
}: ActionBarProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="toolbar"
      style={{
        flexDirection: layout,
        gap,
        paddingTop: padding.top ?? ACTION_BAR_TOP,
        paddingBottom: padding.bottom ?? ACTION_BAR_BOTTOM,
        paddingHorizontal: padding.side ?? ACTION_BAR_SIDE,
        ...(fill === undefined ? {} : { backgroundColor: colors[fill] }),
        ...(rule ? { borderTopWidth: ACTION_BAR_RULE, borderTopColor: colors.border } : {}),
      }}
    >
      {actions.map((action) => (
        // In a row each action takes an equal share, as every two-action row draws them.
        <View key={action.label} style={layout === 'row' ? { flex: 1 } : {}}>
          <Button {...action} />
        </View>
      ))}
    </View>
  );
}
