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
 * ## Two affordances the HeroUI comparison surfaced (F-088)
 *
 * **`heading`.** Screen-reader users navigate by heading, and nothing here offered the role —
 * so the home screen's title announced as ordinary text. This is not a HeroUI wrapper: its
 * `Text.Heading` sets `accessibilityRole="header"`, which is a React Native prop we can set
 * ourselves. Taking the idea without taking the dependency is the whole of
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md).
 *
 * **`dynamicTypeRamp`.** iOS scales text along different curves at different sizes. Naming the
 * curve is how a 15 px label and a 34 px title both behave correctly as the user's setting
 * moves. Derived per step from the manifest scale, matched by SIZE rather than by name — see
 * `typography.ts` for why those differ and which is right. iOS only; `maxFontSizeMultiplier`
 * remains the mechanism on Android.
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
  nativeDynamicTypeRamp,
  nativeFamilies,
  nativeNumericFeature,
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
  /**
   * Announce this as a heading, so a screen reader can navigate by it (NFR-8).
   *
   * A prop rather than a size rule: `display.1` is usually a heading and sometimes a large
   * number, and a component that guessed would be wrong in the case nobody checks.
   */
  readonly heading?: boolean;
  /**
   * Render figures as **tabular** — equal-width, so columns of numbers align.
   *
   * C9 in the design brief, and it is not a stylistic preference: *"colour values appear in
   * columns and must align — proportional figures make a ΔE table unscannable."* A professional
   * scans a column of deltas, and proportional digits make that column ragged enough that the
   * comparison the table exists for has to be done one row at a time.
   *
   * A PROP rather than an automatic rule, for the same reason `heading` is one: a heuristic
   * would have to guess which strings are numbers, and "0.42" and "F-019" are both strings. The
   * caller knows; the component cannot.
   *
   * The value comes from `nativeNumericFeature`, which the manifest owns. Until F-019 that
   * token was emitted, asserted against the manifest by its own test, and **consumed by
   * nothing** — a generated value that reached no pixel for two releases.
   */
  readonly numeric?: boolean;
};

export function Text<S extends TypeSize>({
  size,
  color,
  script = 'latin',
  heading = false,
  numeric = false,
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
      // WHICH CURVE iOS scales along. Derived from this step's size, so a new step or a
      // resized one is covered without anyone editing this file — the same property the
      // largeText constraint above already has.
      dynamicTypeRamp={nativeDynamicTypeRamp[size]}
      // Set from ONE prop so the role and the intent cannot disagree. Spread BEFORE `rest`,
      // so a caller with a genuinely different role can still say so.
      {...(heading ? { accessibilityRole: 'header' as const } : {})}
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
      // The bundled face for Japanese ONLY (ADR-0057 §6). Latin keeps the platform font:
      // Latin has no tofu failure mode, so the script that can fail silently gets the
      // bundled font and the script that cannot, does not.
      style={{
        ...step,
        color: colors[color],
        ...(japanese ? { fontFamily: nativeFamilies.jp } : {}),
        // Spread conditionally rather than passed as `fontVariant: numeric ? [...] : undefined`:
        // under `exactOptionalPropertyTypes` a present-and-undefined key is not the same as an
        // absent one, and the conformance suite reads what the NODE carries.
        ...(numeric ? { fontVariant: [nativeNumericFeature] } : {}),
      }}
    >
      {children}
    </RNText>
  );
}
