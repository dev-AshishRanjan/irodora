/**
 * What a screen shows when its data is in each condition it can reach (F-236, ADR-0129).
 *
 * Before F-236 nothing recorded it: a screen drew an `EmptyState`, an inline sentence, a bare `0`
 * or nothing, and a forgotten branch failed silently because the conformance suite checks only what
 * it is given. So every module in `src/screens/` exports `STATES`, and the declarations test in
 * `screens.test` holds the registry to it in both directions.
 *
 * ## A condition is a state of the data a panel exists to show
 *
 * Four, each shown by one of ADR-0128's states. Two things are deliberately NOT conditions:
 * feedback about an action just taken (the Lens's `failed`, AddGarment's refused file, Export's
 * saved or failed message), where the panel's data has not changed state; and a fault
 * (`CameraUnavailable`, the error boundary), which is a build or platform defect, not data.
 */

import type { StateKind } from '@irodora/ui';

/**
 * - `absent`: the panel has nothing to show.
 * - `pending`: the data is being produced, and the time is real. F-152 found the stores' reads
 *   synchronous, so only a capture is ever pending.
 * - `refused`: the pipeline declined the input, with a reason.
 * - `notPermitted`: the platform has not granted what the panel needs.
 */
export type DataCondition = 'absent' | 'pending' | 'refused' | 'notPermitted';

/** The one state each condition shows (ADR-0129 §1). A declaration cannot pair them otherwise. */
export const CONDITION_STATE = {
  absent: 'empty',
  pending: 'working',
  refused: 'refused',
  notPermitted: 'denied',
} as const satisfies Readonly<Record<DataCondition, StateKind>>;

/**
 * A screen's declaration: each condition it can reach, and the state it shows there.
 *
 * An empty record is a declaration — the screen has no condition to show — never an omission,
 * because the module must export the name (ADR-0129 §2). Each value is fixed by its key, so
 * `{ absent: 'working' }` is a type error.
 */
export type ScreenStates = {
  readonly [C in DataCondition]?: (typeof CONDITION_STATE)[C];
};

/** The states a declaration shows: what a registry subject of that screen may claim to render. */
export type ShownBy<S extends ScreenStates> = Extract<S[keyof S], StateKind>;

/** The states a declaration shows, at run time, in the conditions' order. */
export function shownBy(states: ScreenStates): readonly StateKind[] {
  return (Object.keys(CONDITION_STATE) as DataCondition[]).flatMap((c) => {
    const shown = states[c];
    return shown === undefined ? [] : [shown];
  });
}
