/**
 * The Lens result sheet, as a sequence.
 *
 * ## Why this is not a screen test
 *
 * Probed rather than assumed: a `Sheet` renders the SAME TREE whether it is open or shut.
 * gorhom mounts its content either way and visibility lives in animation state on the UI thread,
 * so `queryByText` finds the title, the scrim and the children in both cases — a screen test
 * would have passed against the broken version and the fixed one identically.
 *
 * That is one step past [[the-first-animated-portal-breaks-two-harness-assumptions-at-once]]:
 * there, reachable was not mounted; here, **mounted is not visible**.
 */

import { nextSheetState, SHEET_CLOSED, type SheetEvent, type SheetState } from '../src/lens/sheet';

/** Replay a sequence of events, as a device produces them. */
const after = (...events: readonly SheetEvent[]): SheetState =>
  events.reduce(nextSheetState, SHEET_CLOSED);

const reading = { kind: 'reading' } as const;
const dismissed = { kind: 'dismissed' } as const;
const requested = { kind: 'requested' } as const;

describe('the Lens result sheet', () => {
  it('opens on the first reading', () => {
    expect(after(reading)).toEqual({ open: true, dismissed: false });
  });

  it('STAYS SHUT while the camera keeps reading — the defect, as a sequence', () => {
    // THE ONE THAT MATTERS. The Lens pushes a new reading several times a second, and the old
    // implementation opened the sheet on each one, so a dismissal survived for a single frame.
    // Four frames is a fifth of a second on a device and an eternity to a person tapping away.
    const state = after(reading, dismissed, reading, reading, reading, reading);
    expect(state.open).toBe(false);
  });

  it('opens again when the person asks, and the next frame does not undo it', () => {
    // The latch has to CLEAR on request, or reopening would last exactly until the next frame
    // and the panel could be closed once and never seen again.
    const state = after(reading, dismissed, requested, reading, reading);
    expect(state).toEqual({ open: true, dismissed: false });
  });

  it('does not thrash while it is already open', () => {
    // Identity, not equality: a reducer that returned a NEW object for every frame would
    // re-render this screen four times a second for a value that had not changed.
    const open = after(reading);
    expect(nextSheetState(open, reading)).toBe(open);
  });

  it('is shut before anything has happened', () => {
    // The decoy. A fix that simply never opened the sheet would satisfy every assertion above
    // except the first, and this states the starting point it has to move from.
    expect(SHEET_CLOSED).toEqual({ open: false, dismissed: false });
    expect(after()).toEqual(SHEET_CLOSED);
  });
});
