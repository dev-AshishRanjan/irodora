/**
 * A button, with every state a `Pressable` can be in actually rendering differently.
 *
 * ## Why `loading` is a state and not a spinner someone remembers to add
 *
 * A control that is busy but looks identical to one that is ready invites a second tap. On
 * React Native the *visual* half is easy and the half that matters is
 * `accessibilityState.busy`, which is what a screen reader announces. Both are set here, from
 * one prop, so they cannot disagree.
 *
 * ## Tap target
 *
 * `minWidth`/`minHeight` come from `nativeTapTarget` (44). The conformance suite asserts the
 * declared value — it cannot assert the *measured* one, because a JS render tree has no Yoga
 * layout pass. That distinction is stated in ADR-0055 and printed by the gate.
 */

import { Pressable, type PressableProps } from 'react-native';
import { nativeRadius, nativeTapTarget } from '@irodora/design-tokens';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = Omit<PressableProps, 'style' | 'children' | 'disabled'> & {
  /** The visible label. Also the accessible name — one string, so they cannot diverge. */
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  disabled = false,
  loading = false,
  ...rest
}: ButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // Both flags, from the same two props. A visually-disabled control that never says so
      // is invisible to a screen reader, and that is the common half to forget.
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      {...rest}
      style={({ pressed }) => ({
        minWidth: nativeTapTarget,
        minHeight: nativeTapTarget,
        borderRadius: nativeRadius.pill,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // Both pairings are DECLARED in the manifest: inverse pairsWith inverse.foreground,
        // surface.2 pairsWith foreground. A component pairing tokens the manifest does not
        // declare together is a contrast-gate failure, so the choice is not free.
        backgroundColor: variant === 'primary' ? colors.inverse : colors['surface.2'],
        // The border belongs to the OUTLINED variant only. A filled control's boundary is its
        // FILL against the page, not a line — and `border.strong` deliberately does not pair
        // with `inverse` (F-070), because no single colour clears 3:1 against both a
        // near-white and a near-black ground. Drawing it there would have been a pairing the
        // contrast gate now rejects.
        borderWidth: variant === 'secondary' ? 1 : 0,
        ...(variant === 'secondary' ? { borderColor: colors['border.strong'] } : {}),
        // Every declared state renders DIFFERENTLY. A component that returns the same tree
        // for default and disabled has defined the state in name only, and the conformance
        // suite rejects exactly that.
        opacity: inert ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Text size="small" color={variant === 'primary' ? 'inverse.foreground' : 'foreground'}>
        {loading ? `${label}…` : label}
      </Text>
    </Pressable>
  );
}
