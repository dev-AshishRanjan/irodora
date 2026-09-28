/**
 * Text, with the one pairing that fails AA made **unwritable**.
 *
 * ## The constraint
 *
 * **Since F-225 no token is large-text-only**, and the mechanism below is kept for the day one is.
 * The mockups' tertiary text is small metadata, so R9-MOCKUP-FIDELITY §4 E3 measured it against
 * 4.5:1 and moved it where it failed: `foreground.3` (the ground) and `foreground.3.card` (cards)
 * are both `usage: "text"`, and `LargeTextToken` is therefore empty. What follows is the history
 * of why the mechanism exists.
 *
 * `foreground.3` was `usage: "largeText"` — it failed AA against every surface below the WCAG
 * large-text floor. That restriction was *claimed* to be gate-enforced from F-003 while
 * `foreground.3` appeared in no `pairsWith` list, so nothing checked it at all; F-003 fixed
 * the token half. The remaining half is catching a 13 px label that uses it, and a gate can
 * only catch that after it is written.
 *
 * So it is a **type error** instead:
 *
 * ```tsx
 * <Text size="title" color="foreground.3" />   // fine — 22px, above the floor
 * <Text size="label" color="foreground.3" />   // did not compile until F-225 made it text
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
  nativeFaces,
  nativeFamilies,
  nativeNumericFeature,
  nativeType,
  type LargeTextToken,
  type TextToken,
} from '@irodora/design-tokens';
import { useTheme } from './theme.js';
import { useDisplaySettings } from './displaySettings.js';

/** A step of the type scale. */
export type TypeSize = keyof typeof nativeType.latin;

/** The steps at or above the large-text floor, as a union. */
export type LargeTypeSize = (typeof nativeLargeTextSizes)[number];

/**
 * Colours legal at a given size.
 *
 * At a large size, both normal-text and large-text-only tokens are legal. Below the floor,
 * only tokens that meet the normal-text ratio are. (That excluded `foreground.3` until F-225; no
 * token is large-text-only today, so the two branches currently agree.)
 */
export type ColorFor<S extends TypeSize> = S extends LargeTypeSize
  ? Either<TextToken, LargeTextToken>
  : TextToken;

/**
 * `A | B`, spelled through a generic so an EMPTY `B` is not a lint error. Since F-225
 * `LargeTextToken` is `never`, and a literal `TextToken | LargeTextToken` reads to the linter as a
 * redundant constituent — true today, and exactly the branch that must still widen the day a token
 * is classified large-text again.
 */
type Either<A, B> = A | B;

/**
 * The faces the inventories draw a text element in (`type.face`, F-220): the platform sans, the
 * serif, and their Japanese counterparts, gothic and mincho (C6).
 */
export type Face = 'sans' | 'serif' | 'gothic' | 'mincho';

/** The steps a mockup draws the serif at (ADR-0112) — read from the manifest, never listed here. */
export type SerifStep = (typeof nativeFaces.serif.steps)[number];
/** The steps a mockup draws the mincho at. */
export type MinchoStep = (typeof nativeFaces.mincho.steps)[number];

/**
 * Which face, and what it may be combined with — the constraints are the mockups', made TYPES:
 *
 * - the serif and the mincho exist only at the steps a mockup draws them at, so a serif caption
 *   does not compile;
 * - neither sets figures (ADR-0112 d.5): no mockup draws a serif figure, and Gelasio's default
 *   figures are oldstyle and proportional, so `numeric` is refused with them;
 * - the mincho carries only the corpus kanji it is subset to, so it is Japanese only.
 */
type FaceProps<S extends TypeSize> =
  | {
      /** The platform sans for Latin, the bundled gothic for Japanese — the default. */
      readonly face?: 'sans' | 'gothic';
      readonly numeric?: boolean;
    }
  | (S extends SerifStep ? { readonly face: 'serif'; readonly numeric?: false } : never)
  | (S extends MinchoStep
      ? { readonly face: 'mincho'; readonly numeric?: false; readonly script: 'japanese' }
      : never);

export type TextProps<S extends TypeSize> = Omit<RNTextProps, 'style'> &
  FaceProps<S> & {
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
     * This text **carries figures** — so `15`'s tabular switch can decide whether they are set
     * equal-width, and columns of numbers align (F-239; it meant *"render tabular"* until then, and
     * the paragraph below says what changed).
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
     *
     * **Since F-239 this prop says what the text IS, and the setting says what to do about it.**
     * `15` draws a *Tabular Numeric Figures* switch; a caller still declares that its text carries
     * figures, because no heuristic can tell `"0.42"` from `"F-019"`, and
     * {@link useDisplaySettings} decides whether those figures are set tabular. The switch is drawn
     * on and defaults on, so a caller that says nothing sees exactly what it saw before.
     */
    readonly numeric?: boolean;
  };

/** An em tracking from the manifest, in the points React Native takes, at one font size. */
const trackingAt = (tracking: string, fontSize: number): number =>
  tracking === '0' ? 0 : Number.parseFloat(tracking) * fontSize;

/**
 * The family, weight and tracking a face resolves to (ADR-0112).
 *
 * Japanese text in a sans or serif element is set in the bundled gothic — C6: kanji are sans on
 * `01 05 06 26`, and a Latin serif has no kanji to set. The mincho is its own face. Latin in the
 * serif is Gelasio at the weight it is cut at: asking a single-weight face for 600 makes a platform
 * fake a bold, so the step's weight is overridden. The Latin sans is the platform's and carries no
 * family at all (ADR-0057 §6).
 */
function faceStyle(
  face: Face,
  japanese: boolean,
  fontSize: number,
): {
  readonly fontFamily?: string;
  readonly fontWeight?: (typeof nativeFaces)[keyof typeof nativeFaces]['fontWeight'];
  readonly letterSpacing?: number;
} {
  if (face === 'mincho')
    return { fontFamily: nativeFamilies.mincho, fontWeight: nativeFaces.mincho.fontWeight };
  if (japanese) return { fontFamily: nativeFamilies.jp };
  if (face === 'serif')
    return {
      fontFamily: nativeFamilies.serif,
      fontWeight: nativeFaces.serif.fontWeight,
      letterSpacing: trackingAt(nativeFaces.serif.tracking, fontSize),
    };
  return {};
}

export function Text<S extends TypeSize>({
  size,
  color,
  script = 'latin',
  heading = false,
  numeric = false,
  face = 'sans',
  children,
  ...rest
}: TextProps<S>): React.JSX.Element {
  const { colors } = useTheme();
  const { tabularNumerals } = useDisplaySettings();
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
      // The bundled faces (ADR-0057, ADR-0112): Japanese always, the serif and the mincho where
      // a mockup draws them. The Latin sans keeps the platform font: it has no tofu failure mode.
      style={{
        ...step,
        color: colors[color],
        ...faceStyle(face, japanese, step.fontSize),
        // Spread conditionally rather than passed as `fontVariant: numeric ? [...] : undefined`:
        // under `exactOptionalPropertyTypes` a present-and-undefined key is not the same as an
        // absent one, and the conformance suite reads what the NODE carries.
        ...(numeric && tabularNumerals ? { fontVariant: [nativeNumericFeature] } : {}),
      }}
    >
      {children}
    </RNText>
  );
}
