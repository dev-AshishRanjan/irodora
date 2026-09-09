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
 * What is on offer (F-199).
 *
 * ## Two kinds, and the type is what keeps them apart
 *
 * A **reading** is a measurement taken of whatever somebody pointed a camera at. A **corpus**
 * offer is a published colour they chose — from a curated combination, or from a slot ranking.
 *
 * They are not interchangeable and must never become so. Handing a chosen colour to
 * `AddGarment` as a `LensReading` would mean inventing `usableSamples`, `variance`,
 * `illumination` and a `confidence` that nobody measured — which is precisely the dishonesty
 * ADR-0005 exists to prevent, committed for the convenience of reusing a field.
 *
 * ## Why a slug rather than a colour
 *
 * The receiving end already understands `ColourOrigin` — `{ kind: 'corpus', slug }` — so this
 * carries the same thing rather than a second representation of it. A GENERATED colour has no
 * slug and is deliberately not offerable: it is a coordinate the engine computed, with no
 * capture and no publication behind it, and giving it an origin is ADR-0005's open question
 * (F-207) rather than a wiring decision.
 */
export type Offer =
  | { readonly kind: 'reading'; readonly reading: LensReading }
  | { readonly kind: 'corpus'; readonly slug: string };

/**
 * Who a reading is for.
 *
 * Added by F-043, and the reason is a bug that no type would have caught. Profile setup was
 * the only consumer, and `takeReading` CONSUMES — so the moment the wardrobe became a second
 * consumer, a person who scanned a garment and happened to pass through profile setup on the
 * way would have had the reading eaten there. The wardrobe screen would then find an empty
 * slot and ask them to scan again, and the profile would have quietly proposed an estimate
 * built from a jumper.
 *
 * Both halves are silent. Neither screen can tell 'nobody scanned' from 'somebody else took
 * it', which is why the destination is on the OFFER rather than a check at the reader.
 */
export const READING_DESTINATIONS = ['profile', 'wardrobe'] as const;
export type ReadingDestination = (typeof READING_DESTINATIONS)[number];

/**
 * The slot. `null` means nothing is on offer — which is the state every screen except the
 * Lens starts in, and the state the profile screen returns to as soon as it has read one.
 */
let offered: { offer: Offer; to: ReadingDestination } | null = null;

/**
 * Leave a reading for profile setup.
 *
 * Overwrites. If someone takes two readings before navigating, the second is the one they
 * meant — a queue would offer them a colour they had already moved on from.
 */
export function offerReading(reading: LensReading, to: ReadingDestination): void {
  offered = { offer: { kind: 'reading', reading }, to };
}

/**
 * Leave a published colour for the wardrobe (F-199).
 *
 * The same slot and the same one-shot rule as {@link offerReading} — an offer that survives
 * being declined is not an offer — and the same addressing, so a colour meant for the wardrobe
 * is not consumed by profile setup on the way.
 */
export function offerCorpusColour(slug: string, to: ReadingDestination): void {
  offered = { offer: { kind: 'corpus', slug }, to };
}

/**
 * Take the offered reading, if there is one, and clear the slot.
 *
 * Returns `null` rather than throwing: "nobody offered a reading" is the ordinary case, not an
 * error. The guided path reaches profile setup this way on every run.
 */
export function takeOffer(to: ReadingDestination): Offer | null {
  // ADDRESSED, and the mismatch case LEAVES THE OFFER ALONE. Consuming an offer meant for
  // somewhere else would be the original bug wearing a parameter: the rightful reader would
  // still find an empty slot, and would still have no way to tell that from nobody scanning.
  if (offered?.to !== to) return null;
  const { offer } = offered;
  offered = null;
  return offer;
}

/**
 * Take the offered READING, if the offer is one.
 *
 * Kept as its own function rather than folded into {@link takeOffer}, because profile setup can
 * only use a measurement: a published colour says nothing about the person holding it, and
 * proposing a profile from one would be an estimate built from a preference.
 *
 * **A corpus offer is left alone** rather than consumed and discarded — the wardrobe may still
 * be on its way to collect it, which is the whole of F-043's finding.
 */
export function takeReading(to: ReadingDestination): LensReading | null {
  if (offered?.to !== to || offered.offer.kind !== 'reading') return null;
  const { reading } = offered.offer;
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
export function hasOffer(to: ReadingDestination): boolean {
  return offered !== null && offered.to === to;
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
