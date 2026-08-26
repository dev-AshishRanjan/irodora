/**
 * The one-shot hand-off from the Lens to profile setup (FR-27, F-097).
 *
 * ## Why this is not a route parameter
 *
 * A `LensReading` is all numbers and small enums, so it would serialise into a route perfectly
 * well. It is held in memory instead for two reasons.
 *
 * **A route parameter is a URL.** A reading is a measurement taken of whatever the person
 * pointed a camera at, in their room, and putting it in an address is the kind of thing that is
 * fine until the day something logs addresses. Nothing in this app logs one today; the point is
 * that this decision does not depend on that staying true.
 *
 * **The type is the guarantee, and a serialised copy is not the type.** `LensReading` has no
 * field a frame, a buffer, a path or a URI could be assigned to
 * ([`reading.ts`](./reading.ts), F-040) — that is what keeps the frame on the worklet thread.
 * A `JSON.parse` at the other end produces a `LensReading`-shaped object that the compiler
 * believes on trust, and the next person to widen the params type widens it past the guarantee.
 *
 * ## One-shot, and that is the interesting half
 *
 * `takeReading()` **consumes**. The reading is an *offer* — "here is what the camera saw, would
 * you like a profile proposed from it?" — and an offer that survives being declined is not an
 * offer. Concretely: someone opens the Lens, taps through to their profile, decides to answer
 * the twelve comparisons instead, and navigates back. Without the consume, arriving at the
 * profile screen a second time re-proposes an estimate they already turned down, and FR-27's
 * *"never finalised without explicit user confirmation"* starts to feel like nagging.
 *
 * It is also what stops a reading outliving the session it was taken in.
 *
 * ## Module state, deliberately
 *
 * A React context would need a provider above both routes and would put a camera reading into
 * the render graph of every screen in the app. This is a mailbox: two functions, one slot, no
 * subscribers, and nothing re-renders when it changes.
 */

import type { LensReading } from './reading';

/**
 * The slot. `null` means nothing is on offer — which is the state every screen except the
 * Lens starts in, and the state the profile screen returns to as soon as it has read one.
 */
let offered: LensReading | null = null;

/**
 * Leave a reading for profile setup.
 *
 * Overwrites. If someone takes two readings before navigating, the second is the one they
 * meant — a queue would offer them a colour they had already moved on from.
 */
export function offerReading(reading: LensReading): void {
  offered = reading;
}

/**
 * Take the offered reading, if there is one, and clear the slot.
 *
 * Returns `null` rather than throwing: "nobody offered a reading" is the ordinary case, not an
 * error. The guided path reaches profile setup this way on every run.
 */
export function takeReading(): LensReading | null {
  const reading = offered;
  offered = null;
  return reading;
}

/**
 * Whether a reading is waiting, without consuming it.
 *
 * Exists for tests and for a caller that needs to decide what to render before it decides to
 * read. Deliberately not used to gate `takeReading` — a check-then-take is two chances to get
 * the ordering wrong, and `takeReading` returning `null` already covers it.
 */
export function hasOffer(): boolean {
  return offered !== null;
}

/**
 * Drop any offer without reading it.
 *
 * Not decoration: a person who leaves the Lens without using a reading should not find it
 * proposed to them later, and a test that plants an offer must be able to leave the module as
 * it found it.
 */
export function clearOffer(): void {
  offered = null;
}
