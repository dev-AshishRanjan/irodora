/**
 * The refused state — a capture too poor to read (F-236; mockup 27, `27.lens-refused`).
 *
 * `27` draws an amber-edged plate with a slashed sun, a heading, the reason, and *Retry Capture*.
 * Each part binds something real (ADR-0128 §6, D1):
 *
 * - **The heading names a reading refused, never a measurement** (E2, golden rule 11), and the
 *   check that failed; **the body is the engine's own reason** — the quantity, its threshold and its
 *   instruction. Both are the caller's: this never words a refusal.
 * - **No confidence is printed** (D10): `27` draws none, and a refused reading has none to give.
 * - **The picture is fixed** (D2): the glare plate for every refusal. It carries nothing the words do
 *   not, and is hidden.
 *
 * The state is announced once when it appears — its heading and its reason — and never again for
 * the same refusal.
 */

import { View } from 'react-native';
import { nativeRadius } from '@irodora/design-tokens';
import { Glyph } from './Glyph.js';
import type { Script } from './layout.js';
import { STATE_PICTURES } from './stateBoard.js';
import { StateCard, STATE_TEST_IDS, type StateAction } from './stateCard.js';
import { useTheme } from './theme.js';

export interface RefusedStateProps {
  /** *Reading Refused: Glare* — never *measurement*. */
  readonly title: string;
  /** The engine's reason: what was read, against what threshold, and what to do. */
  readonly body: string;
  /** *Retry Capture*. */
  readonly retry: StateAction;
  readonly script?: Script;
}

export function RefusedState({
  title,
  body,
  retry,
  script = 'latin',
}: RefusedStateProps): React.JSX.Element {
  const { colors } = useTheme();
  const { plate } = STATE_PICTURES;
  return (
    <StateCard
      kind="refused"
      pictureHeight={plate.size}
      picture={
        <View
          testID={`${STATE_TEST_IDS.refused}.plate`}
          style={{
            width: plate.size,
            height: plate.size,
            borderRadius: nativeRadius[plate.radius],
            borderWidth: plate.edge,
            borderColor: colors['state.refused.edge'],
            backgroundColor: colors['state.refused.plate'],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Glyph
            name="glare"
            size={plate.glyph}
            stroke={plate.stroke}
            color={colors['state.refused.glyph']}
            tints={{ slash: colors['state.refused.edge'] }}
          />
        </View>
      }
      title={title}
      body={body}
      action={retry}
      announce={`${title}. ${body}`}
      script={script}
    />
  );
}
