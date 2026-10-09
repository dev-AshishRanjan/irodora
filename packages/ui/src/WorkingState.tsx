/**
 * The working state — a capture in flight (F-236; mockup 27, `27.lens-working`).
 *
 * `27` draws the ring with the tinted mark and its glow at the centre, two monospace steps, a
 * heading and a body, and no action. Each part binds something real (ADR-0128 §6):
 *
 * - **The ring's value is the share of the pipeline's steps done** (D4) — the caller's, never a
 *   percentage nobody computed. `27`'s 61 % is sample content (E1).
 * - **The steps are the pipeline's**: the one under way, and the one that follows (D5). What `27`
 *   prints there are claims an RGB camera cannot make (E2, §4 row 27), so the caller passes the
 *   real ones.
 * - **The mark is the one tinted mark** (C10, `MARK_TINT`), and its glow is `27`'s: a disc blurred,
 *   read by `glow-fit.mjs --radial` and drawn here, from the same three numbers, as concentric discs
 *   of the tint at solved fill opacities (`glowDiscs`).
 *
 * The state is announced once when it appears, and the ring is a `progressbar` a person can ask.
 */

import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { nativeSpacing } from '@irodora/design-tokens';
import { Mark, MARK_TINT } from './brand.js';
import { Chip } from './Chip.js';
import type { Script } from './layout.js';
import { ProgressRing } from './ProgressRing.js';
import { glowDiscs, STATE_LAYOUT, STATE_PICTURES, STATE_RING } from './stateBoard.js';
import { StateCard, STATE_TEST_IDS } from './stateCard.js';
import { useTheme } from './theme.js';

export interface WorkingStateProps {
  /** *Analysing Fabric Colour…* */
  readonly title: string;
  readonly body: string;
  /** The step under way, and the step that follows — the pipeline's own (D5). */
  readonly steps: readonly [string, string];
  /**
   * How far the pipeline has got: its share of steps done (D4), that share in words, and the ring's
   * own name. The name is not the heading, which a screen reader has just read (F-236's review,
   * M10): *Capture progress*, then *Step 1 / 2*.
   */
  readonly progress: { readonly value: number; readonly text: string; readonly label: string };
  readonly script?: Script;
  /** Take the host's height, the action at the foot (27): only where the host bounds it. */
  readonly fill?: boolean;
}

/** The glow's discs, solved once: they depend on 27's numbers alone. */
const DISCS = glowDiscs();

/** `27`'s glow behind the mark: discs of the mark's tint, fading to nothing at their reach. */
function StateGlow(): React.JSX.Element {
  const { colors } = useTheme();
  const { reach } = STATE_PICTURES.glow;
  return (
    <Svg
      testID={`${STATE_TEST_IDS.working}.glow`}
      width={2 * reach}
      height={2 * reach}
      fill="none"
      accessible={false}
      style={{ position: 'absolute' }}
    >
      {DISCS.map((disc) => (
        <Circle
          key={String(disc.r)}
          cx={reach}
          cy={reach}
          r={disc.r}
          fill={colors[MARK_TINT]}
          fillOpacity={disc.opacity}
        />
      ))}
    </Svg>
  );
}

export function WorkingState({
  title,
  body,
  steps,
  progress,
  script = 'latin',
  fill = false,
}: WorkingStateProps): React.JSX.Element {
  const id = STATE_TEST_IDS.working;
  return (
    <StateCard
      kind="working"
      pictureHeight={STATE_RING.size}
      pictureIsRead
      picture={
        <ProgressRing
          testID={`${id}.progress`}
          value={progress.value}
          label={progress.label}
          valueText={progress.text}
        >
          <StateGlow />
          <Mark size={STATE_PICTURES.mark.size} color={MARK_TINT} />
        </ProgressRing>
      }
      between={
        <View
          testID={`${id}.steps`}
          style={{
            marginTop: nativeSpacing[STATE_LAYOUT.stepsTop],
            gap: nativeSpacing[STATE_LAYOUT.stepGap],
          }}
        >
          {steps.map((step, i) => (
            // A row, so each chip is centred by the row and keeps its own width.
            <View key={String(i)} style={{ flexDirection: 'row', justifyContent: 'center' }}>
              <Chip
                form="badge"
                label={step}
                mono
                fill="surface.3"
                radius="sm"
                height={STATE_PICTURES.step.height}
                script={script}
                testID={`${id}.step-${String(i + 1)}`}
              />
            </View>
          ))}
        </View>
      }
      title={title}
      body={body}
      announce={title}
      script={script}
      fill={fill}
    />
  );
}
