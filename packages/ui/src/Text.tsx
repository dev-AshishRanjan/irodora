/**
 * Text, with the one pairing that fails AA made **unwritable**.
 *
 * ## The constraint
 *
 * `foreground.3` is `usage: "largeText"` — it fails AA against every surface below the WCAG
 * large-text floor. That restriction was *claimed* to be gate-enforced from F-003 while
 * `foreground.3` appeared in no `pairsWith` list, so nothing checked it at all; F-003 fixed
 * the token half. The remaining half is catching a 13 px label that uses it, and a gate can
 * only catch that after it is written.
 *
 * So it is a **type error** instead:
 *
 * ```tsx
 * <Text size="title" color="foreground.3" />   // fine — 22px, above the floor
 * <Text size="small" color="foreground.3" />   // does not compile
 * ```
 *
 * Both halves are derived from the manifest — `LARGE_TEXT_TOKENS` from each token's `usage`,
 * and `nativeLargeTextSizes` from each step's size against `gate.contrast.largeTextMinPx`.
 * Nothing here lists a token name or a pixel count, so a new step or a re-classified token is
 * covered without anyone remembering to update this file. A hand-written list is precisely how
 * `foreground.3` went unchecked in the first place.
 */

import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import {
  type nativeLargeTextSizes,
  nativeType,
  type LargeTextToken,
  type TextToken,
} from '@irodora/design-tokens';
import { useTheme } from './theme.js';

/** A step of the type scale. */
export type TypeSize = keyof typeof nativeType.latin;

/** The steps at or above the large-text floor, as a union. */
export type LargeTypeSize = (typeof nativeLargeTextSizes)[number];

/**
 * Colours legal at a given size.
 *
 * At a large size, both normal-text and large-text-only tokens are legal. Below the floor,
 * only tokens that meet the normal-text ratio are — which is what excludes `foreground.3`.
 */
export type ColorFor<S extends TypeSize> = S extends LargeTypeSize
  ? TextToken | LargeTextToken
  : TextToken;

export type TextProps<S extends TypeSize> = Omit<RNTextProps, 'style'> & {
  readonly size: S;
  readonly color: ColorFor<S>;
  /** Japanese needs more leading at the same size; the scale carries both. */
  readonly script?: keyof typeof nativeType;
};

export function Text<S extends TypeSize>({
  size,
  color,
  script = 'latin',
  children,
  ...rest
}: TextProps<S>): React.JSX.Element {
  const { colors } = useTheme();
  const step = nativeType[script][size];
  const japanese = script === 'japanese';
  return (
    <RNText
      // Dynamic Type is never disabled, and the multiplier is never capped below 2 — A7
      // requires text to scale to 200% without loss of content or function.
      allowFontScaling
      maxFontSizeMultiplier={2}
      // KINSOKU SHORI — Japanese line-breaking rules: a line may not begin with 、。」or a
      // small kana, and may not end with 「. React Native does not implement this; it asks
      // the PLATFORM text engine to. So what is checkable here is that we asked, in the form
      // each platform understands, and nothing more:
      //   iOS     `lineBreakStrategyIOS: 'push-out'` enables Core Text's Japanese strategy
      //   Android `textBreakStrategy: 'highQuality'` selects the ICU line breaker. NOTE the
      //           camelCase — RN's prop is NOT the Android native constant `high_quality`,
      //           and the type caught that here rather than a device doing so later.
      // Whether the result is CORRECT is a device attestation on F-017, because a JS render
      // tree has no text engine in it at all.
      {...(japanese
        ? { lineBreakStrategyIOS: 'push-out' as const, textBreakStrategy: 'highQuality' as const }
        : {})}
      {...rest}
      style={{ ...step, color: colors[color] }}
    >
      {children}
    </RNText>
  );
}
