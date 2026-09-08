/**
 * The drawings an empty state carries, and the three rules that keep them honest.
 *
 * ## Why there are three of them and not twelve
 *
 * There are twelve empty states across six screens, and every one of them was a sentence and
 * sometimes a button. Reported as *"Use some animated art/illustions/vector arts in the app, to
 * make it lively"* — and the temptation is twelve bespoke pictures, which is twelve things to
 * keep in a style and twelve chances for one to drift.
 *
 * Three, keyed by **what is missing**, because the twelve emptinesses are three:
 *
 * | | what it says |
 * |---|---|
 * | `swatches` | nothing has been collected yet |
 * | `reading` | nothing has been measured yet |
 * | `pairing` | there are things, and nothing has been put together |
 *
 * ## They are drawn from the product's own vocabulary
 *
 * A sample outline, a well, a reticle. Not a mascot, not a magnifying glass, not a person
 * shrugging — the subject of this product is colour and the shapes it already uses to talk about
 * colour are the shapes it should draw when there is none. `visual-taste` puts it as: the
 * subject's own world is where distinctive choices come from.
 *
 * ## Three rules, and the third is the one that is easy to break
 *
 * **1. Every colour is a token.** No literal, ever — so both themes and every CVD simulation
 * measure these the way they measure everything else. The conformance suite's `colour-literal`
 * rule is the guard, and it has already caught a dependency painting `#000000` (F-185).
 *
 * **It caught this file too, on its first run.** `Rect` and `Circle` here stated `fill="none"`
 * and `Line` did not, so react-native-svg injected `#000000` onto four strokes — the exact
 * hazard the paragraph above the `<Svg>` element already warned about, written by the same hand
 * in the same commit. **A rule you have just written down is not a rule you have followed**, and
 * a check that only reads the source would never have seen it: the literal is in the library.
 *
 * **2. Outline, never fill.** A filled shape at illustration scale is a large flat field of
 * colour, and this product asks people to judge large flat fields of colour a few centimetres
 * away. An empty state that competes with a garment sample is an empty state that has forgotten
 * where it is.
 *
 * **3. A drawing may never carry meaning the text does not.** These are `accessibilityElements
 * Hidden` and they say nothing a screen reader needs — the message beside them is the whole
 * content. That is golden rule 13 read strictly: a picture is a channel, and a channel carrying
 * something no other channel carries is a channel somebody is excluded from.
 *
 * ## They do not move
 *
 * The report asked for *animated* art. These are still, and that is a decision rather than an
 * omission: an empty state is a thing a person reads once and leaves, and a looping animation on
 * a screen whose message is *"there is nothing here"* draws the eye to the absence repeatedly.
 * The motion in this product is on arrival — `Screen` enters, and these enter with it (F-188),
 * which is animation at the moment it means something.
 */

import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme, type ThemeColors } from './theme.js';

/** The drawings, keyed by what is missing. */
export const ILLUSTRATIONS = ['swatches', 'reading', 'pairing'] as const;
export type IllustrationName = (typeof ILLUSTRATIONS)[number];

/**
 * The coordinate system every drawing is expressed in.
 *
 * One grid for all three, so they share a stroke weight and an optical size — three drawings on
 * three grids is three styles.
 */
const GRID = 48;

/** The stroke every drawing uses, in grid units. Scales with the drawing, like the mark's does. */
const STROKE = 1.5;

/**
 * A corner radius that matches the product's samples in spirit rather than by import.
 *
 * `radius.swatchRatio` is about a rendered sample and this is a drawing of one; taking the ratio
 * and applying it here would tie an illustration to a token whose reason — how a flat colour
 * field is judged — does not apply to an outline.
 */
const SAMPLE_CORNER = 1.5;

/**
 * A drawing takes ONE colour, and that is rule 2 enforcing itself.
 *
 * The first draft passed a ground as well, for fills. Nothing used it — outline-only means
 * there is nothing to fill — and `tsc` reported the call as taking two arguments where every
 * drawing declares one. A parameter no drawing can use is an invitation to break the rule that
 * made it unusable.
 */
/**
 * A rounded rectangle, as a path.
 *
 * ## Why not `<Rect>`
 *
 * `react-native-svg`'s `Rect` inherits React Native's **deprecated `x` / `y` style props**
 * in its typings, so `no-deprecated` flags the rectangle's own geometry — the props are not the
 * deprecated ones, but nothing in the type says so. A path takes a single `d` and has no such
 * collision.
 *
 * It is also the more honest shape for this file: a rounded rectangle is four lines and four
 * arcs, and stating them is stating the drawing rather than asking a library to infer it.
 */
function roundedRect(x: number, y: number, size: number, r: number): string {
  const x2 = x + size;
  const y2 = y + size;
  return [
    `M ${String(x + r)} ${String(y)}`,
    `H ${String(x2 - r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x2)} ${String(y + r)}`,
    `V ${String(y2 - r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x2 - r)} ${String(y2)}`,
    `H ${String(x + r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x)} ${String(y2 - r)}`,
    `V ${String(y + r)}`,
    `A ${String(r)} ${String(r)} 0 0 1 ${String(x + r)} ${String(y)}`,
    'Z',
  ].join(' ');
}

type Draw = (stroke: string) => React.JSX.Element;

/**
 * The three, as data.
 *
 * Keyed by name so the registry cannot drift from the union, which is the same shape `Icon`'s
 * glyph table uses and for the same reason: a name with no drawing is a blank space that looks
 * like a layout bug.
 */
const DRAWINGS = {
  /**
   * Nothing collected: four sample outlines in a grid, one of them absent.
   *
   * The gap is the subject. Four full outlines would read as "here are four things"; three and a
   * space reads as "there is room for another", which is what an empty wardrobe actually is.
   */
  swatches: (stroke) => (
    <>
      {[
        [8, 8],
        [26, 8],
        [8, 26],
      ].map(([x, y]) => (
        <Path
          key={`${String(x)}-${String(y)}`}
          d={roundedRect(x ?? 0, y ?? 0, 14, SAMPLE_CORNER)}
          stroke={stroke}
          strokeWidth={STROKE}
          fill="none"
        />
      ))}
      {/* The absence, drawn as a dashed outline rather than left blank: a blank corner is a
          drawing that looks unfinished, and this one is finished and saying something. */}
      <Path
        d={roundedRect(26, 26, 14, SAMPLE_CORNER)}
        stroke={stroke}
        strokeWidth={STROKE}
        strokeDasharray="3 3"
        fill="none"
      />
    </>
  ),

  /**
   * Nothing measured: the Lens's own reticle, with nothing in it.
   *
   * Four corner brackets and a centre point — the shape the viewfinder already draws, so a
   * person who has used the Lens recognises what this screen is waiting for.
   */
  reading: (stroke) => (
    <>
      {[
        [10, 10, 10, 18, 18, 10],
        [38, 10, 38, 18, 30, 10],
        [10, 38, 10, 30, 18, 38],
        [38, 38, 38, 30, 30, 38],
      ].map(([cx, cy, vx, vy, hx, hy]) => (
        <Fragment key={`${String(cx)}-${String(cy)}`}>
          <Line x1={cx} y1={cy} x2={vx} y2={vy} stroke={stroke} strokeWidth={STROKE} fill="none" />
          <Line x1={cx} y1={cy} x2={hx} y2={hy} stroke={stroke} strokeWidth={STROKE} fill="none" />
        </Fragment>
      ))}
      <Circle cx={24} cy={24} r={2.5} stroke={stroke} strokeWidth={STROKE} fill="none" />
    </>
  ),

  /**
   * Nothing put together: two sample outlines that do not meet.
   *
   * The gap between them is the point, and it is the same gap `Pair` closes when there IS a
   * pairing — F-151 established that this product answers *how do these two go together* at the
   * boundary, so an absent pairing is drawn as a boundary that is not there.
   */
  pairing: (stroke) => (
    <>
      <Path
        d={roundedRect(6, 17, 14, SAMPLE_CORNER)}
        stroke={stroke}
        strokeWidth={STROKE}
        fill="none"
      />
      <Path
        d={roundedRect(28, 17, 14, SAMPLE_CORNER)}
        stroke={stroke}
        strokeWidth={STROKE}
        strokeDasharray="3 3"
        fill="none"
      />
      {/* The join that is missing, dashed across the gap. */}
      <Line
        x1={20}
        y1={24}
        x2={28}
        y2={24}
        stroke={stroke}
        strokeWidth={STROKE}
        strokeDasharray="2 3"
        fill="none"
      />
    </>
  ),
} as const satisfies Record<IllustrationName, Draw>;

export interface IllustrationProps {
  readonly name: IllustrationName;
  /** Rendered edge length. One size per context; the default suits an empty state. */
  readonly size?: number;
  /**
   * The token the outline takes.
   *
   * Constrained to the two quiet foregrounds. An illustration in `foreground` would be as loud
   * as the sentence beside it, and the sentence is the content — rule 3.
   */
  readonly color?: Extract<keyof ThemeColors, 'foreground.2' | 'foreground.3'>;
  readonly testID?: string;
}

export function Illustration({
  name,
  size = 64,
  color = 'foreground.3',
  testID,
}: IllustrationProps): React.JSX.Element {
  const { colors } = useTheme();
  const stroke = colors[color];

  return (
    <View
      testID={testID}
      /*
       * DECORATIVE, ALWAYS. Rule 3: a drawing may never carry meaning the text does not, so
       * there is nothing here for a screen reader to be told. Hidden rather than merely
       * unlabelled, for the reason `Mark` gives — an unlabelled View is skipped by VoiceOver and
       * announced as an unnamed element by some TalkBack versions.
       */
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      {/*
        `fill="none"` ON THE ROOT. react-native-svg injects `fill: #000000` onto the root group
        when none is given — a colour no token declared, which E-081 found the hard way and
        F-185 found again inside a dependency. Every shape states its own.
      */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(GRID)} ${String(GRID)}`}
        fill="none"
        accessible={false}
      >
        {DRAWINGS[name](stroke)}
      </Svg>
    </View>
  );
}
