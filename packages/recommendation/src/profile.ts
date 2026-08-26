/**
 * The profile, as the engine needs it — and no more than that.
 *
 * ## Why this is a shape rather than an import
 *
 * `@irodora/store` owns the profile's columns and `NewPersonalProfile` is their type. This
 * package **must not depend on it**: a scoring engine has no business knowing there is a
 * database, and `@irodora/store` keeps zero runtime dependencies of its own for the same kind
 * of reason.
 *
 * So the engine declares the narrow shape it reads and `NewPersonalProfile` satisfies it
 * **structurally** — the same move `PaletteStore` makes against `Repository`. Nothing converts,
 * nothing is copied, and `typecheck` is what proves the two agree. `test/profile.test.ts`
 * asserts the assignability explicitly, so a column removed in the store fails **here** rather
 * than three features later in F-030.
 *
 * ## Narrower than the profile on purpose
 *
 * Seven dimensions exist; four are scored. `neutrals`, `accents` and `avoid` are lists of
 * corpus slugs — they are *outputs* of a profile, useful for browsing, and scoring a colour
 * against them would be asking "is this colour on a list we derived from the same four
 * dimensions we are already scoring". A port that offered them would make that possible.
 */

/** The four axes a colour is scored on. FR-29 names exactly these. */
export const SCORE_FACTORS = ['temperature', 'lightness', 'chroma', 'contrast'] as const;
export type ScoreFactor = (typeof SCORE_FACTORS)[number];

/** A closed interval on an axis. */
export interface Interval {
  readonly min: number;
  readonly max: number;
}

export type ContrastPreference = 'low' | 'medium' | 'high';

/**
 * What scoring reads.
 *
 * `confidence` is keyed by `ScoreFactor` rather than by the profile's full dimension union, so
 * a seven-key record satisfies it and a four-key one does too. That is deliberate: the engine
 * should not fail to accept a profile that carries *more* than it needs.
 */
export interface PersonalProfile {
  readonly lightness: Interval;
  /** -1 fully cool … +1 fully warm. */
  readonly temperatureBias: number;
  readonly chroma: Interval;
  readonly contrast: ContrastPreference;
  readonly confidence: Readonly<Record<ScoreFactor, number>>;
}
