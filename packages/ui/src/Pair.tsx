/**
 * Two colours, touching — the component for the one question a swatch cannot answer.
 *
 * ## Why a pair is not two swatches
 *
 * A `Swatch` exists to show you *a* colour: it has its own well, its own keyline, its own
 * label, and everything about it is arranged so the sample reads correctly **against the
 * page**. Put two of them side by side and each one is still doing that — separately. What
 * sits between them is a well, two keylines and a gap, and the reader is now comparing each
 * sample against that furniture rather than against the other sample.
 *
 * The question *how different are these two* is answered at the boundary. Simultaneous
 * contrast acts at an edge, and so does the visual system's own difference machinery: a
 * discontinuity you can see is a difference, and a discontinuity you cannot see is not. Every
 * millimetre of anything between the two samples makes the judgement harder, and it makes it
 * harder fastest for the small differences — which are the ones a person is squinting at.
 *
 * **So there is no keyline between the halves, and that is the component.** The keyline still
 * rings the pair, where its job is unchanged: an edge against the well and against the page.
 *
 * ## When the boundary is invisible, that is the answer
 *
 * Two colours that cannot be told apart edge to edge cannot be told apart. The pair shows that
 * honestly rather than manufacturing a seam, and the number beneath says how much difference
 * the metric found. A component that drew a line between them would be answering a question
 * nobody asked and hiding the one they did.
 *
 * ## The size is not a style choice (ADR-0095)
 *
 * `nativeJudgeableSample` is derived from the CIE 2° standard observer at the declared viewing
 * distance — the same observer `whitepoints.ts` carries and the one ΔE00 is parameterised for.
 * A sample drawn smaller than that is being judged under conditions its own number was not fit
 * for, and below about 1° that is measurable: the central fovea is sparse in S-cones, so small
 * fields lose blue–yellow discrimination.
 *
 * ## Colour is not the only channel here either
 *
 * Each half carries its name and its value as text beneath it, and its accessible name carries
 * name, hex **and** provenance — assembled by `swatchAccessibleName`, so a pair cannot drift
 * from a swatch in what it announces. The prop is a `Color`, so ADR-0005 holds: there is no way
 * to construct a half whose origin nobody recorded.
 */

import { View } from 'react-native';
import type { Color } from '@irodora/color-core';
import { nativeJudgeableSample, nativeSpacing } from '@irodora/design-tokens';
import { Text } from './Text.js';
import { useTheme } from './theme.js';
import { keylineTones, swatchAccessibleName, swatchCorner } from './Swatch.js';
import type { Script } from './layout.js';

/** One side of the pair. The same three things a `Swatch` takes, for the same reasons. */
export interface PairHalf {
  /** The colour's name — never "swatch", never "colour". */
  readonly name: string;
  /** The rendered value. Derived by the engine at the call site, never typed by hand. */
  readonly hex: string;
  /** Carries provenance in its type. This is the ADR-0005 enforcement. */
  readonly color: Color;
}

export interface StripProps {
  /**
   * The samples, in the order they should be read. Two or more.
   *
   * A one-member strip is drawn rather than refused: it is a palette somebody is part-way
   * through building, and a screen that vanished at that moment would be worse than one that
   * shows the single colour it has.
   */
  readonly members: readonly PairHalf[];
  /**
   * How much of the width each member takes, in the same order. Any positive numbers — they are
   * normalised, so a caller passes the quantity it already has rather than fractions of one.
   *
   * Omitted means equal shares. **This is the channel that makes a strip say something a row of
   * swatches cannot**: where the proportions come from a real quantity, the strip is a reading
   * rather than a decoration.
   */
  readonly weights?: readonly number[];
  /** See `PairProps.height`. */
  readonly height?: number;
  readonly testID?: string;
}

export interface PairProps {
  readonly a: PairHalf;
  readonly b: PairHalf;
  /**
   * The height of the samples, in dp. Defaults to the judgeable floor and may not go under it.
   *
   * Height rather than width, because width is whatever the container gives and height is the
   * dimension a caller could get wrong. The floor is on the SMALLER dimension: a field is at
   * least 2° across only if its narrowest run is.
   */
  readonly height?: number;
  readonly script?: Script;
  readonly testID?: string;
}

/** The width of each of the two opaque hairlines. One device pixel, as on a swatch (F-068). */
const KEYLINE = 1;

/**
 * The ring around the pair, against the well.
 *
 * A single swatch picks its inner tone against its own sample and lets the other tone face the
 * well. A pair has two samples and one ring, so the ring is chosen against the **well** — which
 * is a known colour, and is the easy half of the problem the two-tone keyline was built for.
 * The per-half tone that faces each sample is still chosen by `keylineTones`, on the three
 * edges that are not the shared one.
 */
function ringAgainst(well: string, tone: string, inverse: string): string {
  return keylineTones(well, tone, inverse).inner;
}

/**
 * Samples that touch, in order, at widths that mean something.
 *
 * The general case, and `Pair` is the two-member one with labels. The edge rule — no line and
 * no corner where two samples meet — lives here once, because it is the whole argument of both
 * and a second copy of it is a second place for it to be lost.
 */
export function Strip({ members, weights, height, testID }: StripProps): React.JSX.Element {
  const { colors } = useTheme();

  /*
   * THE FLOOR IS A FLOOR. A caller asking for less gets the floor, silently, rather than a
   * throw: a strip drawn small is a degraded reading, not a programming error, and a component
   * that crashed a screen over it would be traded for a bare View within a week.
   */
  const tall = Math.max(height ?? nativeJudgeableSample, nativeJudgeableSample);
  const corner = swatchCorner(tall);

  const tone = colors['swatch.hairline'];
  const inverse = colors['swatch.hairline.inverse'];
  const ring = ringAgainst(colors['swatch.well'], tone, inverse);

  const last = members.length - 1;

  return (
    <View
      testID={testID}
      style={{
        // The mandatory neutral ground, exactly as on a swatch: whatever touches a sample
        // changes how it reads, so what touches the STRIP is a known colour.
        backgroundColor: colors['swatch.well'],
        padding: nativeSpacing.sm,
      }}
    >
      {/* The ring, and the only line this component draws around anything. */}
      <View style={{ padding: KEYLINE, backgroundColor: ring, borderRadius: corner.keyline }}>
        <View style={{ flexDirection: 'row' }}>
          {members.map((member, index) => {
            const first = index === 0;
            const end = index === last;
            const edge = keylineTones(member.hex, tone, inverse).inner;
            return (
              <View
                key={String(index)}
                // Announced as one thing with a full name. Not pressable — a strip is a
                // reading, and a role it does not have is worse than no role at all.
                accessible
                accessibilityRole="image"
                accessibilityLabel={swatchAccessibleName(member.name, member.hex, member.color)}
                style={{
                  // The share, as flex. Normalised by flex itself, which is why a caller can
                  // pass the quantity it already has instead of converting to fractions.
                  flex: weights?.[index] ?? 1,
                  height: tall,
                  backgroundColor: member.hex,
                  /*
                   * WHERE TWO SAMPLES MEET THERE IS NO LINE AND NO CORNER.
                   *
                   * The outer edges get the tone chosen against their own sample; the inner
                   * ones get nothing. A line between two samples is an induced edge sitting
                   * exactly where the judgement happens — and a corner there would put a wedge
                   * of well between them, which is the same failure drawn more slowly.
                   */
                  borderTopWidth: KEYLINE,
                  borderBottomWidth: KEYLINE,
                  borderLeftWidth: first ? KEYLINE : 0,
                  borderRightWidth: end ? KEYLINE : 0,
                  borderColor: edge,
                  borderTopLeftRadius: first ? corner.sample : 0,
                  borderBottomLeftRadius: first ? corner.sample : 0,
                  borderTopRightRadius: end ? corner.sample : 0,
                  borderBottomRightRadius: end ? corner.sample : 0,
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function Pair({ a, b, height, script = 'latin', testID }: PairProps): React.JSX.Element {
  const halves = [a, b] as const;

  return (
    <View style={{ gap: nativeSpacing.sm }}>
      <Strip
        members={halves}
        {...(height === undefined ? {} : { height })}
        {...(testID === undefined ? {} : { testID })}
      />

      {/*
        BENEATH, NOT BESIDE. The labels sit under their own half and stay out of the space
        between the samples — which is the space this component exists to keep empty.

        Outside the well rather than inside it, so the text is on the page's own ground and the
        well stays what it is for: the neutral the SAMPLES are read against.
      */}
      <View style={{ flexDirection: 'row', gap: nativeSpacing.sm }}>
        {halves.map((half, index) => (
          <View
            key={index === 0 ? 'a' : 'b'}
            style={{ flex: 1, alignItems: index === 0 ? 'flex-start' : 'flex-end' }}
          >
            <Text size="small" color="foreground" script={script}>
              {half.name}
            </Text>
            {/* Tabular and selectable, like every other colour value in the app (C9). */}
            <Text size="xs" color="foreground.2" numeric selectable>
              {half.hex}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * How wide each half comes out when the pair is given `available` dp to live in.
 *
 * Exported so a test can assert the pair fits the narrowest supported phone rather than
 * asserting a width somebody measured once — the well's padding and the ring are part of the
 * arithmetic, and a test that re-typed them would drift the first time either changed.
 */
export function halfWidth(available: number): number {
  return (available - 2 * nativeSpacing.sm - 2 * KEYLINE) / 2;
}

/** Re-exported so the ring rule is testable without reaching into the module's internals. */
export { ringAgainst as pairRingTone };
