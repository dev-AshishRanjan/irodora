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
 * ## Depth is tint, with one drawn exception
 *
 * Elevation lifts by TINT, because a shadow tints what it surrounds (ADR-0044). `level` is the
 * existing elevation scale, so a card gets its depth from the same three tokens every other
 * surface does — and in the dark themes that is all it gets.
 *
 * Mockup `25` draws its LIGHT cards with a soft downward shadow, so ADR-0103 allows exactly that
 * one: {@link elevationShadow} returns a style for light level 1 and `{}` everywhere else, and the
 * manifest parser refuses a shadow on any other mode or level. This component chooses nothing.
 *
 * ## A pressable card is ONE target
 *
 * Not a card containing a button. Nested pressables are announced twice by a screen reader and
 * the outer one usually wins the touch, which is the defect that looks like a card whose button
 * does not work. When `onPress` is given, the whole card is the control and carries the name.
 *
 * ## Drawn as the mockups draw it (F-233)
 *
 * - **The corner is `md`** unless a surface binds another: 56 of the 87 cards the inventories
 *   record, against 21 `sm` and 4 `lg` ({@link CARD_RADIUS}, recomputed by `cards.test`).
 * - **A level-1 card carries a resting edge**, one dp of `border` (the README's `border.subtle`):
 *   73 of the 80 filled cards bind it, in both palettes, and it measures 2 px wide at 2 px per dp
 *   on `01`'s hero. Board `00` draws none on levels 2 and 3, so they carry none. It is drawn over
 *   the card's outer edge, where the state edge is reserved, and only at rest: a chosen or focused
 *   card draws its state there instead.
 * - **Media can be inset**: `11` and `22` draw their photographs inside the card, 7.25 and 6.6 dp
 *   in, cornered `sm` on `11`. Each surface passes what it draws; the default is edge to edge.
 *
 * ## Selection is F-176's, and cannot be otherwise
 *
 * `selected` and `focused` draw {@link selectionTone}. A card that invented its own would be the
 * fourth answer to a question that now has one, and the conformance rule reads the treatment out
 * of the rendered tree rather than out of an import.
 */

import { Pressable, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  nativeElevation,
  nativeRadius,
  nativeSpacing,
  nativeTapTarget,
} from '@irodora/design-tokens';
import { elevationShadow } from './elevation.js';
import { usePress } from './motion.js';
import { SELECTION_EDGE, SelectionMark, selectionStyle, selectionTone } from './selection.js';
import { useTheme, type ThemeColors } from './theme.js';
import type { SpacingStep } from './layout.js';

/** The elevation levels the manifest declares, as a union derived from it. */
export type CardLevel = keyof typeof nativeElevation;

/** The corner a card takes when a caller names none: the step most drawn cards are bound to. */
export const CARD_RADIUS = 'md' satisfies keyof typeof nativeRadius;

/** The resting edge's width, in dp: one, as measured on `01`'s hero (2 px at 2 px per dp). */
export const CARD_EDGE = 1;

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
  /** How far inside the card the media sits, in dp: `11` draws 7.25, `22` 6.6. Edge to edge by default. */
  readonly mediaInset?: number;
  /** The media's own corner, where the surface draws one (`11`: `sm`). */
  readonly mediaRadius?: keyof typeof nativeRadius;
  readonly level?: CardLevel;
  /**
   * Whether the card carries its resting edge. By default a level-1 card does and a level-2 or
   * level-3 card does not, as the mockups draw them; a surface whose mockup draws a level-1 card
   * without one (`02`'s reading, `26`) says so here.
   */
  readonly edge?: boolean;
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

/**
 * A `Pressable` that can carry an animated style. Built once at module scope —
 * `createAnimatedComponent` returns a new component type per call, so building it in a render
 * would remount the card every frame.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The hairline between a slot and the body. One device pixel, from the `border` token. */
function Rule({ color }: { readonly color: string }): React.JSX.Element {
  return <View style={{ height: 1, backgroundColor: color }} />;
}

export function Card({
  children,
  header,
  footer,
  media,
  mediaInset,
  mediaRadius,
  level = '1',
  edge = level === '1',
  padding = 'md',
  radius = CARD_RADIUS,
  onPress,
  label,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  testID,
}: CardProps): React.JSX.Element {
  const { colors, mode } = useTheme();
  const token = nativeElevation[level] as keyof ThemeColors;
  const tone = selectionTone({ selected, focused }, colors);
  // The press response (F-189). Only a pressable card has one; a static card is not a control.
  const press = usePress();
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
    // Tint is the depth (ADR-0044); this is the one drawn exception — 25 light cards (ADR-0103).
    ...elevationShadow(mode, level, colors),
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
      {media === undefined ? null : mediaInset === undefined && mediaRadius === undefined ? (
        <View>{media}</View>
      ) : (
        <View
          style={
            mediaInset === undefined
              ? {}
              : { paddingTop: mediaInset, paddingLeft: mediaInset, paddingRight: mediaInset }
          }
        >
          <View
            style={{
              borderRadius: mediaRadius === undefined ? 0 : nativeRadius[mediaRadius],
              overflow: 'hidden',
            }}
          >
            {media}
          </View>
        </View>
      )}
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
      {/*
        THE RESTING EDGE, last so nothing inside covers it, and over the card's OUTER edge: the
        state edge is reserved there (F-176), so the line sits in it rather than inside it. Only at
        rest — a chosen or focused card draws its state in that place instead.
      */}
      {edge && tone.borderColor === 'transparent' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -SELECTION_EDGE,
            right: -SELECTION_EDGE,
            bottom: -SELECTION_EDGE,
            left: -SELECTION_EDGE,
            borderRadius: nativeRadius[radius],
            borderWidth: CARD_EDGE,
            borderColor: colors.border,
          }}
        />
      ) : null}
    </>
  );

  if (onPress === undefined)
    return (
      <View testID={testID} style={shell}>
        {body}
      </View>
    );

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      {...(label === undefined ? {} : { accessibilityLabel: label })}
      // All three announced. A card that is merely dimmed is unavailable to a sighted user and
      // indistinguishable from an available one to everybody else.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[press.style, shell]}
    >
      {body}
    </AnimatedPressable>
  );
}
