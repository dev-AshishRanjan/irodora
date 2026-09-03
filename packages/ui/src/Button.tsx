/**
 * A button, with every state a pressable can be in actually rendering differently.
 *
 * ## What changed in F-087, and what deliberately did not
 *
 * The behaviour now comes from `heroui-native` ([ADR-0062](../../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)).
 * **The public API did not change** — `label`, `variant`, `disabled`, `loading` — so no screen
 * had to be touched, which is the property that makes the engine swappable at all.
 *
 * ## Colour comes through `style`, never `className`
 *
 * This is the rule, and it is not a stylistic preference. Uniwind resolves `className` in its
 * **Metro** plugin; jest never runs Metro; so a colour routed through a class is **absent from
 * the rendered tree** and the contrast gate measures an empty set while printing a pass
 * [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 *
 * `className` stays correct for everything a gate does not read. Nothing here needs it yet.
 *
 * ## `feedbackVariant="scale"` is a correctness setting
 *
 * HeroUI's default is `scale-highlight`, and the highlight **animates `backgroundColor`**.
 * `motion.animatable` is `opacity` and `transform`, because the intermediate frames of a
 * colour transition are plausible colours the engine never produced — for a product whose
 * claim is "this is what colour that is", that is a correctness defect rather than a polish
 * one. `scale` is a transform, so the press feedback survives; the colour cross-fade does not.
 *
 * ## Why `loading` is a state and not a spinner someone remembers to add
 *
 * A control that is busy but looks identical to one that is ready invites a second tap. The
 * half that matters is `accessibilityState.busy`, which is what a screen reader announces —
 * and HeroUI sets only `disabled`, so the flag is supplied here. Both come from one prop, so
 * they cannot disagree.
 *
 * ## Tap target
 *
 * `minWidth`/`minHeight` come from `nativeTapTarget` (44). The conformance suite asserts the
 * declared value — it cannot assert the *measured* one, because a JS render tree has no Yoga
 * layout pass. That distinction is stated in ADR-0055 and printed by the gate.
 */

import { Button as HeroButton } from 'heroui-native';
import type { PressableProps } from 'react-native';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
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

  // Both pairings are DECLARED in the manifest: inverse pairsWith inverse.foreground,
  // surface.2 pairsWith foreground. A component pairing tokens the manifest does not declare
  // together is a contrast-gate failure, so the choice is not free.
  const background = variant === 'primary' ? colors.inverse : colors['surface.2'];
  const foreground = variant === 'primary' ? colors['inverse.foreground'] : colors.foreground;

  return (
    <HeroButton
      // HeroUI defaults this to 'button' already; stated because the accessible name below
      // only means anything alongside a role, and a default is a thing that can change.
      accessibilityRole="button"
      accessibilityLabel={label}
      // Both flags, from the same two props. HeroUI sets `disabled` and nothing else, so a
      // visually-busy control would be silent to a screen reader without this.
      accessibilityState={{ disabled: inert, busy: loading }}
      isDisabled={inert}
      // Scale is a transform. The default, `scale-highlight`, cross-fades a background colour
      // — see the note above; verify-motion.mjs rejects a component that allows it.
      feedbackVariant="scale"
      {...rest}
      style={{
        minWidth: nativeTapTarget,
        minHeight: nativeTapTarget,
        borderRadius: nativeRadius.pill,
        paddingHorizontal: nativeSpacing.xl,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: background,
        // The border belongs to the OUTLINED variant only. A filled control's boundary is its
        // FILL against the page, not a line — and `border.strong` deliberately does not pair
        // with `inverse` (F-070), because no single colour clears 3:1 against both a
        // near-white and a near-black ground.
        borderWidth: variant === 'secondary' ? 1 : 0,
        ...(variant === 'secondary' ? { borderColor: colors['border.strong'] } : {}),
        // Every declared state renders DIFFERENTLY. A component that returns the same tree for
        // default and disabled has defined the state in name only, and the conformance suite
        // rejects exactly that. Press feedback is HeroUI's scale, which the tree shows as a
        // transform rather than as a style branch.
        opacity: inert ? 0.5 : 1,
      }}
    >
      <HeroButton.Label style={{ color: foreground }}>
        {loading ? `${label}…` : label}
      </HeroButton.Label>
    </HeroButton>
  );
}
