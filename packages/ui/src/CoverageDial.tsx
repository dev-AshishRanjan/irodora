/**
 * The coverage dial — a share drawn as an open arc, with its figure and label inside (F-235,
 * criterion 2; mockup 11).
 *
 * `11` draws a ring open at the bottom: a 276° sweep on its centre line, an 84° gap, round caps, the
 * fill in `text.primary` from the left end clockwise over a `border.strong` track, and inside it the
 * figure (`title` 600, tabular) over a two-line `caption` label. Every number is `11`'s, recomputed
 * by `charts.test`.
 *
 * - **The arc and the figure are one value.** `11` fills 249° of its sweep (0.90) beside a printed
 *   84 %: the drawing's sample arc and sample number disagree. The dial takes a `fraction` and draws
 *   both from it, so they cannot. There is no `figure` prop.
 * - **One accessible element**, an image named by its share: *Wardrobe Coverage 84%*. The arc says
 *   nothing of its own.
 * - **The track is decorative** (R9 §4 E3): the figure states the share, so the track's 1.85:1 on the
 *   card is the drawn ink, kept.
 * - **A change of share moves the arc, and replaces the figure** (F-266, ADR-0133 §3, §4): the fill
 *   is an `ArcFill` whose dash moves over `view`; the printed figure and the spoken name change at
 *   once. A figure is never counted.
 */

import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArcFill } from './ArcFill.js';
import { dialArc } from './arcPath.js';
import { figureName, figureText, type ShareFigure } from './figures.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** The arc's centre-line radius, in dp. */
export const DIAL_RADIUS = 41.5;
/** The arc's stroke, in dp. Its ends are round. */
export const DIAL_STROKE = 6;
/** The open arc's sweep on its centre line, in degrees; the gap is centred at the bottom. */
export const DIAL_SWEEP = 276;
/** How far below the circle's centre the figure-and-label stack is centred, in dp. */
export const DIAL_TEXT_DROP = 9.5;

export interface CoverageDialProps {
  /** The share, 0 to 1: the arc's fill and the printed figure. */
  readonly fraction: number;
  /** What it is a share of: `Wardrobe Coverage`. Printed under the figure and spoken after it. */
  readonly label: string;
  readonly script?: Script;
  readonly testID?: string;
}

// The arc's geometry lives in `arcPath.ts` (F-266), shared with the ring and the moving fill; it is
// re-exported here so the dial's public API is unchanged.
export { dialArc } from './arcPath.js';

/** The dial's box, in dp: the full circle's width, and its height down to the caps' lowest point. */
export function dialSize(): { readonly width: number; readonly height: number } {
  const half = DIAL_RADIUS + DIAL_STROKE / 2;
  const gapHalf = (360 - DIAL_SWEEP) / 2;
  return {
    width: 2 * half,
    height: half + DIAL_RADIUS * Math.cos((gapHalf * Math.PI) / 180) + DIAL_STROKE / 2,
  };
}

export function CoverageDial({
  fraction,
  label,
  script = 'latin',
  testID,
}: CoverageDialProps): React.JSX.Element {
  const { colors } = useTheme();
  const share: ShareFigure = { kind: 'share', fraction, of: label };
  // Throws on a fraction outside 0–1 before anything is drawn.
  const printed = figureText(share);
  const { width, height } = dialSize();
  const c = DIAL_RADIUS + DIAL_STROKE / 2;
  const start = 180 + (360 - DIAL_SWEEP) / 2;
  // Padding the stack's box from the top by this centres it DIAL_TEXT_DROP below the circle's centre,
  // whatever the stack's height: the box's centre is then halfway between this and the bottom.
  const lift = (c + DIAL_TEXT_DROP) * 2 - height;
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessible
      accessibilityRole="image"
      accessibilityLabel={figureName(share)}
      style={{ width, height }}
    >
      {/* No default fill on the root: react-native-svg would inject black (FabricSwatch notes). */}
      <Svg width={width} height={height} fill="none" accessible={false}>
        <Path
          d={dialArc(c, c, DIAL_RADIUS, start, DIAL_SWEEP)}
          fill="none"
          stroke={colors['border.strong']}
          strokeWidth={DIAL_STROKE}
          strokeLinecap="round"
        />
        <ArcFill
          {...(testID === undefined ? {} : { testID: `${testID}.fill` })}
          cx={c}
          cy={c}
          r={DIAL_RADIUS}
          from={start}
          sweep={DIAL_SWEEP}
          value={fraction}
          color={colors.foreground}
          strokeWidth={DIAL_STROKE}
        />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: lift,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ maxWidth: 2 * DIAL_RADIUS - DIAL_STROKE, alignItems: 'center' }}>
          <Text size="title" weight={600} color="foreground" numeric selectable>
            {printed}
          </Text>
          <Text size="caption" color="foreground.2" script={script} align="center">
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}
