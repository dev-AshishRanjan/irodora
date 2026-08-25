/**
 * A single-line text field with a **visible** label.
 *
 * ## Why this is not `SearchField` with a different role
 *
 * `SearchField` announces `accessibilityRole="search"`, and a field where somebody types the
 * name of the palette they are building is not a search. A screen reader that says "search"
 * over a name field is not a cosmetic mismatch — it tells the user the control does something
 * it does not do, and they will use it accordingly.
 *
 * The other half is the label. `SearchField` folds the label into the placeholder, which is
 * right for a search box: the affordance is obvious and the placeholder is a hint. It is
 * wrong here, because **a placeholder disappears the moment somebody types** — and the moment
 * somebody has typed is exactly when "what was this field for?" gets asked. So the label is
 * rendered above the input as well as set as the accessible name, from one string, so the two
 * cannot diverge.
 *
 * ## Why it is here rather than in the screen
 *
 * The same reason as `Chip` and `SearchField`: an interactive control built inside a screen is
 * checked by nothing. The screen registry checks screens as `static` subjects and this
 * library's registry checks components, and a `TextInput` written into a screen file falls
 * between the two — with focus, active, disabled and loading states no suite ever asks it to
 * render differently
 * [[an-interactive-control-inside-a-screen-is-checked-by-nothing]].
 *
 * ## No colour through `className`
 *
 * Every colour is a resolved token passed through `style`. Uniwind resolves `className` in
 * Metro, jest never runs Metro, and a field styled that way renders in the test harness with
 * no colours at all — so the contrast gate measures an empty set and prints a pass
 * [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 */

import { TextInput, View, type TextInputProps } from 'react-native';
import { nativeRadius, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

export type TextFieldProps = Omit<
  TextInputProps,
  | 'style'
  | 'placeholderTextColor'
  | 'accessibilityLabel'
  | 'accessibilityRole'
  | 'role'
  | 'editable'
  | 'multiline'
> & {
  /** Shown above the field AND used as the accessible name. One string, so they agree. */
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  /**
   * A hint inside the field, shown only while it is empty.
   *
   * Never the label. It is optional precisely because a field is complete without it and is
   * not complete without a label.
   */
  readonly hint?: string;
  /** Japanese needs more leading at the same size; the label carries the script through. */
  readonly script?: keyof typeof nativeType;
  readonly disabled?: boolean;
  /** The value is still being written or checked. Announced as busy, not only dimmed. */
  readonly loading?: boolean;
  /** Focused by an external keyboard or Switch Control. */
  readonly focused?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  hint,
  script = 'latin',
  disabled = false,
  loading = false,
  focused = false,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  return (
    <View style={{ gap: 4 }}>
      <Text size="label" color="foreground.2" script={script}>
        {label}
      </Text>
      {/*
        NO ROLE, deliberately. React Native has no role that means "a field you type into" —
        `Role` offers `searchbox` and no `textbox`, and `AccessibilityRole`'s nearest is
        `text`, which means STATIC text and would announce this as something a person cannot
        edit. A bare `TextInput` is typed correctly by iOS and Android on its own, so the
        right value here is none, and the conformance suite knows that by host type rather
        than by an exemption this component could claim for itself.

        Both role props are omitted from `TextFieldProps` for the same reason: what this
        control announces itself as is not a per-call-site decision.
      */}
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: inert, busy: loading }}
        editable={!inert}
        {...(hint === undefined ? {} : { placeholder: hint })}
        // `foreground.2` pairs with `surface.2` in the manifest. A hint is text on the
        // field's own ground, so that pairing is the one the contrast gate measures.
        placeholderTextColor={colors['foreground.2']}
        value={value}
        onChangeText={onChangeText}
        {...rest}
        style={{
          minWidth: nativeTapTarget,
          minHeight: nativeTapTarget,
          borderRadius: nativeRadius.sm,
          paddingHorizontal: 12,
          backgroundColor: colors['surface.2'],
          color: colors.foreground,
          fontSize: nativeType[script].body.fontSize,
          // Focus is a RING. On a field whose fill already means "you can type here",
          // changing the fill would give one channel two meanings.
          borderWidth: focused ? 2 : 0,
          ...(focused ? { borderColor: colors['border.strong'] } : {}),
          // Every declared state renders differently. A control returning the same tree for
          // default and disabled has defined the state in name only, and the conformance
          // suite rejects exactly that.
          opacity: inert ? 0.5 : 1,
        }}
      />
    </View>
  );
}
