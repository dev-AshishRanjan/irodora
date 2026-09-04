/**
 * When the Lens result sheet is open.
 *
 * ## Why this is a module and not four lines in the screen
 *
 * It was four lines in the screen, and they were wrong on a device in a way no test could see.
 *
 * F-158 wrote `useEffect(() => { if (reading !== null) setSheetOpen(true) }, [reading])`, on the
 * reasoning that a dismissal means *let me see the frame* and the next reading is a new answer.
 * That is true of a capture somebody takes. **The Lens does not take captures** — it reads
 * continuously and pushes a new `LensReading` several times a second, so the effect re-fired on
 * every frame and forced the panel back open. Reported from a device as *"we are not able to go
 * back"*.
 *
 * ## And why a rendered test could not have caught it
 *
 * Probed rather than assumed: a `Sheet` renders **exactly the same tree** whether it is open or
 * shut. gorhom mounts its content either way and visibility lives in animation state on the UI
 * thread, so `queryByText` finds the title, the scrim and the children in both cases.
 *
 * That is the same family as [[the-first-animated-portal-breaks-two-harness-assumptions-at-once]],
 * one step further along: there, reachable was not mounted; here, **mounted is not visible**. A
 * screen test asserting on this would have passed against the broken version and the fixed one.
 *
 * So the decision moves out of the component to somewhere a sequence can be asserted, and
 * "the panel is actually visible" stays a device criterion — which is what F-160 attests.
 */

/** What has happened to the sheet, and what the person did about it. */
export interface SheetState {
  readonly open: boolean;
  /**
   * Whether this person has closed it.
   *
   * Latched, and it is the whole fix: without it, "should the sheet be open" is answered by
   * "is there a reading", which is `true` four times a second forever.
   */
  readonly dismissed: boolean;
}

export type SheetEvent =
  /** A frame produced a reading. Happens continuously while the camera is live. */
  | { readonly kind: 'reading' }
  /** The person closed the panel — the scrim, the handle, or a drag. */
  | { readonly kind: 'dismissed' }
  /** The person asked for it back, having closed it. F-160's manual capture is this event. */
  | { readonly kind: 'requested' };

export const SHEET_CLOSED: SheetState = { open: false, dismissed: false };

/**
 * The next state.
 *
 * A reading opens the sheet **only if it has not been dismissed**. Everything else follows from
 * that one clause, and it is the clause that was missing.
 */
export function nextSheetState(prev: SheetState, event: SheetEvent): SheetState {
  switch (event.kind) {
    case 'reading':
      return prev.dismissed || prev.open ? prev : { open: true, dismissed: false };
    case 'dismissed':
      return { open: false, dismissed: true };
    case 'requested':
      // Asking for it back clears the latch, or the next frame would close it again and the
      // person would be unable to reopen what they had closed once.
      return { open: true, dismissed: false };
  }
}
