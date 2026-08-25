/**
 * What the setup screen needs from storage, and nothing more.
 *
 * Narrower than `Repository` for the reason `PaletteStore` is narrower: a screen that could
 * read the change log or write a colour eventually would. `Repository` satisfies this
 * structurally, so the device wiring stays a pass-through and `typecheck` is what proves the
 * two agree.
 *
 * The screens never import [`../store/repository`](../store/repository.ts) — that module
 * reaches `expo-sqlite`, which needs a device, and a screen importing it could not be rendered
 * by jest at all. The route passes the real one; the suite passes an in-memory one.
 */

import type { NewPersonalProfile, StoredPersonalProfile } from '@irodora/store';
import type { Profile } from './dimensions';

export interface ProfileStore {
  saveProfile(profile: NewPersonalProfile, now: number): void;
  listProfiles(): readonly StoredPersonalProfile[];
}

/**
 * The profile this device is using, or `null`.
 *
 * **The most recently updated one**, not the first. There is one profile per device today and
 * nothing in the product creates a second — but `listProfiles` returns rows in creation order,
 * and "the oldest row" is the wrong answer the day anything does. Choosing by `updatedAt`
 * means a re-derivation moves the active profile rather than leaving a stale one in front.
 */
export function activeProfile(store: ProfileStore): StoredPersonalProfile | null {
  const profiles = store.listProfiles();
  if (profiles.length === 0) return null;
  return profiles.reduce((latest, p) => (p.updatedAt > latest.updatedAt ? p : latest));
}

/**
 * A stored profile as the working shape.
 *
 * The timestamps are dropped because they are the database's facts, not the profile's — and a
 * working copy carrying them would invite a screen to display an `updatedAt` it did not
 * update.
 */
export function toWorking(stored: StoredPersonalProfile): Profile {
  return {
    id: stored.id,
    method: stored.method,
    lightness: stored.lightness,
    temperatureBias: stored.temperatureBias,
    chroma: stored.chroma,
    contrast: stored.contrast,
    confidence: stored.confidence,
    origin: stored.origin,
    neutrals: stored.neutrals,
    accents: stored.accents,
    avoid: stored.avoid,
  };
}
