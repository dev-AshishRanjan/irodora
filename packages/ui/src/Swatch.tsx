/**
 * The swatch — the product's atom, and the place accessibility most easily fails.
 *
 * ## Four rules, three of them structural
 *
 * 1. **`radius: 0`, at every size, forever.** Corner radius removes sampled area from exactly
 *    the region the eye uses to judge a large flat colour, and the effect grows as the swatch
 *    shrinks — at 24 px a 10 px radius eats a fifth of the shape. The manifest refuses any
 *    other value at parse time, and this component reads `nativeRadius.swatch` rather than
 *    writing `0`, so the rule has one home.
 * 2. **A `swatch.well` beneath every sample.** Functional, not decorative: simultaneous
 *    contrast means whatever touches a sample changes how it reads.
 * 3. **A TWO-TONE OPAQUE keyline**, so the boundary is perceptible against any SAMPLE — not
 *    against any surface, which is the easier problem. A single line is invisible at its
 *    worst case, and F-068 measured that worst case at 1.00 before fixing it.
 * 4. **Provenance is required.** The prop is a `Color`, not a hex, and a `Color` cannot exist
 *    without provenance ([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)).
 *    A caller cannot render a sample whose origin nobody recorded — not because a reviewer
 *    would object, but because there is no way to construct the argument.
 *
 * ## The accessible name
 *
 * ACCESSIBILITY.md §5: a swatch carries its name, its numeric value **and** its provenance.
 * "swatch" is explicitly forbidden as a name — it is what a screen reader already knows and
 * tells the user nothing. The label is assembled here so no call site can forget a part.
 */

import { Pressable, View } from 'react-native';
import type { Color } from '@irodora/color-core';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

export interface SwatchProps {
  /** The colour's name — never "swatch", never "colour". */
  readonly name: string;
  /** The rendered value. Derived by the engine at the call site, never typed by hand. */
  readonly hex: string;
  /** Carries provenance in its type. This is the ADR-0005 enforcement. */
  readonly color: Color;
  readonly size?: number;
  /** The current choice. Carried by a checkmark as well as a border — never colour alone. */
  readonly selected?: boolean;
  /**
   * Focused by an external keyboard or Switch Control.
   *
   * A distinct state from `selected`: focus is where the cursor is, selection is what was
   * chosen, and a component that renders them identically has one of them in name only.
   */
  readonly focused?: boolean;
  /** Not choosable right now — announced, not only dimmed. */
  readonly disabled?: boolean;
  /** The colour is still being derived. Announced as busy so a screen reader says so. */
  readonly loading?: boolean;
  readonly onPress?: () => void;
}

/**
 * Build the accessible name. Exported so the conformance suite can assert its shape rather
 * than re-deriving it, and so a test can prove it contains all three parts.
 */
export function swatchAccessibleName(name: string, hex: string, color: Color): string {
  const { source, confidence } = color.provenance;
  const percent = Math.round(confidence * 100);
  return `${name}. Hex ${hex.replace('#', '')}. ${source}, ${String(percent)} percent confidence.`;
}

export function Swatch({
  name,
  hex,
  color,
  size = 72,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  onPress,
}: SwatchProps): React.JSX.Element {
  const { colors } = useTheme();
  const label = swatchAccessibleName(name, hex, color);
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // All four announced. A swatch that is merely dimmed is unavailable to a sighted user
      // and indistinguishable from an available one to everybody else.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={{
        // A swatch is a touch target, so it declares the 44px minimum even when the sample
        // itself is drawn smaller. The sample size and the target size are different things.
        minWidth: nativeTapTarget,
        minHeight: nativeTapTarget,
        justifyContent: 'center',
        // The mandatory neutral ground. Not decoration — it is what makes the sample
        // readable next to anything else on the screen.
        backgroundColor: colors['swatch.well'],
        padding: nativeSpacing[1],
        alignItems: 'center',
        gap: nativeSpacing[1],
        // Selection is never colour alone: the checkmark below carries it too. Focus is a
        // DIFFERENT treatment from selection — the ring token exists for exactly this, and
        // rendering them the same would make one of the two a state in name only.
        borderWidth: selected || focused ? 2 : 0,
        borderColor: focused ? colors.ring : colors['border.strong'],
        opacity: inert ? 0.5 : 1,
      }}
    >
      {/*
        THE TWO-TONE KEYLINE (F-068). Two opaque 1px borders, nested.

        A SINGLE line cannot work: the other side of it is an arbitrary garment colour, and a
        single translucent hairline measured 1.00 against its own colour — a black sample on a
        black line, which is not a weak edge but NO EDGE AT ALL. Two translucent tones do not
        rescue it either, because both composite over the same sample and their difference
        compresses to 1.15 against white.

        Opaque and two-tone: scanning the sRGB gamut, the better of the two tones reaches 4.23
        against the worst possible sample, and the tones differ from each other by ~18:1
        whatever sits behind them. Verified in packages/design-tokens/test/swatch-edge.test.ts.
      */}
      <View
        style={{
          padding: 1,
          backgroundColor: colors['swatch.hairline.inverse'],
          borderRadius: nativeRadius.swatch,
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            backgroundColor: hex,
            // radius 0, forever — and it must be 0 on BOTH nested views, or the keyline
            // would round while the sample beneath it did not.
            borderRadius: nativeRadius.swatch,
            borderWidth: 1,
            borderColor: colors['swatch.hairline'],
          }}
        />
      </View>
      <Text size="small" color="foreground">
        {loading ? `${name}…` : selected ? `✓ ${name}` : name}
      </Text>
    </Pressable>
  );
}
