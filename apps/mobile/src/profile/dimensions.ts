/**
 * What a personal colour profile is, and the one rule that makes a correction stick.
 *
 * > *A profile is a multidimensional range with confidence, never a single skin RGB.* — FR-30
 *
 * ## The type is the store's type, on purpose
 *
 * `Profile` is `NewPersonalProfile` from `@irodora/store`. A second, app-shaped profile type
 * would be the two-things-that-can-disagree shape this repository keeps finding: the store's
 * columns and the screen's model would drift, and the conversion between them would be where
 * a dimension quietly stopped being saved. There is one shape, and `typecheck` is what proves
 * the screen and the database agree about it.
 *
 * **There is no skin colour field here either.** Not because this module chose not to have
 * one, but because the column it would be written to cannot exist
 * ([ADR-0010](../../../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) §1,
 * enforced by `@irodora/store`'s NFR-22 check).
 *
 * ## `origin` is a latch, and it is the whole of criterion 4
 *
 * > *Every dimension is editable, and a user correction is never overwritten by
 * > re-derivation.*
 *
 * `applyDerivation` copies a freshly derived dimension into the profile **only where the
 * origin is `derived`**. Once a person edits a dimension it reads `user`, and every later run
 * of the guided flow leaves it exactly as they left it. ADR-0010 §6 states the rule; this
 * function is the only place it is implemented, so there is no second path that forgets.
 */

import type {
  ContrastPreference,
  DimensionOrigin,
  NewPersonalProfile,
  ProfileDimension,
  Range,
} from '@irodora/store';
import { PROFILE_DIMENSIONS } from '@irodora/store';

export type Profile = NewPersonalProfile;
export type { ContrastPreference, DimensionOrigin, ProfileDimension, Range };
export { PROFILE_DIMENSIONS };

/**
 * The confidence a dimension carries once the person has set it themselves.
 *
 * **1, and it is a statement about the source rather than about accuracy.** It says *this
 * value came from the person it describes*, which is the most authoritative origin a profile
 * dimension has — the same thing `confidence: 1` says about a published corpus entry, where
 * it means "this is the number that was published" and claims nothing about the world
 * ([ADR-0005](../../../../docs/adr/0005-measurement-provenance-is-a-type.md)).
 *
 * The derived path can never reach it: `CONFIDENCE_UNANIMOUS` is 0.75 and that is the ceiling
 * on anything twelve taps can establish (ADR-0031, golden rule 11).
 */
export const USER_STATED_CONFIDENCE = 1;

/**
 * The value each dimension holds, keyed so a single edit function can be total over the union.
 *
 * The three list dimensions hold corpus slugs. Nothing here holds a colour value — a profile
 * is about relationships, and a stored hex would be a colour with no provenance
 * (ADR-0005, and the type would not allow it anyway).
 */
export type DimensionValue =
  | { readonly kind: 'lightness'; readonly range: Range }
  | { readonly kind: 'temperature'; readonly bias: number }
  | { readonly kind: 'chroma'; readonly range: Range }
  | { readonly kind: 'contrast'; readonly preference: ContrastPreference }
  | { readonly kind: 'neutrals' | 'accents' | 'avoid'; readonly slugs: readonly string[] };

/** Read one dimension out of a profile, in the shape `setDimension` takes back. */
export function dimensionValue(profile: Profile, dimension: ProfileDimension): DimensionValue {
  switch (dimension) {
    case 'lightness':
      return { kind: 'lightness', range: profile.lightness };
    case 'temperature':
      return { kind: 'temperature', bias: profile.temperatureBias };
    case 'chroma':
      return { kind: 'chroma', range: profile.chroma };
    case 'contrast':
      return { kind: 'contrast', preference: profile.contrast };
    case 'neutrals':
      return { kind: 'neutrals', slugs: profile.neutrals };
    case 'accents':
      return { kind: 'accents', slugs: profile.accents };
    case 'avoid':
      return { kind: 'avoid', slugs: profile.avoid };
  }
}

/**
 * A range with its ends the right way round, clamped to the axis.
 *
 * The database has the same CHECK, so an inverted range cannot be stored — but a screen that
 * let a person drag `min` past `max` and then failed to save would be blaming them for the
 * control's behaviour. Ordering here means the edit always produces a range.
 */
function orderedRange(range: Range, ceiling: number): Range {
  const min = Math.max(0, Math.min(range.min, range.max));
  const max = Math.min(ceiling, Math.max(range.min, range.max));
  return { min, max };
}

/** The largest value each ranged axis takes. OKLCh L is a proportion; C is bounded by the schema. */
export const AXIS_CEILING = { lightness: 1, chroma: 1 } as const;

/**
 * Set one dimension by hand.
 *
 * **Always latches the origin to `user`**, including when the new value equals the old one:
 * "I looked at this and it is right" is a correction, and a person who confirms a dimension
 * should not have it re-derived out from under them on the next run. Inferring intent from
 * whether the value moved would make the latch depend on the person having chosen a different
 * answer, which is not what they were asked.
 */
export function setDimension(profile: Profile, value: DimensionValue): Profile {
  const latched = {
    confidence: { ...profile.confidence, [value.kind]: USER_STATED_CONFIDENCE },
    origin: { ...profile.origin, [value.kind]: 'user' as DimensionOrigin },
  };
  switch (value.kind) {
    case 'lightness':
      return {
        ...profile,
        ...latched,
        lightness: orderedRange(value.range, AXIS_CEILING.lightness),
      };
    case 'temperature':
      return {
        ...profile,
        ...latched,
        temperatureBias: Math.max(-1, Math.min(1, value.bias)),
      };
    case 'chroma':
      return { ...profile, ...latched, chroma: orderedRange(value.range, AXIS_CEILING.chroma) };
    case 'contrast':
      return { ...profile, ...latched, contrast: value.preference };
    case 'neutrals':
      return { ...profile, ...latched, neutrals: value.slugs };
    case 'accents':
      return { ...profile, ...latched, accents: value.slugs };
    case 'avoid':
      return { ...profile, ...latched, avoid: value.slugs };
  }
}

/**
 * Fold a fresh derivation into an existing profile, **keeping every corrected dimension**.
 *
 * This is the function acceptance criterion 4 names. It walks the dimension union rather than
 * the profile's fields, so a dimension added later is a compile error here instead of a value
 * that silently stops being protected.
 *
 * `id` and `method` come from the existing profile: re-running the guided flow does not make a
 * new profile, it re-derives the parts of this one nobody has claimed.
 */
export function applyDerivation(existing: Profile, derived: Profile): Profile {
  let next: Profile = { ...existing };
  for (const dimension of PROFILE_DIMENSIONS) {
    // The latch. A `user` dimension is not touched — not its value, not its confidence, and
    // not its origin.
    if (existing.origin[dimension] === 'user') continue;
    next = {
      ...takeDimension(next, derived, dimension),
      confidence: { ...next.confidence, [dimension]: derived.confidence[dimension] },
      origin: { ...next.origin, [dimension]: 'derived' as DimensionOrigin },
    };
  }
  return next;
}

/** One dimension's value copied across, with nothing else moving. */
function takeDimension(into: Profile, from: Profile, dimension: ProfileDimension): Profile {
  switch (dimension) {
    case 'lightness':
      return { ...into, lightness: from.lightness };
    case 'temperature':
      return { ...into, temperatureBias: from.temperatureBias };
    case 'chroma':
      return { ...into, chroma: from.chroma };
    case 'contrast':
      return { ...into, contrast: from.contrast };
    case 'neutrals':
      return { ...into, neutrals: from.neutrals };
    case 'accents':
      return { ...into, accents: from.accents };
    case 'avoid':
      return { ...into, avoid: from.avoid };
  }
}

/** Which dimensions the person has corrected. For the summary, and for a "reset" affordance. */
export function correctedDimensions(profile: Profile): readonly ProfileDimension[] {
  return PROFILE_DIMENSIONS.filter((d) => profile.origin[d] === 'user');
}
