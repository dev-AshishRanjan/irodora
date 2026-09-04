/**
 * What a capture is.
 *
 * ## The concept the Lens did not have
 *
 * Three symptoms were reported from a device — the result panel could not be dismissed, the
 * live mode was *"uncontrolled and unusable"*, and there was no way to stop it. They are one
 * absence: **the Lens had no idea what a capture was.** It sampled every frame, pushed a new
 * `LensReading` several times a second, and the panel was opened by the arrival of a reading.
 *
 * F-158's fix for that was a dismissal latch, and the note it shipped with called itself a
 * stopgap. It was: a latch answers *"has this person closed it"* while the real question is
 * *"is there a capture to show"*. Ask the second question and the latch disappears — **the
 * panel is open exactly when {@link CaptureState.held} is not null**, and dismissing it clears
 * the capture rather than remembering that somebody said no.
 *
 * ## Why the whole machine lives here and not in the screen
 *
 * A `Sheet` renders the same tree open or shut — gorhom mounts its content either way and
 * visibility is animation state on the UI thread — so a rendered test cannot see any of this.
 * That was true of the latch and it is true of the capture. What a test *can* see is a
 * sequence, so the sequence is the unit and the screen is left with no state at all.
 *
 * The screen being stateless has a second payoff the latch never had: every state a person can
 * reach is a prop, so the conformance registry can draw all four of them.
 */

import type { CaptureMode } from './modes';
import type { LensReading } from './reading';

/**
 * How the Lens takes readings.
 *
 * `still` is the default, and it is the whole of the fix: **a camera that is not asked for a
 * colour does not read one.** `live` is FR-13's continuous pick, which somebody chooses.
 *
 * NOT named `manual` and `auto`, which is how the two were described when they were reported.
 * `manual` is already one of `CAPTURE_MODES` in [`modes.ts`](./modes.ts) and it means a **typed
 * hex** — a value nobody measured. Two things called manual in one folder, one of them a camera
 * reading and the other the absence of one, is a trap for whoever reads this next.
 */
export const LENS_MODES = ['still', 'live'] as const;
export type LensMode = (typeof LENS_MODES)[number];

/** A reading, and what it was taken for. */
export type CaptureKind = 'live' | 'capture';

/**
 * What the frame processor is being asked for.
 *
 * `off` is a real answer and it is the common one: in `still` mode at rest, and whenever a
 * result is on screen, **nothing is sampled at all**. The worklet reads this before it touches
 * the pixel buffer, so an idle Lens costs one compare per frame rather than a walk over a
 * region, a bridge hop and a render.
 */
export type SampleDemand = 'off' | CaptureKind;

export interface CaptureState {
  readonly mode: LensMode;
  /**
   * The capture being shown, frozen.
   *
   * **The result panel is open if and only if this is not null.** There is no separate `open`
   * flag, because a second source of truth for one fact is how the panel came to be open
   * without a capture behind it.
   */
  readonly held: LensReading | null;
  /**
   * The running readout, in `live` mode only.
   *
   * FR-13 wants name, hex and OKLCh live, and this is that value — deliberately NOT the same
   * field as {@link CaptureState.held}. A live number that moves is a different thing from a
   * reading somebody took, and giving them one field is what made a moving number look like a
   * result.
   */
  readonly live: LensReading | null;
  /** The shutter has been pressed and no frame has come back yet. */
  readonly awaiting: boolean;
  /**
   * The last capture asked for a frame and never got one.
   *
   * A flag rather than nothing, because the alternative is a button that goes back to its
   * resting label with no explanation — a silent failure in the one interaction this feature
   * exists to make deliberate.
   */
  readonly failed: boolean;
}

export type CaptureEvent =
  /** The person asked for a reading. */
  | { readonly kind: 'shutter' }
  /** A frame produced a reading, under the demand it was sampled for. */
  | { readonly kind: 'reading'; readonly reading: LensReading; readonly of: CaptureKind }
  /** The person closed the result — the scrim, the handle, or a drag. */
  | { readonly kind: 'dismissed' }
  /** The person chose a mode. Choosing `still` while live is running is the stop. */
  | { readonly kind: 'mode'; readonly mode: LensMode }
  /** Long enough has passed that the capture is not coming. */
  | { readonly kind: 'timeout' };

export const CAPTURE_IDLE: CaptureState = {
  mode: 'still',
  held: null,
  live: null,
  awaiting: false,
  failed: false,
};

/**
 * How long a capture waits for a frame before it admits nothing arrived.
 *
 * Longer than the viewfinder's own 2 s diagnostic, on purpose: that one names *why* no frame
 * reached the app, and it should have said so before this gives up. A person who sees "nothing
 * was read" also sees the reason, rather than the two racing.
 */
export const CAPTURE_TIMEOUT_MS = 4000;

/**
 * The next state.
 *
 * Returns `prev` unchanged whenever nothing moved. That is not a micro-optimisation here: in
 * `live` mode this runs at frame rate, and a reducer that allocated a new object per frame
 * would re-render the screen several times a second for a value nobody could see change.
 */
export function nextCapture(prev: CaptureState, event: CaptureEvent): CaptureState {
  switch (event.kind) {
    case 'shutter':
      // Pressing again while a result is up is a RE-CAPTURE, not a no-op: the person is
      // looking at the frame behind the panel and asking for that instead.
      return prev.awaiting ? prev : { ...prev, held: null, awaiting: true, failed: false };

    case 'reading':
      if (event.of === 'capture') {
        // A capture reading with nothing awaiting it is a frame that was already in flight when
        // the shutter was released. Dropping it is right — showing a result nobody asked for is
        // the behaviour this feature exists to remove.
        return prev.awaiting
          ? { ...prev, held: event.reading, awaiting: false, failed: false }
          : prev;
      }
      // A live reading never disturbs a capture, in either direction: not while one is being
      // waited for, and not while one is on screen.
      return prev.awaiting || prev.held !== null ? prev : { ...prev, live: event.reading };

    case 'dismissed':
      /*
       * THE CAPTURE GOES WITH THE PANEL, and that is the whole of F-158's defect undone.
       *
       * `live` is deliberately kept: in live mode the next frame overwrites it within about a
       * fiftieth of a second, and clearing it would blank the readout for one frame every time
       * somebody closed a result.
       */
      return prev.held === null ? prev : { ...prev, held: null };

    case 'mode':
      // A mode change starts clean. Carrying a held capture across it would leave a result on
      // screen belonging to an interaction the person has just left.
      return prev.mode === event.mode
        ? prev
        : { mode: event.mode, held: null, live: null, awaiting: false, failed: false };

    case 'timeout':
      return prev.awaiting ? { ...prev, awaiting: false, failed: true } : prev;
  }
}

/**
 * What the frame processor should be doing, derived rather than stored.
 *
 * Derived because a stored copy is a second statement of the same fact, and the failure mode
 * is the specific one this feature is fixing: a camera that keeps sampling because something
 * forgot to tell it to stop.
 *
 * **A result on screen switches sampling off.** Not an optimisation — numbers moving underneath
 * a panel somebody is reading is what "uncontrolled" meant.
 */
export function demandFor(state: CaptureState): SampleDemand {
  if (state.awaiting) return 'capture';
  if (state.held !== null) return 'off';
  return state.mode === 'live' ? 'live' : 'off';
}

/**
 * Which of `CAPTURE_MODES` a reading is read under.
 *
 * A deliberate capture is FR-15's **precision pick** — the PRD's J2 journey names this exact
 * interaction that way — and `MODE_CEILING`'s own note says live's lower ceiling is there
 * because *"the person has not chosen a region and the camera has not settled"*. Both of those
 * are false of a frame taken because somebody aimed and pressed.
 *
 * [ADR-0091](../../../../docs/adr/0091-a-deliberate-capture-is-fr-15s-precision-pick.md) is
 * where that is argued against
 * [ADR-0087](../../../../docs/adr/0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md),
 * which refused a ceiling raise for calibrated mode. The short version: nothing here claims a
 * capture is more accurate. It stops applying a penalty whose stated reason does not apply, and
 * the confidence is still bounded by the capture space, the illumination and the quality —
 * the observed inputs.
 */
export function modeFor(kind: CaptureKind): CaptureMode {
  return kind === 'capture' ? 'precision' : 'live';
}
