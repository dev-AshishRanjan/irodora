/**
 * A card — the shape this product has been drawing 48 times with a padded box.
 *
 * ## What was there, measured
 *
 * `<Surface>` appears **48 times across the screens, every single one at `level="1"`**. That is
 * the whole card vocabulary: one tint, one radius, one padding. Reported as *"All the card ui/ux
 * and design system is also not good, very unprofessional"*, and the measurement says exactly
 * why — there is no vocabulary to be unprofessional *with*.
 *
 * ## This is NOT a HeroUI wrapper, and the rule decided it rather than taste
 *
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md): *"Wrap HeroUI
 * when there is BEHAVIOUR to inherit. Do not wrap it for provenance."*
 *
 * HeroUI ships a `Card`, and **it is `Surface` plus six layout sub-components** — its
 * `CardRoot` renders `<Surface>` and its header, body, footer, title and description are styled
 * `View`s and `Text`s. The layout is trivial; the behaviour is nil.
 *
 * And `Surface` is the one component that rule names outright: it renders an optional
 * background layer through `ThemeBackground` / `GlassView` — **a blur**. A blur tints what it
 * surrounds, which is the simultaneous-contrast hazard `swatch.well` exists to prevent, and
 * adopting it would mean permanently carrying a code path that must never run beside a colour
 * sample. So this sits on ours, which already refuses it.
 *
 * ## Why slots rather than children alone
 *
 * A card whose header is *"the first child"* cannot guarantee anything about it: the rule
 * separating header from body has nowhere to live, and a caller who forgets the order gets a
 * card that looks like a card and is structured like a stack.
 *
 * `media` is the slot that earns the component outright. **It is edge to edge**, which means it
 * has to escape the padding — and escaping the padding is the one thing a padded box cannot
 * express. That is why 48 surfaces never became cards: a photograph inside `Surface` is inset
 * by `nativeSpacing`, and a photograph inset by 16px is a thumbnail with a frame.
 *
 * ## Depth is tint, never shadow
 *
 * The manifest refuses a shadow at parse time and ADR-0044 states why: elevation lifts by tint,
 * because a shadow tints what it surrounds. `level` is the existing elevation scale, so a card
 * gets its depth from the same three tokens every other surface does.
 *
 * ## A pressable card is ONE target
 *
 * Not a card containing a button. Nested pressables are announced twice by a screen reader and
 * the outer one usually wins the touch, which is the defect that looks like a card whose button
 * does not work. When `onPress` is given, the whole card is the control and carries the name.
 *
 * ## Selection is F-176's, and cannot be otherwise
 *
 * `selected` and `focused` draw {@link selectionTone}. A card that invented its own would be the
 * fourth answer to a question that now has one, and the conformance rule reads the treatment out
 * of the rendered tree rather than out of an import.
 */

import { Pressable, View, type ViewStyle } from 'react-native';
import {
  nativeElevation,
  nativeRadius,
  nativeSpacing,
  nativeTapTarget,
} from '@irodora/design-tokens';
import { SelectionMark, selectionStyle, selectionTone } from './selection.js';
import { useTheme, type ThemeColors } from './theme.js';
import type { SpacingStep } from './layout.js';

/** The elevation levels the manifest declares, as a union derived from it. */
export type CardLevel = keyof typeof nativeElevation;

export interface CardProps {
  readonly children?: React.ReactNode;
  /**
   * Above the body, separated by a hairline.
   *
   * A node rather than a string, because a card's header is routinely a title AND something
   * else — a value, a count, a state. Constraining it to text would push every one of those
   * into the body, which is the flattening this component exists to undo.
   */
  readonly header?: React.ReactNode;
  /** Below the body, separated by a hairline. Actions, provenance, a footnote. */
  readonly footer?: React.ReactNode;
  /**
   * Edge to edge, above everything.
   *
   * **The slot that earns this component.** A photograph inside a padded box is inset, and a
   * photograph inset by 16px is a thumbnail with a frame. Escaping the padding is the one thing
   * `Surface` cannot express, and it is why 48 surfaces never became cards.
   */
  readonly media?: React.ReactNode;
  readonly level?: CardLevel;
  readonly padding?: SpacingStep;
  readonly radius?: keyof typeof nativeRadius;
  /** Makes the WHOLE card the control. Requires {@link label}. */
  readonly onPress?: () => void;
  /**
   * The accessible name, required when the card is pressable.
   *
   * A pressable card with no name is announced as an unnamed button, which is indistinguishable
   * from a bug. The type does not enforce the pairing — a discriminated union here would make
   * every non-pressable call site carry a discriminant — so the component states it and the
   * conformance suite's `no-name` rule catches an omission.
   */
  readonly label?: string;
  readonly selected?: boolean;
  readonly focused?: boolean;
  readonly disabled?: boolean;
  /**
   * The card's content is still being computed. Announced as busy, not only dimmed.
   *
   * A real state rather than a completeness exercise: a combination card exists before its
   * harmony does. The conformance suite asked for it — an `interactive` subject renders every
   * declared state, and a card that returned the same tree for `loading` as for `default`
   * would have the state in name only.
   */
  readonly loading?: boolean;
  readonly testID?: string;
}

/** The hairline between a slot and the body. One device pixel, from the `border` token. */
function Rule({ color }: { readonly color: string }): React.JSX.Element {
  return <View style={{ height: 1, backgroundColor: color }} />;
}

export function Card({
  children,
  header,
  footer,
  media,
  level = '1',
  padding = 'lg',
  radius = 'lg',
  onPress,
  label,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  testID,
}: CardProps): React.JSX.Element {
  const { colors } = useTheme();
  const token = nativeElevation[level] as keyof ThemeColors;
  const tone = selectionTone({ selected, focused }, colors);
  const inset = nativeSpacing[padding];
  const inert = disabled || loading;

  /*
   * THE GROUND, THEN THE STATE. `selectionStyle` paints a background only when the card is
   * chosen, so the elevation tint below it is what a resting card shows — and the two are
   * ordered rather than merged, because a card that lost its elevation when selected would be
   * changing two things to say one.
   */
  const shell: ViewStyle = {
    backgroundColor: colors[token],
    borderRadius: nativeRadius[radius],
    // `overflow: hidden` is what makes MEDIA edge-to-edge possible: without it a photograph
    // squares off the corners it is supposed to follow.
    overflow: 'hidden',
    ...selectionStyle(tone),
    opacity: inert ? 0.5 : 1,
    /*
     * BOTH MINIMUMS, and the suite is why. It requires `minWidth` AND `minHeight` — WCAG 2.2
     * asks for the target, not for the content, and a card is only reliably wide in a layout
     * that happens to stretch it. The first draft declared the height alone and was reported
     * ten times, once per state per theme.
     */
    ...(onPress === undefined ? {} : { minWidth: nativeTapTarget, minHeight: nativeTapTarget }),
  };

  const body = (
    <>
      {/* Outside the padding, deliberately. See the docblock. */}
      {media === undefined ? null : <View>{media}</View>}
      <SelectionMark visible={tone.mark} />
      {header === undefined ? null : (
        <>
          <View style={{ padding: inset }}>{header}</View>
          <Rule color={colors.border} />
        </>
      )}
      {children === undefined ? null : <View style={{ padding: inset }}>{children}</View>}
      {footer === undefined ? null : (
        <>
          <Rule color={colors.border} />
          <View style={{ padding: inset }}>{footer}</View>
        </>
      )}
    </>
  );

  if (onPress === undefined)
    return (
      <View testID={testID} style={shell}>
        {body}
      </View>
    );

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      {...(label === undefined ? {} : { accessibilityLabel: label })}
      // All three announced. A card that is merely dimmed is unavailable to a sighted user and
      // indistinguishable from an available one to everybody else.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={shell}
    >
      {body}
    </Pressable>
  );
}
