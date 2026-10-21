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
 *
 * ## One toggle at the trailing end, and only when asked for
 *
 * `trailing` puts a glyph toggle inside the field, at its trailing end — the Atlas's bookmark,
 * which reads the bookmarked colours back (F-237, ADR-0135 D1). It is an `IconButton` with
 * `selected`, so on is the glyph filled and an announced state, never a colour. Its box is the tap
 * target, inside the field, and the text stops short of it. Without `trailing` the field renders
 * exactly the tree it rendered before.
 *
 * ## The drawn form (F-246)
 *
 * `05` is the only mockup that draws this field: OUTLINED in `border`, 26.5 dp tall, a search glyph
 * leading its placeholder, the words at `caption`. Given `height`, the field is drawn so — and its
 * TOUCH is still the platform's target. The control's own box is `max(target, height)` tall, centred
 * on the drawn box by negative margins, so layout takes only the drawn height while the input that
 * receives the touch is the target's size. Android does not deliver a touch outside a view's parent,
 * so a hit slop past the drawn field would do nothing; this makes the field itself the target. The
 * outline and the glyph are drawn under the input and take no touch. Without `height` the field is
 * the filled one it always was.
 */

import { TextInput, View, type TextInputProps } from 'react-native';
import { nativeRadius, nativeSpacing, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import { Glyph, type FillableGlyph, type GlyphName } from './Glyph.js';
import { platformTapTarget } from './hitArea.js';
import { IconButton } from './IconButton.js';
import { useTheme } from './theme.js';

/** A glyph toggle at the field's trailing end (F-237): the Atlas's bookmark filter. */
export interface SearchFieldToggle {
  /** A glyph with a filled drawing, because on is that fill (ADR-0135 D2). */
  readonly glyph: FillableGlyph;
  /** What turning it on does — "Show only bookmarked colours" — for a screen reader. */
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

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
  /** A toggle inside the field, at its trailing end. Inert whenever the field is. */
  readonly trailing?: SearchFieldToggle;
  /** The drawn height in dp (`05`: 26.5). Given, the field takes its drawn, outlined form. */
  readonly height?: number;
  /** A glyph leading the words, in the drawn form (`05`: `search`). */
  readonly icon?: GlyphName;
  /** The glyph's size in dp, where the drawing's own is measured. Defaults to the words' size. */
  readonly iconSize?: number;
  /** The words' step in the drawn form. Defaults to `body`. */
  readonly size?: 'body' | 'label' | 'caption';
};

export function SearchField({
  label,
  value,
  onChangeText,
  disabled = false,
  loading = false,
  focused = false,
  trailing,
  height,
  icon,
  iconSize,
  size = 'body',
  ...rest
}: SearchFieldProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;
  // The toggle's box is the platform's tap target, and the field is at least that tall, so its
  // hit area is the box and never reaches past the field: Android does not deliver a touch
  // outside a view's parent.
  const target = platformTapTarget();

  if (height !== undefined) {
    const touch = Math.max(target, height);
    const overhang = (touch - height) / 2;
    const words = nativeType.latin[size].fontSize;
    const glyph = iconSize ?? words;
    const lead =
      icon === undefined ? nativeSpacing.sm : nativeSpacing.sm + glyph + nativeSpacing.xs;
    return (
      <View style={{ height: touch, marginVertical: -overhang, justifyContent: 'center' }}>
        {/* The drawn field: the outline, and the glyph inside it. Under the input; no touch. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: overhang,
            height,
            borderRadius: nativeRadius.md,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? colors.ring : colors.border,
            opacity: inert ? 0.5 : 1,
          }}
        />
        {icon === undefined ? null : (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: nativeSpacing.sm,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            <Glyph name={icon} size={glyph} color={colors['foreground.2']} />
          </View>
        )}
        <TextInput
          accessibilityRole="search"
          accessibilityLabel={label}
          accessibilityState={{ disabled: inert, busy: loading }}
          editable={!inert}
          placeholder={label}
          placeholderTextColor={colors['foreground.2']}
          value={value}
          onChangeText={onChangeText}
          {...rest}
          style={{
            height: touch,
            minWidth: nativeTapTarget,
            paddingLeft: lead,
            paddingRight: trailing === undefined ? nativeSpacing.sm : target,
            color: colors.foreground,
            fontSize: words,
            opacity: inert ? 0.5 : 1,
          }}
        />
        {trailing === undefined ? null : (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: target,
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'box-none',
            }}
          >
            <IconButton
              name={trailing.glyph}
              label={trailing.label}
              selected={trailing.selected}
              onPress={trailing.onPress}
              disabled={inert}
              {...(trailing.testID === undefined ? {} : { testID: trailing.testID })}
            />
          </View>
        )}
      </View>
    );
  }

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
          borderRadius: nativeRadius.md,
          paddingHorizontal: nativeSpacing.sm,
          backgroundColor: colors['surface.2'],
          color: colors.foreground,
          fontSize: nativeType.latin.body.fontSize,
          // Focus is a ring. On a field whose fill already signals "input", changing the fill
          // would be a second meaning for one channel.
          borderWidth: focused ? 2 : 0,
          ...(focused ? { borderColor: colors.ring } : {}),
          opacity: inert ? 0.5 : 1,
          /*
            The text stops where the toggle starts, so a long query never runs under it. And a
            field that holds the toggle is at least the toggle's target tall: on Android that is
            48 dp, past this field's 44, and a target taller than its parent is clipped there.
          */
          ...(trailing === undefined
            ? {}
            : { paddingRight: target, minHeight: Math.max(nativeTapTarget, target) }),
        }}
      />
      {trailing === undefined ? null : (
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: target,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'box-none',
          }}
        >
          <IconButton
            name={trailing.glyph}
            label={trailing.label}
            selected={trailing.selected}
            onPress={trailing.onPress}
            disabled={inert}
            {...(trailing.testID === undefined ? {} : { testID: trailing.testID })}
          />
        </View>
      )}
    </View>
  );
}
