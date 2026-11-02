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
 * ## The label inside, and the drawn form (F-251)
 *
 * `16` draws its palette's name field with no label row: an outline in `border` at the `sm` corner,
 * 27 dp tall, the person's words at `label`. `labelPlacement="inside"` draws that. The label is still
 * the accessible name, always; it is the placeholder while the field is empty, and nothing else is
 * (ADR-0165 D5: the screen states what the field is for in its own heading and title, so the words a
 * person typed are never the only clue). A hint is refused alongside it — the placeholder is taken.
 *
 * Given `height`, the field is drawn so, and its TOUCH is still the platform's target: the control's
 * box is `max(target, height)` tall, centred on the drawn box by negative margins, so layout takes the
 * drawn height while the input that receives the touch is the target's size (`SearchField`'s drawn
 * form, F-246 — Android delivers no touch outside a view's parent). The outline is drawn under the
 * input and takes no touch. Without `height` the field is the filled one it always was.
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
import { nativeRadius, nativeSpacing, nativeTapTarget, nativeType } from '@irodora/design-tokens';
import { platformTapTarget } from './hitArea.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** Where the label is: a row above the field (the default), or the placeholder inside it (`16`). */
type Placement =
  | {
      readonly labelPlacement?: 'above';
      /**
       * A hint inside the field, shown only while it is empty.
       *
       * Never the label. It is optional precisely because a field is complete without it and is
       * not complete without a label.
       */
      readonly hint?: string;
    }
  | {
      /** `16`'s form: no label row; the label is the placeholder and, always, the accessible name. */
      readonly labelPlacement: 'inside';
      readonly hint?: never;
    };

export type TextFieldProps = Omit<
  TextInputProps,
  | 'style'
  | 'placeholderTextColor'
  | 'accessibilityLabel'
  | 'accessibilityRole'
  | 'role'
  | 'editable'
  | 'multiline'
> &
  Placement & {
    /** Shown above the field (or inside it) AND used as the accessible name. One string, so they agree. */
    readonly label: string;
    readonly value: string;
    readonly onChangeText: (text: string) => void;
    /** The drawn height in dp (`16`: 27). Given, the field takes its drawn, outlined form. */
    readonly height?: number;
    /** The drawn form's corner. Defaults to `md`; `16` draws `sm`. */
    readonly radius?: 'sm' | 'md';
    /** The words' step in the drawn form. Defaults to `body`; `16` sets its name at `label`. */
    readonly size?: 'body' | 'label' | 'caption';
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
  labelPlacement = 'above',
  height,
  radius = 'md',
  size = 'body',
  script = 'latin',
  disabled = false,
  loading = false,
  focused = false,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;
  const inside = labelPlacement === 'inside';
  const placeholder = inside ? label : hint;
  const above = inside ? null : (
    <Text size="caption" color="foreground.2" script={script}>
      {label}
    </Text>
  );

  if (height !== undefined) {
    const touch = Math.max(platformTapTarget(), height);
    const overhang = (touch - height) / 2;
    return (
      <View style={{ gap: nativeSpacing.xs }}>
        {above}
        <View style={{ height: touch, marginVertical: -overhang, justifyContent: 'center' }}>
          {/* The drawn field: its outline, under the input. No touch; focus is its ring. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: overhang,
              height,
              borderRadius: nativeRadius[radius],
              borderWidth: focused ? 2 : 1,
              borderColor: focused ? colors.ring : colors.border,
              opacity: inert ? 0.5 : 1,
            }}
          />
          <TextInput
            accessibilityLabel={label}
            accessibilityState={{ disabled: inert, busy: loading }}
            editable={!inert}
            {...(placeholder === undefined ? {} : { placeholder })}
            // `foreground.2` on the ground the field sits on: the outlined form has no fill of its own.
            placeholderTextColor={colors['foreground.2']}
            value={value}
            onChangeText={onChangeText}
            {...rest}
            style={{
              height: touch,
              minWidth: nativeTapTarget,
              paddingHorizontal: nativeSpacing.sm,
              color: colors.foreground,
              fontSize: nativeType[script][size].fontSize,
              opacity: inert ? 0.5 : 1,
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: nativeSpacing.xs }}>
      {above}
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
        {...(placeholder === undefined ? {} : { placeholder })}
        // `foreground.2` pairs with `surface.2` in the manifest. A hint is text on the
        // field's own ground, so that pairing is the one the contrast gate measures.
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
          fontSize: nativeType[script].body.fontSize,
          // Focus is a RING. On a field whose fill already means "you can type here",
          // changing the fill would give one channel two meanings.
          borderWidth: focused ? 2 : 0,
          ...(focused ? { borderColor: colors.ring } : {}),
          // Every declared state renders differently. A control returning the same tree for
          // default and disabled has defined the state in name only, and the conformance
          // suite rejects exactly that.
          opacity: inert ? 0.5 : 1,
        }}
      />
    </View>
  );
}
