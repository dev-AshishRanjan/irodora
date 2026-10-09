/**
 * An empty state that cannot be written without saying how somebody gets out of it — drawn as the
 * mockups draw the two kinds (F-236, ADR-0128 D3).
 *
 * ## The defect this exists for (F-139)
 *
 * `/wardrobe/add` was a route nothing linked to except the Lens, after a successful camera
 * reading. Open the wardrobe directly and there was no way to put anything in it. Three more screens
 * told you to go and do something and then gave you no way to get there. So the props are a
 * **discriminated union**, and there is no way to render an empty state without declaring which
 * kind it is — [ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)'s argument
 * applied to a product rule rather than to provenance:
 *
 * ```tsx
 * <EmptyState title={…} body={…} action={{ label: …, onPress: … }} />  // the fix is elsewhere
 * <EmptyState message={…} resolvedHere />                            // the fix is on this screen
 * ```
 *
 * **`resolvedHere` has no default, deliberately.** A default is a thing people accept without
 * reading, and accepting it is exactly the mistake being prevented.
 *
 * ## Each kind is the drawing the mockups make of it (F-236)
 *
 * - **The fix is elsewhere: `27`'s card.** The hanger with its blossom, a heading, a body, and the
 *   action at the card's foot — the composition every one of `27`'s states shares (`StateCard`).
 *   The picture is fixed (D2): `27` draws one, and an emptiness keyed to its own drawing would be a
 *   picture nobody drew.
 * - **The fix is on this screen: `00`'s empty.** Its small `no-results` drawing over a centred
 *   caption, and nothing to press: a second control for an on-screen fix would be a second way to do
 *   one thing (F-139). The drawing is sized against the caption — 4.5 of its em, as `00` draws it —
 *   since `00` is a board with no screen scale.
 *
 * Every part has a fixed `testID`: `state.empty`, and its picture, title, body, message and action
 * (ADR-0129). Copy is the caller's (ADR-0056).
 *
 * ## What it does not solve
 *
 * A screen that renders a bare `<Text>` for its empty branch bypasses this entirely, and `tsc`
 * cannot see that. ADR-0129's declarations and the blank-panel and zero rules are the check there.
 */

import { View } from 'react-native';
import { nativeSpacing, nativeType } from '@irodora/design-tokens';
import { Illustration, illustrationBox } from './Illustration.js';
import type { Script } from './layout.js';
import { STATE_PICTURES } from './stateBoard.js';
import { StateCard, STATE_TEST_IDS, type StateAction } from './stateCard.js';
import { Text } from './Text.js';

/** Where to go, and what to call it. The label is also the accessible name. */
export type EmptyAction = StateAction;

/**
 * `00`'s empty, by its own type (F-236): the drawing's width as a share of the caption's em, and
 * the step between them. `empty-state.test` recomputes both from `00`'s inventory.
 */
export const EMPTY_CAPTION = { artEms: 4.5, gap: 'sm' } as const;

/**
 * Exactly one of these, and the caller has to choose.
 *
 * `action` — the thing to do lives on ANOTHER screen, so this offers the route to it, on `27`'s
 * card with its heading and body. `resolvedHere` — the thing to do is on this screen already (a
 * search field, a filter to clear), so this says what is empty in `00`'s caption, and offers
 * nothing.
 */
export type EmptyStateProps =
  | {
      /** The heading: *Your Wardrobe is Empty*. */
      readonly title: string;
      /** What would fill it, in a sentence or two. */
      readonly body: string;
      readonly action: EmptyAction;
      /** Take the host's height, the action at the foot (27): only where the host bounds it. */
      readonly fill?: boolean;
      readonly resolvedHere?: never;
      readonly message?: never;
      readonly hint?: never;
      readonly script?: Script;
    }
  | {
      /** What is empty. One sentence, in the person's language. */
      readonly message: string;
      /** What would fill it, where the screen's own control does not say. Set after the message. */
      readonly hint?: string;
      readonly resolvedHere: true;
      readonly action?: never;
      readonly title?: never;
      readonly body?: never;
      readonly fill?: never;
      readonly script?: Script;
    };

export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  const script = props.script ?? 'latin';
  const id = STATE_TEST_IDS.empty;

  if (props.resolvedHere !== true) {
    const { hanger } = STATE_PICTURES;
    const [boxWidth, boxHeight] = illustrationBox('hanger');
    return (
      <StateCard
        kind="empty"
        pictureHeight={(hanger.width * boxHeight) / boxWidth}
        picture={
          <Illustration
            name="hanger"
            width={hanger.width}
            color="foreground"
            tint="state.hanger"
            stroke={hanger.stroke}
          />
        }
        title={props.title}
        body={props.body}
        action={props.action}
        fill={props.fill ?? false}
        script={script}
      />
    );
  }

  // One caption, as 00 draws one: the hint follows the message — after a space in Latin, directly
  // in Japanese, which sets no space between sentences.
  const caption =
    props.hint === undefined
      ? props.message
      : script === 'japanese'
        ? `${props.message}${props.hint}`
        : `${props.message} ${props.hint}`;
  return (
    <View testID={id} style={{ alignItems: 'center', gap: nativeSpacing[EMPTY_CAPTION.gap] }}>
      <View
        testID={`${id}.picture`}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Illustration name="no-results" width={emptyArtWidth(script)} color="foreground.2" />
      </View>
      <View testID={`${id}.message`}>
        <Text size="caption" color="foreground.2" script={script} align="center">
          {caption}
        </Text>
      </View>
    </View>
  );
}

/** The caption form's drawing width, in dp: `EMPTY_CAPTION.artEms` of the caption step's em. */
export function emptyArtWidth(script: Script = 'latin'): number {
  return Math.round(EMPTY_CAPTION.artEms * nativeType[script].caption.fontSize * 2) / 2;
}
