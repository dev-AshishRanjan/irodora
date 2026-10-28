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
 *
 * ## The bare form, and its clear (F-250)
 *
 * `09` draws the field neither filled nor outlined: its words sit on the card that holds it, and a
 * disc with a cross cut through it (`close-circle`) ends the line while the field holds text. `bare`
 * draws that. The field takes its words' line in layout and the platform's target in touch, by the
 * drawn form's negative margins. `clear` is an action, not a toggle — it has no `selected` — and it
 * is drawn only while there is something to clear (Apple's search-field convention: the cancel button
 * is hidden while the field is empty). It is drawn at its size at the field's trailing edge; its
 * target is centred on it, and the field's box reaches past that edge by the difference, so the target
 * is inside the field (Android delivers no touch outside a view's parent). The type refuses `clear`
 * with `trailing`: one control ends the line.
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

/** The field's clear (F-250): empties the words; drawn only while there are words to empty. */
export interface SearchFieldClear {
  /** What it does — "Clear the search text" — for a screen reader. */
  readonly label: string;
  readonly onPress: () => void;
  /** The glyph's size in dp, where the drawing's own is measured. Defaults to the words' size. */
  readonly size?: number;
  readonly testID?: string;
}

/** One control at the trailing end: the toggle, or the clear. */
type SearchFieldEnd =
  | { readonly trailing?: SearchFieldToggle; readonly clear?: never }
  | { readonly clear?: SearchFieldClear; readonly trailing?: never };

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
  /** `09`'s form: no fill and no outline, the words on the card the field sits in. */
  readonly bare?: true;
  /**
   * In the bare form, the room ABOVE the words' line its parent gives the touch box, in dp; the rest of
   * the platform's target is taken below (F-250's review, S2). Android delivers no touch outside a
   * view's parent, so a field sitting at its card's inset cannot take half its target above its words.
   * Without it the target is centred on the line.
   */
  readonly touchAbove?: number;
  /** The drawn height in dp (`05`: 26.5). Given, the field takes its drawn, outlined form. */
  readonly height?: number;
  /** A glyph leading the words, in the drawn form (`05`: `search`). */
  readonly icon?: GlyphName;
  /** The glyph's size in dp, where the drawing's own is measured. Defaults to the words' size. */
  readonly iconSize?: number;
  /** The words' step in the drawn and the bare form. Defaults to `body`. */
  readonly size?: 'body' | 'label' | 'caption';
} & SearchFieldEnd;

export function SearchField({
  label,
  value,
  onChangeText,
  disabled = false,
  loading = false,
  focused = false,
  trailing,
  clear,
  bare,
  touchAbove,
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

  if (bare === true) {
    const words = nativeType.latin[size];
    const line = height ?? words.lineHeight;
    const touch = Math.max(target, line);
    const spare = touch - line;
    // Above the line: the room the parent gives, never more than half; the rest below.
    const above = Math.min(spare / 2, touchAbove ?? spare / 2);
    const below = spare - above;
    const glyph = clear?.size ?? words.fontSize;
    // The field's box reaches past its drawn end by what the clear's target overhangs its glyph.
    const reach = clear === undefined ? 0 : Math.max(0, (target - glyph) / 2);
    return (
      <View
        style={{
          height: touch,
          marginTop: -above,
          marginBottom: -below,
          marginRight: -reach,
          justifyContent: 'center',
        }}
      >
        {/* Focus is a ring, drawn round the words' line and taking no touch. */}
        {focused ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: reach,
              top: above,
              height: line,
              borderRadius: nativeRadius.md,
              borderWidth: 2,
              borderColor: colors.ring,
            }}
          />
        ) : null}
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
            // The words sit on their line, wherever the target's spare lies around it.
            paddingTop: above,
            paddingBottom: below,
            paddingLeft: 0,
            // The words stop where the clear's target starts, so a long query never runs under it.
            paddingRight: clear === undefined ? 0 : target,
            color: colors.foreground,
            fontSize: words.fontSize,
            opacity: inert ? 0.5 : 1,
          }}
        />
        {clear === undefined || value === '' ? null : (
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
              name="close-circle"
              label={clear.label}
              color="foreground.2"
              size={glyph}
              onPress={clear.onPress}
              disabled={inert}
              {...(clear.testID === undefined ? {} : { testID: clear.testID })}
            />
          </View>
        )}
      </View>
    );
  }

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
