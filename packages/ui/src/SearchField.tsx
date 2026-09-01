/**
 * A search field.
 *
 * ## The placeholder is not the label
 *
 * A `TextInput` whose only label is its placeholder loses that label the moment somebody types
 * — which is exactly when a screen-reader user most needs to know what the field is. So
 * `accessibilityLabel` is set from the same string, always, and the placeholder is the
 * duplicate rather than the source.
 *
 * ## Why it is here rather than in the Atlas
 *
 * Same reason as `Chip`: an interactive control built inside a screen is checked by nothing.
 * The screen registry checks screens as `static` subjects and this library's registry checks
 * components, and a `TextInput` written into a screen file falls between the two.
 *
 * ## No colour through `className`
 *
 * `placeholderTextColor` and `color` are passed as resolved token values through `style`.
 * Uniwind resolves `className` in Metro and jest never runs Metro, so a field styled that way
 * renders in the test harness with no colours at all and the contrast gate measures an empty
 * set [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 */

import { TextInput, View, type TextInputProps } from 'react-native';
import { nativeRadius, nativeSpacing, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import { useTheme } from './theme.js';

export type SearchFieldProps = Omit<
  TextInputProps,
  'style' | 'placeholderTextColor' | 'accessibilityLabel' | 'editable'
> & {
  /** The accessible name AND the placeholder. One string, so they cannot diverge. */
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly disabled?: boolean;
  /** Results are still being computed. Announced as busy rather than only dimmed. */
  readonly loading?: boolean;
  /** Focused by an external keyboard or Switch Control. */
  readonly focused?: boolean;
};

export function SearchField({
  label,
  value,
  onChangeText,
  disabled = false,
  loading = false,
  focused = false,
  ...rest
}: SearchFieldProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  return (
    <View>
      <TextInput
        accessibilityRole="search"
        accessibilityLabel={label}
        accessibilityState={{ disabled: inert, busy: loading }}
        editable={!inert}
        placeholder={label}
        // `foreground.2` pairs with `surface.2` in the manifest. A placeholder is text on the
        // field's own ground, so the pairing is the one the gate measures.
        placeholderTextColor={colors['foreground.2']}
        value={value}
        onChangeText={onChangeText}
        {...rest}
        style={{
          minWidth: nativeTapTarget,
          minHeight: nativeTapTarget,
          borderRadius: nativeRadius.sm,
          paddingHorizontal: nativeSpacing.md,
          backgroundColor: colors['surface.2'],
          color: colors.foreground,
          fontSize: nativeType.latin.body.fontSize,
          // Focus is a ring. On a field whose fill already signals "input", changing the fill
          // would be a second meaning for one channel.
          borderWidth: focused ? 2 : 0,
          ...(focused ? { borderColor: colors['border.strong'] } : {}),
          opacity: inert ? 0.5 : 1,
        }}
      />
    </View>
  );
}
