/**
 * Wear it — a colour goes in a slot, and the engine fills the others (FR-31, FR-73).
 *
 * ## The gap
 *
 * `recommendForSlot` and `recommendOutfit` have been exported from `@irodora/recommendation`
 * since **F-030** and called by nothing. Same defect F-194 found one package along, and the same
 * report behind it: *"if shirt is a color, then what color could pants should be."*
 *
 * F-194 answered *what colour goes with this colour* — geometry, twelve relationships. This
 * answers *what do I wear with it*, which is a different question with a different engine behind
 * it: a garment, a slot, and a ranking that knows a shoe is not a shirt.
 *
 * ## Nothing here scores
 *
 * Every number comes from `recommendOutfit`. The 50/50 personal/pairing blend, the shortlist
 * bound, the tie-break on `id` and the alternatives are the engine's and stay there. This module
 * builds the pool, resolves the slot, and answers one question the engine cannot: **whether
 * there is a person to score against at all.**
 *
 * ## `recommendOutfit`, not `recommendForSlot` twice
 *
 * The engine already refuses to recommend a second top — *"a second top is not what 'what goes
 * with this' means, and returning one would be the kind of answer that is technically
 * responsive"*, in its own words. Calling it once fills every other slot and keeps that rule
 * where it is defined.
 */

import {
  recommendOutfit,
  SCORE_FACTORS,
  OUTFIT_SLOTS,
  type Candidate,
  type OutfitRecommendation,
  type OutfitSlot,
  type PersonalProfile,
  type RuleSet,
} from '@irodora/recommendation';
import { allEntries, colorFor, entryBySlug, type PublishedEntry } from './corpus';

/** The slot a colour can be put in. The engine's three, re-exported so a screen has one import. */
export { OUTFIT_SLOTS, type OutfitSlot };

/** Where a colour goes unless somebody says otherwise. A shirt is what people hold up. */
export const DEFAULT_SLOT: OutfitSlot = 'top';

/**
 * The profile used when nobody has built one.
 *
 * **Not a fabricated person — the engine's own representation of having nothing to go on.**
 * `scoreColor` returns `NO_EVIDENCE_SCORE` (50, `confidence: 0`, every factor `neutral`) when no
 * dimension carries confidence, and its docblock names this exact case: *"a profile nobody has
 * filled in is zero across the board"*. F-027 made that reachable rather than theoretical.
 *
 * So the personal half of every blend contributes nothing, and the ranking is driven entirely by
 * pairing — which is the answer that does not need a profile.
 *
 * **The interval values assert nothing and never reach a score.** Full range on both axes, no
 * temperature bias, the middle contrast preference: each is the value that expresses *no
 * constraint*, and each is multiplied by a weight of zero before it reaches the total.
 *
 * **They DO still reach `factors[].fit`, which is why {@link personalKnown} exists.** A
 * full-range interval makes `intervalFit` return 1 on every axis, so the explanation object
 * reports a perfect fit on four dimensions nobody has measured. That object must not be drawn
 * for somebody with no profile, and a screen deciding that for itself would eventually forget.
 */
export const NO_EVIDENCE_PROFILE: PersonalProfile = {
  lightness: { min: 0, max: 1 },
  temperatureBias: 0,
  chroma: { min: 0, max: 1 },
  contrast: 'medium',
  confidence: { temperature: 0, lightness: 0, chroma: 0, contrast: 0 },
};

/** What the screen draws. */
export interface WearAnswer {
  /** The colour in hand. */
  readonly source: PublishedEntry;
  /** The slot it was put in. Never one of the slots recommended back. */
  readonly slot: OutfitSlot;
  /**
   * Whether there was a person to score against.
   *
   * **A value, not something a screen infers.** When false the blended score is an artefact —
   * personal is pinned at 50 for every candidate, so the order is right and the magnitude is
   * not — and the explanation object reports a perfect fit on four unmeasured axes. Both are
   * reasons to draw a different tree, and neither should depend on a caller remembering to
   * check a confidence field.
   */
  readonly personalKnown: boolean;
  /** One per slot other than {@link slot}, in the engine's order. */
  readonly recommendations: readonly OutfitRecommendation[];
  /** How many corpus colours were offered to the engine, before its own bound. */
  readonly poolSize: number;
}

/**
 * Every corpus colour except the one in hand.
 *
 * **The source is excluded, and it is not a nicety.** `recommendOutfit` would happily rank a
 * colour against itself and put it first — pairing fit with yourself is as good as it gets — and
 * "wear these trousers with that shirt" pointing at the same colour is an answer that looks like
 * a bug because it is one.
 *
 * The whole corpus goes in. The engine's `SHORTLIST_LIMIT` is what bounds the work, and it
 * reports `considered` and `scored` so the bound is observable rather than assumed.
 */
function poolFor(source: PublishedEntry): readonly Candidate[] {
  return allEntries()
    .filter((e) => e.entry.slug !== source.entry.slug)
    .map((e) => ({ id: e.entry.slug, color: colorFor(e.entry) }));
}

/**
 * What to wear with a colour.
 *
 * `null` when the slug resolves to nothing, which is a state a route parameter can produce and
 * the screen renders as a sentence.
 *
 * Pure with respect to its arguments: the corpus and the rule set are both immutable published
 * content, so the same slug and slot always produce the same ranking.
 */
export function wearWith(
  slug: string,
  slot: OutfitSlot,
  profile: PersonalProfile | null,
  rules: RuleSet,
): WearAnswer | null {
  const source = entryBySlug(slug);
  if (source === null) return null;

  const pool = poolFor(source);

  return {
    source,
    slot,
    personalKnown: profile !== null,
    recommendations: recommendOutfit(
      { slot, color: colorFor(source.entry) },
      pool,
      profile ?? NO_EVIDENCE_PROFILE,
      rules,
    ),
    poolSize: pool.length,
  };
}

/**
 * The number a person is shown for a candidate.
 *
 * **The blend when there is a profile; the pairing figure when there is not.** With personal
 * pinned at 50 the blend is pulled toward the middle for every candidate — a compression that
 * changes no order and makes every magnitude a statement about the engine's midpoint rather
 * than about the colour. Showing it would be reporting a number that means less than it looks
 * like it means, which is what NFR-21 is about.
 */
export function shownScore(
  candidate: { readonly score: number; readonly pairing: number },
  personalKnown: boolean,
): number {
  return personalKnown ? candidate.score : candidate.pairing;
}

/**
 * The factors worth drawing for a candidate.
 *
 * Empty without a profile — see {@link NO_EVIDENCE_PROFILE} for why the explanation object is
 * not merely uninformative there but actively wrong.
 */
export function shownFactors(
  candidate: {
    readonly personal: { readonly factors: readonly { readonly messageKey: string }[] };
  },
  personalKnown: boolean,
): readonly { readonly messageKey: string }[] {
  return personalKnown ? candidate.personal.factors : [];
}

/** Every factor the engine scores on, for a screen that lists what a profile would add. */
export { SCORE_FACTORS };
