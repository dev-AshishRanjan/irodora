/**
 * The mailbox, and the two things it can carry (F-043, F-199).
 *
 * A **reading** is a measurement the Lens took. A **corpus** offer is a published colour somebody
 * chose from a combination or a slot ranking. They are not interchangeable: handing a chosen
 * colour to `AddGarment` as a `LensReading` would mean inventing `usableSamples`, `variance`,
 * `illumination` and a `confidence` that nobody measured.
 *
 * What is checked here is that the guarantees F-043 established for a reading hold for **both**
 * — addressed, one-shot, and never silently converted into the other.
 */

import {
  clearOffer,
  hasOffer,
  offerCorpusColour,
  offerReading,
  takeOffer,
  takeReading,
} from '../src/lens/handoff';
import type { LensReading } from '../src/lens/reading';
import { slotFor, wordForSlot } from '../src/outfit/builder';
import { OUTFIT_SLOTS } from '@irodora/recommendation';

/** A reading whose numbers are unremarkable. Only its identity matters here. */
const reading = (): LensReading => ({
  rgb: [0.4, 0.42, 0.45],
  space: 'srgb',
  usableSamples: 2400,
  variance: 0.004,
  illumination: 'daylight',
  quality: 'good',
  confidence: 0.72,
  instruction: '',
});

beforeEach(() => {
  clearOffer();
});

describe('a chosen colour is offered like a reading, and stays a different thing', () => {
  it('arrives as a corpus offer, not as a reading', () => {
    offerCorpusColour('ai-nezumi', 'wardrobe');
    const offer = takeOffer('wardrobe');
    expect(offer).toEqual({ kind: 'corpus', slug: 'ai-nezumi' });
  });

  it('is NOT returned by takeReading, which only profile setup uses', () => {
    /*
     * A published colour says nothing about the person holding it, so proposing a profile from
     * one would be an estimate built from a preference. The offer is left in place rather than
     * consumed and discarded — the wardrobe may still be on its way to collect it, which is the
     * whole of F-043's finding.
     */
    offerCorpusColour('ai-nezumi', 'wardrobe');
    expect(takeReading('wardrobe')).toBeNull();
    expect(hasOffer('wardrobe')).toBe(true);
    expect(takeOffer('wardrobe')).not.toBeNull();
  });

  it('DECOY — takeReading still returns an actual reading', () => {
    // Otherwise the assertion above passes on a `takeReading` that returns null for everything.
    const r = reading();
    offerReading(r, 'profile');
    expect(takeReading('profile')).toBe(r);
  });
});

describe('both kinds are addressed', () => {
  it('a colour meant for the wardrobe is not taken by the profile', () => {
    offerCorpusColour('ai-nezumi', 'wardrobe');
    expect(takeOffer('profile')).toBeNull();
    // And it is still there for the reader it was meant for.
    expect(takeOffer('wardrobe')).toEqual({ kind: 'corpus', slug: 'ai-nezumi' });
  });

  it('a reading meant for the profile is not taken by the wardrobe', () => {
    const r = reading();
    offerReading(r, 'profile');
    expect(takeOffer('wardrobe')).toBeNull();
    expect(takeOffer('profile')).toEqual({ kind: 'reading', reading: r });
  });
});

describe('both kinds are one-shot', () => {
  it('a colour is consumed by the first taker', () => {
    offerCorpusColour('ai-nezumi', 'wardrobe');
    expect(takeOffer('wardrobe')).not.toBeNull();
    expect(takeOffer('wardrobe')).toBeNull();
    expect(hasOffer('wardrobe')).toBe(false);
  });

  it('a second offer replaces the first, whatever kind either is', () => {
    // Overwrites rather than queues: if somebody chooses two colours before navigating, the
    // second is the one they meant.
    offerReading(reading(), 'wardrobe');
    offerCorpusColour('ai-nezumi', 'wardrobe');
    expect(takeOffer('wardrobe')).toEqual({ kind: 'corpus', slug: 'ai-nezumi' });
  });
});

/**
 * THE SLOT SURVIVES THE TRIP (F-199).
 *
 * The shopping check takes a garment TYPE, not a slot. `wordForSlot` is the inverse of
 * `slotFor`, and if the two lists ever disagree the slot is dropped silently — the hand-off
 * would still navigate, still prefill a type, and quietly stop carrying the thing criterion 1
 * says it carries.
 */
describe('a slot round-trips through the word the shopping check takes', () => {
  it('maps back to the slot it came from, for every slot', () => {
    // The slot is folded into the compared value so a failure names WHICH one, since jest's
    // expect takes no message argument.
    for (const slot of OUTFIT_SLOTS) {
      const word = wordForSlot(slot);
      expect(`${word} → ${String(slotFor({ type: word }))}`).toBe(`${word} → ${slot}`);
    }
  });

  it('DECOY — a word that is not a slot word maps to nothing', () => {
    // Otherwise the round trip passes on a `slotFor` that returns a slot for anything.
    expect(slotFor({ type: 'umbrella' })).toBeNull();
  });
});
