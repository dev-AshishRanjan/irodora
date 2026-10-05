/**
 * The proximity headline — how close a reading is to its target, in one line, over the two samples
 * (F-235, criterion 1; mockup 04).
 *
 * 04 draws, centred: the distance with its quantity (`ΔE00: 1.42`), its descriptor band in brackets
 * (`(Very Close Match)`), and a seal after a close match; under it the target and the reading side
 * by side; under that a two-line caption.
 *
 * - **The band's and the seal's ink are the caller's**, typed to the tokens that exist. 04 draws them
 *   green, which is F-245's to mint (C10): the band's words carry the verdict, so the colour never
 *   carries it alone (golden rule 13).
 * - **The seal is decorative**: the band's words say what it says, so a screen reader hears the
 *   distance and the band once.
 * - **The line is as tall as the seal whether or not the seal is drawn**, so the samples sit where 04
 *   draws them for every band.
 * - **The samples are the caller's** (a `Strip`): their height is OQ-45's, and their names are theirs.
 * - **The band's words are F-222's** — a descriptor band, never a claim of a match (FR-74, E2).
 */

import { View } from 'react-native';
import { figureName, figureText, type MeasureFigure } from './figures.js';
import { Glyph } from './Glyph.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** Between the distance, the band and the seal, in dp: 04's 6.5 and 7.5. */
export const HEADLINE_GAP = 7;
/** The seal, in dp: 04's drawn box. */
export const HEADLINE_SEAL = 32.5;
/** From the headline line, as tall as the seal whether or not it is drawn, to the samples, in dp. */
export const HEADLINE_PAIR_GAP = 9.5;
/** From the samples to the caption, in dp. */
export const HEADLINE_CAPTION_GAP = 8.5;

export interface ProximityHeadlineProps {
  /** The distance: a ΔE00 measure. Printed with its quantity, `ΔE00: 1.42`. */
  readonly distance: MeasureFigure;
  /** The descriptor band's words, printed in brackets. */
  readonly band: string;
  /** The band's and the seal's ink. 04's green is F-245's to mint (C10). */
  readonly ink: 'foreground' | 'foreground.2';
  /** Draw 04's seal after the band. */
  readonly seal?: boolean;
  /** The target and the reading, side by side: the caller's `Strip`. */
  readonly pair: React.ReactNode;
  readonly caption?: string;
  readonly script?: Script;
  readonly testID?: string;
}

export function ProximityHeadline({
  distance,
  band,
  ink,
  seal = false,
  pair,
  caption,
  script = 'latin',
  testID,
}: ProximityHeadlineProps): React.JSX.Element {
  const { colors } = useTheme();
  const [open, close] = script === 'japanese' ? ['（', '）'] : ['(', ')'];
  return (
    <View {...(testID === undefined ? {} : { testID })} style={{ alignItems: 'stretch' }}>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${figureName(distance)}, ${band}`}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          columnGap: HEADLINE_GAP,
          minHeight: HEADLINE_SEAL,
        }}
      >
        <Text size="body" weight={600} color="foreground" numeric selectable>
          {`${distance.quantity}: ${figureText(distance)}`}
        </Text>
        <Text size="body" weight={500} color={ink} script={script}>
          {`${open}${band}${close}`}
        </Text>
        {seal ? (
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Glyph name="seal-star" size={HEADLINE_SEAL} color={colors[ink]} />
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: HEADLINE_PAIR_GAP }}>{pair}</View>
      {caption === undefined ? null : (
        <View style={{ marginTop: HEADLINE_CAPTION_GAP }}>
          <Text size="caption" color="foreground.2" script={script} align="center" numeric>
            {caption}
          </Text>
        </View>
      )}
    </View>
  );
}
