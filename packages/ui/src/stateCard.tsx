/**
 * The card `27` draws each of its four states on (F-236, ADR-0128 §2).
 *
 * One composition, so the four cannot drift apart: a level-1 card with its edge, padded alike on
 * every side; the picture `xxl` below the padding, centred; the title `xl` under it (or under the
 * working state's steps), centred, a heading; the body `md` under the title, centred; and, where the
 * state offers one, its action at the card's foot over a spacer of at least `xxl` — so a card given
 * its host's height puts the action where `27` draws it, and a card sized by its content still
 * separates the two.
 *
 * Copy is the caller's (ADR-0056): this composes, it never words. Every part has a fixed `testID`
 * (`state.<kind>.<part>`), so a screen's declaration can be held to what it renders (ADR-0129).
 */

import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Button } from './Button.js';
import { Card } from './Card.js';
import type { Script } from './layout.js';
import { STATE_LAYOUT, STATE_PICTURES } from './stateBoard.js';
import { Text } from './Text.js';

/** The four states `27` draws, by the kind of nothing each one is. */
export type StateKind = 'empty' | 'working' | 'refused' | 'denied';

/** Each state's root `testID`: what a screen's declaration is checked against (ADR-0129). */
export const STATE_TEST_IDS = {
  empty: 'state.empty',
  working: 'state.working',
  refused: 'state.refused',
  denied: 'state.denied',
} as const satisfies Readonly<Record<StateKind, string>>;

/** What a state offers to do, what to call it, and — where the word alone does not say — what happens. */
export interface StateAction {
  readonly label: string;
  readonly onPress: () => void;
  /** Read after the label where it does not say what follows: *Opens the Settings app*. */
  readonly hint?: string;
}

export interface StateCardProps {
  readonly kind: StateKind;
  /** The state's picture, sized by the caller. */
  readonly picture: React.ReactNode;
  /**
   * Whether the picture says nothing a person needs — every state's but the working one, whose ring
   * is a reading (a `progressbar`) and hides only its own centre. Hidden by default.
   */
  readonly pictureIsRead?: boolean;
  /** The picture's slot height, in dp: the picture is centred in it. */
  readonly pictureHeight: number;
  /** What sits between the picture and the title: the working state's steps. */
  readonly between?: React.ReactNode;
  readonly title: string;
  readonly body: string;
  readonly action?: StateAction;
  /**
   * Said once, when the state appears, where it changes under a person rather than being navigated
   * to: the working and refused states. Never again on a re-render (ADR-0128 §7).
   */
  readonly announce?: string;
  readonly script: Script;
}

export function StateCard({
  kind,
  picture,
  pictureHeight,
  pictureIsRead = false,
  between,
  title,
  body,
  action,
  announce,
  script,
}: StateCardProps): React.JSX.Element {
  const id = STATE_TEST_IDS[kind];
  useEffect(() => {
    // Keyed to the words: a new refusal is news, the same one drawn again is not.
    if (announce !== undefined) AccessibilityInfo.announceForAccessibility(announce);
  }, [announce]);
  return (
    <Card level="1" edge padding={STATE_LAYOUT.padding} fill testID={id}>
      <View style={{ flexGrow: 1 }}>
        <View
          testID={`${id}.picture`}
          {...(pictureIsRead
            ? {}
            : {
                accessible: false,
                accessibilityElementsHidden: true,
                importantForAccessibility: 'no-hide-descendants' as const,
              })}
          style={{
            marginTop: nativeSpacing[STATE_LAYOUT.pictureTop],
            height: pictureHeight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {picture}
        </View>
        {between}
        <View testID={`${id}.title`} style={{ marginTop: nativeSpacing[STATE_LAYOUT.titleTop] }}>
          <Text size="title" color="foreground" script={script} heading align="center">
            {title}
          </Text>
        </View>
        <View testID={`${id}.body`} style={{ marginTop: nativeSpacing[STATE_LAYOUT.bodyTop] }}>
          <Text size="body" color="foreground" script={script} align="center">
            {body}
          </Text>
        </View>
        {action === undefined ? null : (
          <>
            <View style={{ flexGrow: 1, minHeight: nativeSpacing[STATE_LAYOUT.actionMin] }} />
            <Button
              testID={`${id}.action`}
              label={action.label}
              onPress={action.onPress}
              height={STATE_PICTURES.action.height}
              script={script}
              {...(action.hint === undefined ? {} : { accessibilityHint: action.hint })}
            />
          </>
        )}
      </View>
    </Card>
  );
}
