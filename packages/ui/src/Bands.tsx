/**
 * A labelled horizontal bar chart — the first thing in this product that plots anything.
 *
 * ## Why the ramp is near-achromatic, and what that obliges
 *
 * `chart.1`–`chart.5` are a five-step greyscale ramp, and the manifest says why in the reason it
 * gives for leaving them out of the contrast pairings:
 *
 * > *"A data series is separated from its neighbours by lightness, marker shape and a direct
 * > label, not by contrast against a surface — the greyscale ramp exists precisely so hue is not
 * > the channel."*
 *
 * That is golden rule 13 applied before there was anything to apply it to. The ramp was decided
 * ahead of the first chart so the decision could not be made under deadline, which is how a
 * rainbow palette gets shipped.
 *
 * ## The three channels here, and the one deliberately absent
 *
 * **Every band carries its own label and its own number, as text.** That is the channel that
 * makes this readable with no colour vision at all, and it is not a fallback — it is the primary
 * reading. The bar is the summary; the row is the data.
 *
 * **Lightness** separates the bars, in ramp order.
 *
 * **Marker shape is not used, and that is a considered omission rather than a gap.** Shape
 * separates SERIES — it tells one line from another. There is one series here and the ramp
 * encodes ORDER within it, so a shape channel would be distinguishing things that are not
 * different. The moment this renders two series, shape is the channel to reach for.
 *
 * ## What it deliberately is not
 *
 * No axes, no gridlines, no legend. A legend is a lookup table between colour and meaning, which
 * is the exact structure that fails for a colour-blind reader; direct labels remove the need for
 * one. Five bands is the whole vocabulary — if a caller needs more, the answer is a different
 * component, not a longer ramp.
 */

import { View, type DimensionValue } from 'react-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { useTheme } from './theme.js';
import { Text } from './Text.js';
import { Row, Stack, type Script } from './layout.js';

/** The ramp, in order. Five, because the manifest emits five. */
const RAMP = ['chart.1', 'chart.2', 'chart.3', 'chart.4', 'chart.5'] as const;

/** How many bands a single chart may hold. */
export const MAX_BANDS = RAMP.length;

/** The height of a bar. Not a spacing value — it is the mark itself. */
const BAR = 10;

export interface Band {
  /** What this band is, in words a person reads. Never a colour name. */
  readonly label: string;
  /** The quantity. Rendered as a number as well as a length. */
  readonly value: number;
}

export interface BandsProps {
  readonly bands: readonly Band[];
  /**
   * What the numbers are, in words — "garments", "outfits".
   *
   * Required, because a bare column of numbers is the thing this component exists to avoid. A
   * chart that does not say what it counts is a decoration.
   */
  readonly unit: string;
  readonly script?: Script;
  readonly testID?: string;
}

/**
 * Bands, longest bar scaled to the width.
 *
 * Proportional to the LARGEST value rather than to a total: these are counts of different
 * things, not shares of one thing, and drawing them as a proportion of a total would invite the
 * reading that they sum to something meaningful.
 */
export function Bands({ bands, unit, script = 'latin', testID }: BandsProps): React.JSX.Element {
  const { colors } = useTheme();
  const shown = bands.slice(0, MAX_BANDS);
  const largest = shown.reduce((max, b) => Math.max(max, b.value), 0);

  return (
    <Stack gap="sm" testID={testID}>
      {shown.map((band, index) => (
        <Stack key={band.label} gap="xs">
          <Row gap="sm">
            <Text size="small" color="foreground" script={script}>
              {band.label}
            </Text>
            {/*
              THE NUMBER, ALWAYS, AND WITH ITS UNIT. This is the reading that survives when the
              bar cannot be seen or compared — and for one band it is the ONLY reading, because
              a single bar scaled to itself is full whatever it counts.
            */}
            <Text size="small" color="foreground.2" numeric>
              {`${String(band.value)} ${unit}`}
            </Text>
          </Row>
          <View
            style={{
              height: BAR,
              borderRadius: nativeRadius.sm,
              // ZERO IS A WIDTH TOO. An empty band drawn as nothing is indistinguishable from a
              // band that is not there, and "no garments appear in this many outfits" is a fact
              // worth showing rather than a row to omit.
              // Cast for the same reason the Lens reticle needs one: `String()` satisfies
              // `restrict-template-expressions` and yields a plain `string`, while
              // `ViewStyle.width` wants the template-literal type. Safe by construction — the
              // expression is a number and the suffix is a literal `%`.
              width: (largest === 0
                ? '0%'
                : `${String((band.value / largest) * 100)}%`) as DimensionValue,
              minWidth: band.value === 0 ? 0 : nativeSpacing.xs,
              backgroundColor: colors[RAMP[index] ?? 'chart.5'],
            }}
          />
        </Stack>
      ))}
    </Stack>
  );
}
