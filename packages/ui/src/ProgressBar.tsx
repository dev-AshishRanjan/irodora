/**
 * A progress line — how far something has got, as a length (F-231; mockup 14, `14.splash.progress`).
 *
 * `14` draws it under the splash's wave: a thin pill track in `border.subtle` across the screen, its
 * filled part in `text.primary` from the leading end. The thickness is `14`'s, recomputed by
 * `progress-bar.test` from the inventory's reading.
 *
 * - **The value is a length, never a colour.** The fill and the track are one ink each and do not
 *   change; how much of the line is filled is the reading (golden rule 13 — length is the channel).
 * - **The fill is a `scaleX` from the leading edge, never a width.** A transform is what the motion
 *   system may animate (`motion.animatable`), so F-266 can move the value without a layout pass and
 *   without ever touching a colour. (Its rounded end scales with it: at 4 dp thick the end of a
 *   0.8 fill is an ellipse 1.6 dp by 2, which no one sees.)
 * - **Decorative unless named.** Without `label` it says nothing — the splash's line sits on an
 *   overlay the screen reader never stops on. With `label` it is a `progressbar` whose value is the
 *   whole percentage done, floored like every percentage the product prints (`floorPercent`).
 */

import { StyleSheet, View } from 'react-native';
import { nativeRadius } from '@irodora/design-tokens';
import { floorPercent } from './percent.js';
import { useTheme } from './theme.js';

/** The line's thickness, in dp: `14.splash.progress`'s 3.1 px at 1.3521 dp/px, to the half dp. */
export const PROGRESS_TRACK = 4;

export interface ProgressBarProps {
  /** How far, from 0 to 1. */
  readonly value: number;
  /**
   * What the line is the progress of, for a screen reader. Without it the line is decorative and
   * hidden from the accessibility tree.
   */
  readonly label?: string;
  readonly testID?: string;
}

export function ProgressBar({ value, label, testID }: ProgressBarProps): React.JSX.Element {
  const { colors } = useTheme();
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError(`ProgressBar: value ${String(value)} is not a fraction in [0, 1]`);
  const announced =
    label === undefined
      ? {
          accessibilityElementsHidden: true,
          importantForAccessibility: 'no-hide-descendants' as const,
        }
      : {
          accessible: true,
          accessibilityRole: 'progressbar' as const,
          accessibilityLabel: label,
          accessibilityValue: { min: 0, max: 100, now: floorPercent(value) },
        };
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      {...announced}
      style={{
        height: PROGRESS_TRACK,
        borderRadius: nativeRadius.pill,
        backgroundColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <View
        {...(testID === undefined ? {} : { testID: `${testID}.fill` })}
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: nativeRadius.pill,
            backgroundColor: colors.foreground,
            transformOrigin: 'left',
            transform: [{ scaleX: value }],
          },
        ]}
      />
    </View>
  );
}
