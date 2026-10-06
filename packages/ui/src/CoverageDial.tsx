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
 */

import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

/** A point on a circle, `degrees` clockwise from the top. */
function at(cx: number, cy: number, r: number, degrees: number): string {
  const a = (degrees * Math.PI) / 180;
  const round = (v: number): string => String(Math.round(v * 1000) / 1000);
  return `${round(cx + r * Math.sin(a))} ${round(cy - r * Math.cos(a))}`;
}

/** An arc's path, clockwise from `from` through `sweep` degrees. */
export function dialArc(cx: number, cy: number, r: number, from: number, sweep: number): string {
  const large = sweep > 180 ? 1 : 0;
  return `M${at(cx, cy, r, from)}A${String(r)} ${String(r)} 0 ${String(large)} 1 ${at(cx, cy, r, from + sweep)}`;
}

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
  const fill = fraction * DIAL_SWEEP;
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
        {fill > 0 ? (
          <Path
            d={dialArc(c, c, DIAL_RADIUS, start, fill)}
            fill="none"
            stroke={colors.foreground}
            strokeWidth={DIAL_STROKE}
            strokeLinecap="round"
          />
        ) : null}
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
