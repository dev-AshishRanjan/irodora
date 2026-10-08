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
 * - **Decorative.** It says nothing: its one caller, the splash's line, sits on an overlay the screen
 *   reader never stops on. A line a person must be told about is a `progressbar` with a label and a
 *   value, and it arrives with its first caller rather than ahead of it (F-231's review, M7).
 */

import { StyleSheet, View } from 'react-native';
import { nativeRadius } from '@irodora/design-tokens';
import { useTheme } from './theme.js';

/** The line's thickness, in dp: `14.splash.progress`'s 3.1 px at 1.3521 dp/px, to the half dp. */
export const PROGRESS_TRACK = 4;

export interface ProgressBarProps {
  /** How far, from 0 to 1. */
  readonly value: number;
  readonly testID?: string;
}

export function ProgressBar({ value, testID }: ProgressBarProps): React.JSX.Element {
  const { colors } = useTheme();
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError(`ProgressBar: value ${String(value)} is not a fraction in [0, 1]`);
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
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
