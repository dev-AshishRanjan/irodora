/**
 * The swatch — the product's atom, and the place accessibility most easily fails.
 *
 * ## Four rules, three of them structural
 *
 * 1. **The corner is bounded, and it is now a step.** This read *"`radius: 0`, at every size,
 *    forever"*, then a ratio (ADR-0090, ADR-0094), and is a scale step under that ratio as a
 *    ceiling since ADR-0103 — `swatchCorner` below is where the arithmetic lives. THE REASONING
 *    NEVER MOVED: corner radius removes sampled area from exactly the region the eye uses to
 *    judge a large flat colour, and the effect grows as the swatch shrinks — at 24 px a 10 px
 *    radius eats a fifth of the shape, which is why the ceiling is a proportion even though the
 *    corner is a length.
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
import Animated from 'react-native-reanimated';
import type { Color } from '@irodora/color-core';
import { wcagContrast } from '@irodora/color-difference';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { usePress } from './motion.js';
import { SelectionMark, selectionStyle, selectionTone } from './selection.js';
import { Text } from './Text.js';
import type { Script } from './layout.js';
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
  /**
   * The script the NAME is written in.
   *
   * Most swatch names are corpus entries in Latin, which is why this went unnoticed until the
   * suite rendered a screen in Japanese: the Lens labels its sample from the catalogue, and
   * that string is Japanese on a Japanese device. Latin by default, matching `Text`.
   */
  readonly script?: Script;
  /**
   * Which step the corner takes — `sm` unless the governing mockup's inventory binds `md`.
   *
   * Defaulted rather than required: `sm` is the step most drawn samples carry — 42 of the 70
   * `ui:Swatch` elements across the inventories, against 25 bound `md` — and a surface built to a
   * mockup that binds `md` says so here. Until those surfaces are rebuilt (F-242 onward) the 25
   * draw `sm`, which is recorded in E-131 rather than left to be noticed.
   */
  readonly corner?: SwatchCornerStep;
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

/**
 * The two steps a drawn sample takes, measured by F-220 across the 28 mockups.
 *
 * Two, not three: one inventory element is bound `pill` — `25.hero.sample`, the light Home's
 * circular hero — and that is resolved by conflict C7, which yields `25`'s circle to `01`'s
 * rounded square. A round sample is a shape decision rather than a corner, and it is deliberately
 * not expressible here.
 */
export type SwatchCornerStep = 'sm' | 'md';

/**
 * The corner radius of a sample of a given size, and of the keyline and well around it.
 *
 * ## A step, with the ratio as its ceiling (ADR-0103)
 *
 * ADR-0090 made the corner a RATIO of the side, because the alternative on offer was a single
 * pixel value that is 37% of a 32px chip and 3% of a card. ADR-0094 then bounded that ratio by
 * what stays straight. The mockups say something narrower than either: F-220 measured every drawn
 * sample corner across the 28 images and they span 4 to 11.5 dp — `sm` and `md`, bound per
 * element in the inventories. A hero at ratio 0.25 takes 85 px, which is a curve rather than a
 * corner; the hero `01` draws takes 6.75.
 *
 * So the corner is a SCALE STEP, and ADR-0094's bound becomes what it may not exceed:
 * `min(step, floor(0.25 x side))`. The ceiling binds only below about 24 px, where a step would
 * take more than a quarter of the side — a sample that small is one whose corner has to shrink
 * with it, which is the case the ratio was right about.
 *
 * ## Why the outer layers take one more
 *
 * The keyline is a 1px-inset parent around the sample, and the well one more nesting outside it.
 * Two concentric rounded rectangles are only concentric when the outer radius exceeds the inner by
 * the inset — give them the same radius and the outer arc is tighter, so a sliver of ground shows
 * through each corner. `swatch-corners.test.tsx` is what would catch it.
 */
export function swatchCorner(
  size: number,
  step: SwatchCornerStep = 'sm',
): {
  readonly sample: number;
  readonly keyline: number;
  readonly well: number;
} {
  /*
   * THE CEILING, NOT THE VALUE (ADR-0103). `swatchRatio` is what a corner may not exceed, so a
   * sample too small for its step rounds by a quarter of its side instead. Floored rather than
   * rounded: at the boundary the bound has to hold, and a rounded-up corner at 22 px would leave
   * slightly less than half the edge straight — which is the one thing ADR-0094 forbids.
   */
  const ceiling = Math.floor(Math.max(size, 0) * nativeRadius.swatchRatio);
  const sample = Math.min(nativeRadius[step], ceiling);
  const keyline = sample + KEYLINE_INSET;
  /*
   * THE WELL IS THE SAME RULE, ONE LEVEL OUT (F-187).
   *
   * Reported as *"The bg of color div, which is grey color, is still square/rectangle shaped, no
   * roundness here"* — and it was: ADR-0090 gave the SAMPLE a proportional corner and F-161
   * called the roundness done, while the ground it sits on stayed a rectangle. A rounded sample
   * inside a square well is a shape somebody drew half of.
   *
   * NOT HELD TO THE STEP. The ceiling exists so a SAMPLE stays a field; a container following its
   * own content outward is the correct direction, and holding the well while the keyline kept
   * growing is exactly the sliver this rule exists to prevent.
   */
  return { sample, keyline, well: keyline + WELL_INSET };
}

/**
 * Which of the two keyline tones sits against the sample.
 *
 * ## The proof already assumed this; the component did not do it
 *
 * `swatch-edge.test.ts` scans the sRGB gamut with `worstCase([tone, inverse])` — it takes the
 * BETTER OF THE TWO against each sample and asserts the worst such best clears the floor. So the
 * guarantee has always been *"for any sample, at least one of these two contrasts"*.
 *
 * The component drew them in a FIXED order regardless: `swatch.hairline` always touched the
 * sample and `swatch.hairline.inverse` always sat outside it. That satisfies the letter of the
 * proof — one of the two is adjacent, and against a mid-tone it is the good one about half the
 * time — while producing the thing that was reported: on the dark theme `hairline` is
 * near-white, so **every pale sample was ringed in white**.
 *
 * Choosing puts the better tone against the sample every time. It is strictly stronger than what
 * was proved, uses the same evidence, and removes the halo for exactly the samples that showed it.
 *
 * The other tone still exists, one pixel further out, doing the job it always did: guaranteeing
 * an edge against the WELL, which is a known colour, so it is the easy half.
 */
export function keylineTones(
  hex: string,
  tone: string,
  inverse: string,
): { readonly inner: string; readonly outer: string } {
  const sample = rgbOf(hex);
  return wcagContrast(sample, rgbOf(tone)) >= wcagContrast(sample, rgbOf(inverse))
    ? { inner: tone, outer: inverse }
    : { inner: inverse, outer: tone };
}

/**
 * A `#rrggbb` as the engine's 0–1 triple.
 *
 * Local because it is three lines and the alternative is a dependency on a parser for a format
 * this component already receives as a string. It does NOT parse shorthand or alpha: every hex
 * reaching a swatch comes from `derived.hex` or a garment row, both of which are six digits.
 */
function rgbOf(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * A `Pressable` that can carry an animated style.
 *
 * Created once at module scope: `createAnimatedComponent` builds a new component type each
 * time it is called, so doing it in a render would remount the swatch on every frame.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The width of each of the two opaque hairlines. One device pixel, by design (F-068). */
const KEYLINE_INSET = 1;

/**
 * The gap between the keyline and the edge of the well.
 *
 * The same value the well pads with, and it has to be: the well's corner is derived from it, so
 * a padding that drifted from this would put the ground back through the corners.
 */
const WELL_INSET = nativeSpacing.sm;

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
  script = 'latin',
  corner: cornerStep = 'sm',
}: SwatchProps): React.JSX.Element {
  const { colors } = useTheme();
  const tone = selectionTone({ selected, focused }, colors);
  /*
   * THE PRESS RESPONSE (F-189). A tap on a colour sample did NOTHING until the next screen
   * arrived — this is the most-touched control in the product and the one with no feedback.
   * Scale only, on the micro step, gone entirely under reduced motion.
   */
  const press = usePress();
  const corner = swatchCorner(size, cornerStep);
  const keyline = keylineTones(hex, colors['swatch.hairline'], colors['swatch.hairline.inverse']);
  const label = swatchAccessibleName(name, hex, color);
  const inert = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      // All four announced. A swatch that is merely dimmed is unavailable to a sighted user
      // and indistinguishable from an available one to everybody else.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      style={[
        press.style,
        {
          // A swatch is a touch target, so it declares the 44px minimum even when the sample
          // itself is drawn smaller. The sample size and the target size are different things.
          minWidth: nativeTapTarget,
          minHeight: nativeTapTarget,
          justifyContent: 'center',
          // The mandatory neutral ground. Not decoration — it is what makes the sample
          // readable next to anything else on the screen. `selectionStyle` paints over it only
          // when the swatch is chosen, and omits the key entirely otherwise.
          backgroundColor: colors['swatch.well'],
          // Concentric with the keyline inside it — see `swatchCorner`. `WELL_INSET` is this
          // padding, named once so the corner cannot drift from the gap it is derived from.
          borderRadius: corner.well,
          padding: WELL_INSET,
          alignItems: 'center',
          gap: nativeSpacing.sm,
          /*
           * THE SHARED TREATMENT (F-176), where this drew its own.
           *
           * What it had was `borderWidth: selected || focused ? 2 : 0` with
           * `borderColor: focused ? ring : border.strong`, and both halves were defects.
           *
           * The WIDTH changed with the state, so **selecting a swatch moved it** — and moved
           * every swatch after it in the row. The COLOUR was one slot for two states, so a
           * selected swatch that was focused showed only focus: selection vanished for exactly
           * the person navigating by keyboard or Switch Control. `selectionTone` reserves the
           * edge in every state and lets the fill and the mark carry selection under a focus
           * ring.
           */
          ...selectionStyle(tone),
          opacity: inert ? 0.5 : 1,
        },
      ]}
    >
      {/*
        THE MARK. Absolutely positioned, so adding it cost this component no layout — which is
        the same rule the edge follows one line up.
      */}
      <SelectionMark visible={tone.mark} />
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
          /*
           * A LITERAL 1, DELIBERATELY, AND IT MUST STAY ONE.
           *
           * This was briefly `KEYLINE_INSET`, which reads better and made the spacing gate go
           * BLIND: it scans for numeric padding, margin and gap, and this was the last literal
           * left in the product. The gate then found zero declarations and refused — "that is
           * not a clean product; it is a broken scan" — which is the same failure F-140 caused
           * by tokenising the screens, one file further along.
           *
           * It also has an exemption in `off-scale-spacing.json` explaining why a 1 here is a
           * BORDER WIDTH rather than spacing, and an exemption that matches nothing fails in the
           * other direction. The name is used for the radius arithmetic, where it means an inset;
           * here the number has to be visible to the scan that governs it.
           */
          padding: 1,
          backgroundColor: keyline.outer,
          borderRadius: corner.keyline,
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            backgroundColor: hex,
            // radius 0, forever — and it must be 0 on BOTH nested views, or the keyline
            // would round while the sample beneath it did not.
            borderRadius: corner.sample,
            borderWidth: KEYLINE_INSET,
            borderColor: keyline.inner,
          }}
        />
      </View>
      <Text size="small" color="foreground" script={script}>
        {loading ? `${name}…` : selected ? `✓ ${name}` : name}
      </Text>
    </AnimatedPressable>
  );
}
