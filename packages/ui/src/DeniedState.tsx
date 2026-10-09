/**
 * The denied state — the Lens without the camera (F-236; mockup 27, `27.lens-permission`).
 *
 * `27` draws the camera with a padlock over its corner, a heading, a body, and *Open Device
 * Settings*. Where the permission has not been asked for yet, the same card offers *Allow Camera
 * Access* instead (D6, §4 E4): there is nothing in settings to open before the first request, and
 * both platforms require it in context. Which action, and its words, are the caller's.
 *
 * The camera is 27's drawing (`camera-locked`, re-drawn by F-236) at its own line, the padlock in
 * the state's tint. It says nothing the words do not, and is hidden. The action carries a hint,
 * because *Open Device Settings* leaves the app.
 */

import { Glyph } from './Glyph.js';
import type { Script } from './layout.js';
import { STATE_PICTURES } from './stateBoard.js';
import { StateCard, type StateAction } from './stateCard.js';
import { useTheme } from './theme.js';

export interface DeniedStateProps {
  /** *Camera Access Needed*. */
  readonly title: string;
  readonly body: string;
  /** *Open Device Settings*, or *Allow Camera Access* before the first request (D6). */
  readonly action: StateAction;
  readonly script?: Script;
  /** Take the host's height, the action at the foot (27): only where the host bounds it. */
  readonly fill?: boolean;
}

export function DeniedState({
  title,
  body,
  action,
  script = 'latin',
  fill = false,
}: DeniedStateProps): React.JSX.Element {
  const { colors } = useTheme();
  const { camera, plate } = STATE_PICTURES;
  return (
    <StateCard
      kind="denied"
      // The refused plate's slot: 27 centres both pictures on one line under their titles.
      pictureHeight={plate.size}
      picture={
        <Glyph
          name="camera-locked"
          size={camera.size}
          stroke={camera.stroke}
          color={colors.foreground}
          tints={{ lock: colors['state.lock'] }}
        />
      }
      title={title}
      body={body}
      action={action}
      script={script}
      fill={fill}
    />
  );
}
