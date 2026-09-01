/**
 * A selectable filter chip.
 *
 * ## Why this is a component rather than a `Pressable` on the Atlas
 *
 * It was a `Pressable` on the Atlas first, and the conformance suite caught it: a control built
 * inside a screen is checked by **nothing**. `packages/ui`'s run covers this registry, the
 * app's run covers screens as `static` subjects, and an interactive control living in a screen
 * file falls between them — it has focus, active, disabled and loading states that no suite
 * ever asks it to render differently.
 *
 * ADR-0054 already says every component is either consumed by a real screen or registered, and
 * `a11y-scope.mjs` computes the closure. What it cannot see is a control that was never a
 * component in the first place. So the rule that matters is the converse: **an interactive
 * control belongs in the library, and a screen stays `static`.**
 *
 * ## Selection is never colour alone
 *
 * Golden rule 13. The tick is inside the label rather than beside it, so a screen reader
 * announces the selection as part of the name — and `accessibilityState.selected` carries it
 * again for assistive technology that reads state separately. Two channels plus the fill.
 */

import { Pressable, View, type PressableProps } from 'react-native';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

export type ChipProps = Omit<PressableProps, 'style' | 'children' | 'disabled'> & {
  /** The visible label. Also the accessible name, so the two cannot diverge. */
  readonly label: string;
  readonly selected?: boolean;
  /**
   * Focused by an external keyboard or Switch Control.
   *
   * A distinct state from `selected`: focus is where the cursor is, selection is what was
   * chosen, and a control that renders them identically has one of them in name only.
   */
  readonly focused?: boolean;
  readonly disabled?: boolean;
  /** The result behind this chip is still being computed. Announced as busy, not only dimmed. */
  readonly loading?: boolean;
};

/**
 * The accessible name, assembled here so no call site can forget the selection channel.
 *
 * Exported so the conformance suite can assert its shape rather than re-deriving it.
 */
export function chipAccessibleName(label: string, selected: boolean): string {
  return selected ? `${label} ✓` : label;
}

export function Chip({
  label,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  ...rest
}: ChipProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  // Both pairings are DECLARED in the manifest — inverse pairsWith inverse.foreground,
  // surface.2 pairsWith foreground. Pairing tokens the manifest does not declare together is a
  // contrast-gate failure, so this choice is not free.
  const background = selected ? colors.inverse : colors['surface.2'];
  const foreground = selected ? ('inverse.foreground' as const) : ('foreground.2' as const);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={chipAccessibleName(label, selected)}
      // `selected` twice on purpose: in the name for a reader that announces only the label,
      // and in the state for one that reads state separately.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      {...rest}
      style={{
        // BOTH minimums. A chip is content-width, so a short label — "All", "Warm" — is
        // comfortably under 44px wide without this, and the conformance suite caught exactly
        // that. WCAG 2.2 asks for the target, not for the text.
        minWidth: nativeTapTarget,
        minHeight: nativeTapTarget,
        alignItems: 'center',
        borderRadius: nativeRadius.sm,
        paddingHorizontal: nativeSpacing.md,
        justifyContent: 'center',
        backgroundColor: background,
        // Focus is a RING, not a fill: it has to be visible on a chip that is already
        // selected, and a fill change would be indistinguishable from selection.
        borderWidth: focused ? 2 : 0,
        ...(focused ? { borderColor: colors['border.strong'] } : {}),
        // Every declared state renders differently. A control returning the same tree for
        // default and disabled has defined the state in name only.
        opacity: inert ? 0.5 : 1,
      }}
    >
      <View>
        <Text size="small" color={foreground}>
          {loading
            ? `${chipAccessibleName(label, selected)}…`
            : chipAccessibleName(label, selected)}
        </Text>
      </View>
    </Pressable>
  );
}
