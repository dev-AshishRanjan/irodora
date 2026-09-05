/**
 * A capture, as a sequence.
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
 *
 * Replaces `lens-sheet.test.ts`, which asserted the dismissal latch F-158 shipped as a stopgap.
 * The latch is gone because the question it answered was the wrong one — see `capture.ts`.
 */

import {
  CAPTURE_IDLE,
  demandFor,
  modeFor,
  nextCapture,
  type CaptureEvent,
  type CaptureState,
} from '../src/lens/capture';
import { MODE_CEILING } from '../src/lens/modes';
import type { LensReading } from '../src/lens/reading';

/** A reading. The values are plausible and nothing here depends on them. */
const reading = (over: Partial<LensReading> = {}): LensReading => ({
  rgb: [0.78, 0.62, 0.5],
  space: 'srgb',
  usableSamples: 1400,
  variance: 0.004,
  illumination: 'daylight',
  quality: 'good',
  confidence: 0.7,
  instruction: '',
  ...over,
});

/** Replay a sequence of events, as a device produces them. */
const after = (...events: readonly CaptureEvent[]): CaptureState =>
  events.reduce(nextCapture, CAPTURE_IDLE);

const shutter = { kind: 'shutter' } as const;
const dismissed = { kind: 'dismissed' } as const;
const timeout = { kind: 'timeout' } as const;
const live = (r: LensReading = reading()): CaptureEvent => ({
  kind: 'reading',
  reading: r,
  of: 'live',
});
const captured = (r: LensReading = reading()): CaptureEvent => ({
  kind: 'reading',
  reading: r,
  of: 'capture',
});
const goLive = { kind: 'mode', mode: 'live' } as const;
const goStill = { kind: 'mode', mode: 'still' } as const;

describe('a capture is something a person takes', () => {
  it('reads nothing at rest — the whole of the fix', () => {
    /*
     * THE DECOY FOR EVERY ASSERTION BELOW. A machine that sampled continuously would satisfy
     * all of them: readings would arrive, captures would hold, the panel would open. This is
     * the one that says a Lens nobody has asked anything of is doing no work.
     */
    expect(demandFor(CAPTURE_IDLE)).toBe('off');
    expect(CAPTURE_IDLE.held).toBeNull();
    expect(CAPTURE_IDLE.mode).toBe('still');
  });

  it('asks the camera for one frame when the shutter is pressed, and holds what comes back', () => {
    const pressed = after(shutter);
    expect(pressed.awaiting).toBe(true);
    expect(demandFor(pressed)).toBe('capture');

    const held = after(shutter, captured());
    expect(held.held).not.toBeNull();
    expect(held.awaiting).toBe(false);
    // And it stops asking. A capture that left the camera sampling would be the reported
    // defect with one extra step in front of it.
    expect(demandFor(held)).toBe('off');
  });

  it('STAYS DISMISSED while the camera keeps reading — F-158, replayed', () => {
    /*
     * THE ONE THAT MATTERS, and it is now true for a structural reason rather than a latched
     * one: after a dismissal there is no held capture, and only a capture opens the panel.
     * Four live frames is a fifth of a second on a device and an eternity to somebody tapping.
     */
    const state = after(
      goLive,
      live(),
      shutter,
      captured(),
      dismissed,
      live(),
      live(),
      live(),
      live(),
    );
    expect(state.held).toBeNull();
  });

  it('does not let a live frame overwrite a capture somebody is reading', () => {
    const held = after(goLive, shutter, captured(reading({ confidence: 0.9 })));
    const later = nextCapture(held, live(reading({ confidence: 0.2 })));
    // Identity: not merely equal, but the same object — a new one would re-render the panel
    // at frame rate under the person's hands.
    expect(later).toBe(held);
  });

  it('drops a capture frame nobody asked for', () => {
    // A frame already in flight when the shutter was released. Showing it would be a result
    // arriving unbidden, which is the behaviour this feature removes.
    expect(after(captured()).held).toBeNull();
  });

  it('says so when a capture never comes back, and says which thing failed', () => {
    const state = after(shutter, timeout);
    expect(state.awaiting).toBe(false);
    // NOT a boolean. A camera that sent no frame and a photograph that could not be read are
    // two different sentences, and one flag for both is what F-119 removed from this screen.
    expect(state.failed).toBe('capture');
    // And pressing again clears it, rather than leaving the last failure under a live attempt.
    expect(after(shutter, timeout, shutter).failed).toBeNull();
  });

  it('ignores a timeout that has nothing to time out', () => {
    expect(nextCapture(CAPTURE_IDLE, timeout)).toBe(CAPTURE_IDLE);
  });
});

describe('live mode is chosen, runs, and stops', () => {
  it('reads continuously once chosen, and not before', () => {
    expect(demandFor(CAPTURE_IDLE)).toBe('off');
    expect(demandFor(after(goLive))).toBe('live');
  });

  it('keeps the running readout out of the result field', () => {
    // FR-13's live pick and a capture are different facts. One field for both is what made a
    // moving number look like a reading somebody had taken.
    const state = after(goLive, live());
    expect(state.live).not.toBeNull();
    expect(state.held).toBeNull();
  });

  it('stops when still is chosen — the stop control, as state', () => {
    const running = after(goLive, live());
    const stopped = nextCapture(running, goStill);
    expect(demandFor(stopped)).toBe('off');
    expect(stopped.live).toBeNull();
  });

  it('does not thrash while the mode has not changed', () => {
    const running = after(goLive);
    expect(nextCapture(running, goLive)).toBe(running);
  });

  it('pauses sampling while a result is on screen, and resumes on dismissal', () => {
    const held = after(goLive, shutter, captured());
    expect(demandFor(held)).toBe('off');
    expect(demandFor(nextCapture(held, dismissed))).toBe('live');
  });

  it('keeps the last live value across a dismissal', () => {
    // Clearing it would blank the readout for one frame every time somebody closed a result.
    const held = after(goLive, live(), shutter, captured());
    expect(nextCapture(held, dismissed).live).toEqual(held.live);
  });
});

describe('a photograph is a third source, and it silences the camera', () => {
  const photo = {
    uri: 'data:image/png;base64,AAAA',
    width: 400,
    height: 300,
    at: { x: 0.5, y: 0.5 },
  } as const;

  const opening = { kind: 'opening' } as const;
  const opened = { kind: 'photo', photo } as const;
  const cancelled = { kind: 'cancelled' } as const;
  const refused = { kind: 'refused' } as const;
  const camera = { kind: 'camera' } as const;

  it('stops sampling the moment the picker opens, and while a photograph is up', () => {
    /*
     * THE ONE THAT MATTERS HERE. Live mode is running; the person opens a photograph. Nothing on
     * screen is coming from the lens any more, so nothing should be read from it — and the
     * `photo` check comes FIRST in `demandFor` for exactly that reason: whatever else is true,
     * a picture is not the camera.
     */
    expect(demandFor(after(goLive, opening))).toBe('off');
    expect(demandFor(after(goLive, opening, opened))).toBe('off');
  });

  it('gives the camera back when the photograph is put away', () => {
    expect(demandFor(after(goLive, opening, opened, camera))).toBe('live');
  });

  it('treats backing out of the picker as a decision, not a failure', () => {
    const state = after(opening, cancelled);
    expect(state.opening).toBe(false);
    expect(state.failed).toBeNull();
  });

  it('says a photograph failed differently from a capture failing', () => {
    expect(after(opening, refused).failed).toBe('photo');
    expect(after(shutter, timeout).failed).toBe('capture');
  });

  it('reads where the person tapped, and drops the reading taken at the old point', () => {
    const held = after(opening, opened, captured());
    expect(held.held).not.toBeNull();

    const moved = nextCapture(held, { kind: 'point', at: { x: 0.2, y: 0.8 } });
    expect(moved.photo?.at).toEqual({ x: 0.2, y: 0.8 });
    // A colour on screen beside a reticle sitting somewhere else is the screen contradicting
    // itself about where the number came from.
    expect(moved.held).toBeNull();
  });

  it('holds a reading from a photograph without one having been awaited', () => {
    // Nothing is in flight from a photograph — the pixels are already decoded — so there is no
    // window for an unbidden reading to arrive in, and the shutter never waits for a frame.
    expect(after(opening, opened, captured()).held).not.toBeNull();
    expect(after(opening, opened).awaiting).toBe(false);
    expect(nextCapture(after(opening, opened), shutter).awaiting).toBe(false);
  });

  it('ignores a tap when there is no photograph', () => {
    expect(nextCapture(CAPTURE_IDLE, { kind: 'point', at: { x: 0.1, y: 0.1 } })).toBe(CAPTURE_IDLE);
  });
});

describe('what a reading is read under', () => {
  it('reads a deliberate capture as FR-15s precision pick, and a live frame as FR-13s', () => {
    expect(modeFor('capture')).toBe('precision');
    expect(modeFor('live')).toBe('live');
  });

  it('means a capture carries no interaction penalty and a live frame does', () => {
    /*
     * ADR-0091, as an assertion. The ceilings themselves live in `modes.ts` and this states the
     * consequence of the mapping: a live pick is capped at 0.7 because the crosshair has not
     * settled, and a capture is not, because it has.
     *
     * NOT a claim that a capture is more accurate — every other ceiling still applies, which is
     * what ADR-0087 requires and what the reading's own confidence is bounded by.
     */
    expect(MODE_CEILING[modeFor('live')]).toBeLessThan(MODE_CEILING[modeFor('capture')]);
    expect(MODE_CEILING[modeFor('live')]).toBe(0.7);
  });
});
