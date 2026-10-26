/**
 * The swatch — the product's atom, and the place accessibility most easily fails.
 *
 * ## Drawn as the mockups draw it (F-233)
 *
 * Every sample form the mockups draw — hero, detail, anchor, list, strip, the card-top sample —
 * is this component at its element's size: `size` for a square, `width` and `height` for a
 * rectangle, `width="fill"` for a hero that spans its card. Nothing is added around it:
 * - **No padded well.** No mockup draws one: every sample sits on a level-1 card (C11), and the
 *   card is the ground `swatch.well` names.
 * - **The target is the hit area**, not the drawing (ADR-0114). A 34 dp list sample stays 34 dp.
 * - **The name is printed only where the mockup prints it** (`caption="name"`). The accessible name
 *   carries it everywhere.
 *
 * ## Four rules, three of them structural
 *
 * 1. **The corner is bounded, and it is a step.** `swatchCorner` below is where the arithmetic
 *    lives (ADR-0103). Corner radius removes sampled area from exactly the region the eye uses to
 *    judge a large flat colour, and the effect grows as the swatch shrinks, which is why the
 *    ceiling is a proportion even though the corner is a length. A rectangle takes it from its
 *    shorter side.
 * 2. **One line around the sample, and it keeps the edge.** The README keyline, as it shows over
 *    the well, drawn opaque at the width the element draws (`keylineWidth`: 1 dp on most, 2.5 on
 *    01's hero, 7 on 06's); where it would not clear 3:1 against this sample it moves the smallest
 *    lightness step that does (`sampleEdge`, ADR-0116). The screens draw it lighter than the
 *    README's value, and the README governs token values (P4, R9 §6 C20). Where the element draws
 *    no keyline, no line is drawn unless the sample would otherwise lose its edge. It replaced
 *    F-068's two-tone ring, which board 00 draws in its swatch-wells panel and the screens, which
 *    govern their own surfaces (P3), do not.
 * 3. **Text on the sample is readable.** `children` are drawn on it, and text there is set with
 *    `Text on={sample}`, which takes the ink ADR-0116 chooses.
 * 4. **Provenance is required.** The prop is a `Color`, not a hex, and a `Color` cannot exist
 *    without provenance ([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)).
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
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { hitArea, platformTapTarget } from './hitArea.js';
import { usePress } from './motion.js';
import { confidencePercent } from './percent.js';
import { sampleEdge } from './sampleInk.js';
import { SelectionFrame, SelectionMark, selectionTone } from './selection.js';
import { Text } from './Text.js';
import type { Script } from './layout.js';
import { useTheme } from './theme.js';

/**
 * A square sample's side when a caller names none, in dp: the median of the square samples the
 * inventories record on a scaled screen (29 of them). Recomputed by `sample-family.test`, which
 * holds the 72 it replaced as the decoy.
 */
export const SWATCH_SIZE = 60;

/**
 * Whether a sample draws the README keyline when a caller does not say: 35 of the 64 samples on
 * a scaled screen bind `keyline`, 29 do not. Either way the edge holds (rule 2 above).
 */
export const SWATCH_KEYLINE = true;

/**
 * 19 and 21: a ring around the anchor sample, at the width and gap drawn, in `foreground.2`
 * (`text.secondary`): 19's ring reads #9FA8AF–#A0A9B0 across its width, where `foreground` would
 * read #F7F8FA (F-233's review).
 */
export interface SwatchAnchor {
  /** The ring's width in dp: `19` draws 2.3, `21` 1.3. */
  readonly ring: number;
  /** The gap between the ring and the sample in dp: `19` draws 3.8, `21` 3.1. */
  readonly gap: number;
}

export interface SwatchProps {
  /** The colour's name — never "swatch", never "colour". */
  readonly name: string;
  /** The rendered value. Derived by the engine at the call site, never typed by hand. */
  readonly hex: string;
  /** Carries provenance in its type. This is the ADR-0005 enforcement. */
  readonly color: Color;
  /** A square sample's side in dp. `width` and `height` override it for a rectangle. */
  readonly size?: number;
  /** The sample's width in dp, or `fill` for a hero that spans its container. */
  readonly width?: number | 'fill';
  /**
   * The sample's height in dp, or `fill` for a sample that takes its container's height (F-248):
   * `07`'s slot tiles, where the words and controls drawn over the sample size the tile, and the
   * sample is a layer behind them rather than their parent — so its accessible node never swallows
   * theirs. A filled height is at least the tap target, which its corner and hit area assume.
   */
  readonly height?: number | 'fill';
  /** The current choice. Carried by a checkmark as well as an edge — never colour alone. */
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
   * Defaulted rather than required: `sm` is the step most drawn samples carry — 44 of the 73
   * `ui:Swatch` elements bound to a step across the inventories, against 29 bound `md` — and a
   * surface built to a mockup that binds `md` says so here (E-131).
   */
  readonly corner?: SwatchCornerStep;
  /** Whether the element draws the README keyline. Defaults to {@link SWATCH_KEYLINE}. */
  readonly keyline?: boolean;
  /**
   * The line's width in dp, as the element draws it: 1 on most samples (03, 20 and 24 read about
   * 1 dp), 2.5 on 01's hero, 7 on 06's (the inventories' `raw.keylinePx`).
   */
  readonly keylineWidth?: number;
  /** Print the name under the sample, where the mockup prints it. */
  readonly caption?: 'name';
  /** The anchor form (19, 21): a ring around the sample. */
  readonly anchor?: SwatchAnchor;
  /**
   * Bled into its card's top edge (17's draping options): no corner of its own, because the card
   * clips it, and it spans the card.
   */
  readonly bleed?: boolean;
  /** Drawn on the sample: 01's hero names it there. Set its text with `Text on={sample}`. */
  readonly children?: React.ReactNode;
  /**
   * Whether the sample's accessible node holds what is drawn on it: yes by default, as 01's hero is
   * named there. `false` for children that act or read on their own (`07`'s slot tiles, F-248): the
   * sample's name is then a node laid under them, beside them in the accessibility tree — an image, or
   * with `onPress` the sample's own press target, which a touch reaches through children that let it.
   */
  readonly group?: boolean;
  /** The id of the node that carries the sample's name: the sample itself, or apart, its named node. */
  readonly testID?: string;
}

/**
 * Build the accessible name. Exported so the conformance suite can assert its shape rather
 * than re-deriving it, and so a test can prove it contains all three parts.
 */
export function swatchAccessibleName(name: string, hex: string, color: Color): string {
  const { source, confidence } = color.provenance;
  // The one format (F-222, ADR-0124): floored, so a name never claims more than the value holds.
  const percent = confidencePercent(confidence);
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
 * The corner radius of a sample of a given size, and of the line around it.
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
 * ## Why the line takes one more
 *
 * The line is a 1-dp-inset parent around the sample. Two concentric rounded rectangles are only
 * concentric when the outer radius exceeds the inner by the inset — give them the same radius and
 * the outer arc is tighter, so a sliver of ground shows through each corner.
 * `swatch-corners.test.tsx` is what would catch it. (A well sat one more nesting outside it until
 * F-233; the mockups draw none.)
 */
export function swatchCorner(
  size: number,
  step: SwatchCornerStep = 'sm',
): {
  readonly sample: number;
  readonly keyline: number;
} {
  /*
   * THE CEILING, NOT THE VALUE (ADR-0103). `swatchRatio` is what a corner may not exceed, so a
   * sample too small for its step rounds by a quarter of its side instead. Floored rather than
   * rounded: at the boundary the bound has to hold, and a rounded-up corner at 22 px would leave
   * slightly less than half the edge straight — which is the one thing ADR-0094 forbids.
   */
  const ceiling = Math.floor(Math.max(size, 0) * nativeRadius.swatchRatio);
  const sample = Math.min(nativeRadius[step], ceiling);
  return { sample, keyline: sample + KEYLINE_INSET };
}

/**
 * A `Pressable` that can carry an animated style.
 *
 * Created once at module scope: `createAnimatedComponent` builds a new component type each
 * time it is called, so doing it in a render would remount the swatch on every frame.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The width of the line around the sample. One dp, by design (F-068, F-233). */
const KEYLINE_INSET = 1;

export function Swatch({
  name,
  hex,
  color,
  size = SWATCH_SIZE,
  width,
  height,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  onPress,
  script = 'latin',
  corner: cornerStep = 'sm',
  keyline = SWATCH_KEYLINE,
  keylineWidth = KEYLINE_INSET,
  caption,
  anchor,
  bleed = false,
  group = true,
  testID,
  children,
}: SwatchProps): React.JSX.Element {
  const { colors, source, paint } = useTheme();
  const tone = selectionTone({ selected, focused }, colors);
  /*
   * THE PRESS RESPONSE (F-189). A tap on a colour sample did NOTHING until the next screen
   * arrived — this is the most-touched control in the product and the one with no feedback.
   * Scale only, on the micro step, gone entirely under reduced motion.
   */
  const press = usePress();
  // A FILLED HEIGHT IS ITS CONTAINER'S (F-248), and at least the target: so the target stands in for
  // it wherever a number is needed — the corner, the width floor and the hit area.
  const tallFill = height === 'fill';
  const tall = tallFill ? platformTapTarget() : (height ?? size);
  /*
   * The sample's own height: a number, or the container's — GROWN to it rather than `flex: 1`, whose
   * zero basis collapses a child of a parent with no height of its own: the words drawn on the sample
   * set its height, and a row's taller sibling stretches it.
   */
  const sampleHeight = tallFill ? { flexGrow: 1 } : { height: tall };
  const wide = bleed ? 'fill' : (width ?? size);
  const fill = wide === 'fill';
  // A rectangle takes its corner from its shorter side; a filled width is at least as long as the
  // height it is drawn at, and a bled sample has no corner of its own.
  const corner = bleed
    ? { sample: 0, keyline: 0 }
    : swatchCorner(fill ? tall : Math.min(wide, tall), cornerStep);
  // DERIVED FROM THE APP AS DECLARED, THEN PAINTED (F-240, ADR-0131 §3): the edge is solved on the
  // declared palette and sample, and the preview simulates what is drawn — never re-solves for it.
  const edge = sampleEdge(hex, source, keyline);
  /*
   * A LINE ONLY WHERE ONE IS DRAWN OR NEEDED. An element that draws the keyline always carries it;
   * one that does not carries a line only where the sample would otherwise lose its edge (the well
   * moved), and elsewhere the sample fills its box (F-233's review, M7).
   */
  const lined = keyline || edge.moved;
  const lineRadius = bleed ? 0 : corner.sample + keylineWidth;
  const outline = lined ? lineRadius : corner.sample;
  /*
   * The width floor is the height (ADR-0114), but a filled sample's width is its container's, so it
   * declares no more than the target: a 299 dp hero declaring 299 would overflow a 320 pt phone's
   * content width (F-233's review, S5).
   */
  const declaredWidth = fill ? Math.min(tall, platformTapTarget()) : wide;
  const label = swatchAccessibleName(name, hex, color);
  const inert = disabled || loading;
  /*
   * APART FROM ITS CHILDREN (F-248): a sample whose children act or read on their own carries its name
   * on a node laid over the sample, under them, that holds nothing — rather than on a button grouping
   * them into one node, where a screen reader reaches no control and hears none of the words. A sample
   * that does nothing names an image; one with `onPress` names its press target, the one node a reader
   * stops at for the sample (F-248's review, S4), which a touch reaches through children that let it.
   */
  const apart = !group;
  const fills = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;
  const id = testID === undefined ? {} : { testID };
  const named = !apart ? null : onPress === undefined ? (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      pointerEvents="none"
      style={fills}
      {...id}
    />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      // It fills the sample, whose box is at least the target (`box` below); the floor is declared here
      // too, so the target is a number a check can read rather than an inference from the layout.
      style={{ ...fills, minWidth: declaredWidth, minHeight: tall }}
      {...id}
    />
  );

  /*
   * THE LINE, THEN THE SAMPLE. The line sits around the sample inside the element's box, so the
   * drawn size is the element's: the sample is the box less the line. A line wider than one dp
   * draws the rest as a border outside the one-dp inset, in the same colour.
   *
   * A LITERAL 1, DELIBERATELY, AND IT MUST STAY ONE. This was briefly `KEYLINE_INSET`, which reads
   * better and made the spacing gate go BLIND: it scans for numeric padding, margin and gap, and
   * this was the last literal left in the product. It has an exemption in `off-scale-spacing.json`
   * explaining why a 1 here is a line's width rather than spacing (E-078).
   */
  const sample = lined ? (
    <View
      style={{
        width: fill ? '100%' : wide,
        ...sampleHeight,
        padding: 1,
        borderWidth: keylineWidth - KEYLINE_INSET,
        borderColor: paint(edge.hex),
        backgroundColor: paint(edge.hex),
        borderRadius: lineRadius,
      }}
    >
      <View
        style={{
          ...(tallFill ? { flexGrow: 1 } : { flex: 1 }),
          backgroundColor: paint(hex),
          borderRadius: corner.sample,
        }}
      >
        {named}
        {children}
      </View>
    </View>
  ) : (
    <View
      style={{
        width: fill ? '100%' : wide,
        ...sampleHeight,
        backgroundColor: paint(hex),
        borderRadius: corner.sample,
      }}
    >
      {named}
      {children}
    </View>
  );
  const drawn =
    anchor === undefined ? (
      sample
    ) : (
      // The ring in `foreground.2` (19 and 21 measure it there), concentric with what it holds.
      <View
        style={{
          borderWidth: anchor.ring,
          borderColor: colors['foreground.2'],
          padding: anchor.gap,
          borderRadius: outline + anchor.gap + anchor.ring,
        }}
      >
        {sample}
      </View>
    );
  const outerRadius = anchor === undefined ? outline : outline + anchor.gap + anchor.ring;

  /*
   * THE BOX, shared by both outer elements: a pressable sample, and one apart from its children, which
   * does nothing and so is a plain View no screen reader announces.
   */
  const box = {
    minWidth: declaredWidth,
    minHeight: tall,
    ...(fill ? { alignSelf: 'stretch' as const } : { alignItems: 'center' as const }),
    ...(tallFill ? { flexGrow: 1 } : {}),
    gap: nativeSpacing.sm,
    // The selection frame and the focus edge sit outside the box and cost no layout.
    overflow: 'visible' as const,
    opacity: inert ? 0.5 : 1,
  };
  const body = (
    <>
      <View
        style={{ ...(fill ? { alignSelf: 'stretch' } : {}), ...(tallFill ? { flexGrow: 1 } : {}) }}
      >
        {/*
          THE SHARED TREATMENT (F-176), drawn outside the sample (F-233): `accent` edge, or `ring`
          under focus, with `accent.muted` in the gap. First, so the sample covers its middle. A
          bled sample's card clips anything outside it, so its frame is its edge, drawn over it.
        */}
        {bleed ? null : <SelectionFrame tone={tone} radius={outerRadius} />}
        {drawn}
        {bleed ? <SelectionFrame tone={tone} radius={outerRadius} inside /> : null}
        {/*
          THE MARK. Absolutely positioned, so adding it cost this component no layout — which is
          the same rule the frame follows.
        */}
        <SelectionMark visible={tone.mark} />
      </View>
      {caption === 'name' ? (
        /*
          A swatch NAMED BY ITS VALUE (a generated colour has no other name) prints a figure, and a
          figure is set in tabular digits like every other colour value (C9, F-226). Read off the
          props, not guessed from the string: the name is the hex exactly when the caller said so.
        */
        <Text size="label" color="foreground" script={script} numeric={name === hex}>
          {loading ? `${name}…` : selected ? `✓ ${name}` : name}
        </Text>
      ) : null}
    </>
  );
  if (apart) return <View style={box}>{body}</View>;

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
      // The target, grown around the drawing rather than drawn into it (ADR-0114).
      hitSlop={hitArea(declaredWidth, tall)}
      style={[press.style, box]}
      {...id}
    >
      {body}
    </AnimatedPressable>
  );
}
