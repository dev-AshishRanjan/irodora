/**
 * "What goes with this" — ranked colours for the other slots, and alternatives that say which
 * way they move.
 *
 * > *Given a garment colour and slot, return ranked colours for other slots. Returns >= 5
 * > ranked trouser and >= 4 ranked shoe candidates with score and reasons, in <= NFR-4
 * > latency.* — FR-31
 *
 * > *Every recommendation offers substitutions across a stated dimension (warmer, cooler,
 * > lighter, higher contrast). At least three alternatives per recommendation, each labelled
 * > with the dimension it moves along.* — FR-38
 *
 * ## A rank is two questions, not one
 *
 * `scoreColor` answers *does this suit me*. It says nothing about the garment in hand, and a
 * "what goes with this" built on it alone would be a personal-colour list wearing a different
 * name — the same five colours whatever you were holding.
 *
 * So a candidate's rank is the mean of **personal fit** and **pairing fit**, and the pairing
 * half is what makes the input matter.
 *
 * ## The 50/50 blend is the one number here that is not content
 *
 * Declared, not tuned, and said out loud. FR-32's six-factor outfit score is **F-031**, and
 * inventing a weight now would put an editorial-looking number in code the week after F-029
 * finished proving that weights belong in `content/rules`. Equal weight is the split that
 * asserts no preference — which is the honest position while there is no basis for one.
 *
 * Everything else comes from the published rule set: the same `falloff`, the same `poles`, the
 * same `CONTRAST_TARGET`. No axis is defined twice.
 *
 * ## Bounded before scoring, and the bound is reported
 *
 * Scoring is the expensive half. The pool is narrowed by a filter that computes no score and
 * then capped at `SHORTLIST_LIMIT`, and the result carries `considered` and `scored` so a test
 * can assert the bound HELD rather than assert that a constant exists — which is the difference
 * between a bound and a comment [[the-shortlist-bound-is-the-only-thing-making-two-stage-equal-a-full-scan]].
 */

import { xyzToOklch } from '@irodora/color-spaces';
import type { Color } from '@irodora/color-core';
import type { PersonalProfile } from './profile.js';
import type { RuleSet } from './rules.js';
import {
  CONTRAST_TARGET,
  hueBias,
  intervalFit,
  scoreColor,
  temperatureOf,
  type CompatibilityScore,
} from './score.js';
import { isLargeArea, OUTFIT_SLOTS, type OutfitSlot } from './slots.js';

/** A colour that could fill a slot. The caller supplies the pool; this engine never reads content. */
export interface Candidate {
  /** How the caller identifies it — a corpus slug, a wardrobe id. Opaque here, and the tiebreak. */
  readonly id: string;
  readonly color: Color;
}

/** The garment in hand. */
export interface OutfitInput {
  readonly slot: OutfitSlot;
  readonly color: Color;
}

/** The four dimensions FR-38 names, verbatim. */
export const ALTERNATIVE_AXES = ['warmer', 'cooler', 'lighter', 'higherContrast'] as const;
export type AlternativeAxis = (typeof ALTERNATIVE_AXES)[number];

export interface RankedCandidate {
  readonly id: string;
  readonly slot: OutfitSlot;
  /** [0,100], the blend. An integer, like every score a person reads. */
  readonly score: number;
  /** How well it suits the person, with its four contributions. FR-11's explanation object. */
  readonly personal: CompatibilityScore;
  /** [0,100] — how well it sits with the garment in hand. */
  readonly pairing: number;
}

export interface Alternative {
  readonly axis: AlternativeAxis;
  readonly candidate: RankedCandidate;
}

export interface OutfitRecommendation {
  readonly slot: OutfitSlot;
  readonly ranked: readonly RankedCandidate[];
  /** At least three where the pool allows. An axis with no candidate is OMITTED, never filled. */
  readonly alternatives: readonly Alternative[];
  /** The rule version every score here was produced under. */
  readonly rulesVersion: string;
  /** How many candidates the pool offered for this slot, before the bound. */
  readonly considered: number;
  /** How many were actually scored. Never more than `SHORTLIST_LIMIT`. */
  readonly scored: number;
}

/**
 * The most candidates that are scored for one slot.
 *
 * A bound, not an optimisation. NFR-7 asks for 100 000 corpus entries responsive on a
 * four-year-old Android, and scoring is O(n) with a real constant — so the narrowing has to
 * happen before it, or the latency budget is a function of the corpus size.
 *
 * 64 is comfortably more than the 5 and 4 the criteria ask for, so the ranking still has
 * something to choose between after the cheap filter has had its say.
 */
export const SHORTLIST_LIMIT = 64;

/** How much of the blend each half carries. See the header: declared, not tuned. */
export const PERSONAL_WEIGHT = 0.5;
export const PAIRING_WEIGHT = 0.5;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** OKLCh for a colour, through the engine. Nothing here computes colour maths. */
const oklchOf = (color: Color): readonly [number, number, number] => {
  const [l, c, h] = xyzToOklch(color.xyz);
  return [l, c, h];
};

/**
 * How well a candidate sits **with the garment**, in [0,1].
 *
 * Two components, both from the published rule set:
 *
 * **Separation.** The lightness gap between the two pieces, judged against the contrast the
 * person prefers — the same `CONTRAST_TARGET` `scoreColor` uses, so "high contrast" means one
 * thing in this product. Too little separation and too much are both misses.
 *
 * **Temperature coherence.** Two pieces far apart on the warm–cool axis read as a clash rather
 * than a choice. This is agreement between the two COLOURS, which is a different question from
 * `scoreColor`'s agreement between a colour and a person.
 *
 * **Chroma competition** adjusts the result rather than forming a third component: two large
 * areas both carrying strong chroma compete, and a shoe is small enough that it does not.
 */
export function pairingFit(
  garment: Color,
  garmentSlot: OutfitSlot,
  candidate: Color,
  candidateSlot: OutfitSlot,
  profile: PersonalProfile,
  rules: RuleSet,
): number {
  const [gl] = oklchOf(garment);
  const [cl] = oklchOf(candidate);

  const separation = Math.abs(cl - gl);
  const target = CONTRAST_TARGET[profile.contrast];
  const separationFit = clamp01(1 - Math.abs(separation - target));

  const coherence = pairingCoherence(
    garment,
    garmentSlot,
    candidate,
    candidateSlot,
    profile,
    rules,
  );
  return clamp01((separationFit + coherence) / 2);
}

/**
 * The half of a pairing that is **not** about lightness separation.
 *
 * Temperature agreement between the two colours, reduced when two large areas both carry more
 * chroma than the person tolerates.
 *
 * ## Why this is a separate function, and what it fixed
 *
 * `versatility` in the outfit score used to call `pairingFit`, and it did not measure
 * versatility. The separation term dominates — it asks *how far apart in lightness are these
 * two* — so the most "versatile" colour in the corpus came out as **`mi-aka`, a vivid red**,
 * purely because it sits at a central lightness and therefore lands near the target distance
 * from a lot of things. Measured, not suspected: 73.3% against 61.7% for a warm grey.
 *
 * Two problems in one. The number was **wrong under its own name**, and it was a second, worse
 * copy of the `contrast` component — two of the six scoring the same property, so an outfit
 * that suited the person's contrast preference scored twice for it.
 *
 * Separation belongs to `contrast`. What is left here is what "goes with a lot of things"
 * actually means: a colour that does not clash on temperature and does not compete on chroma.
 */
export function pairingCoherence(
  garment: Color,
  garmentSlot: OutfitSlot,
  candidate: Color,
  candidateSlot: OutfitSlot,
  profile: PersonalProfile,
  rules: RuleSet,
): number {
  const [, gc, gh] = oklchOf(garment);
  const [, cc, ch] = oklchOf(candidate);

  /*
   * Agreement between the two colours' own warmth, on the same [-1,1] scale, so the distance
   * spans [0,2] and halving it returns a fit in [0,1].
   *
   * `temperatureOf`, NOT `hueBias`: a near-neutral cannot clash with anything, and calling a
   * grey "fully warm" is exactly what made the versatility component rank the corpus's most
   * saturated red as its most versatile colour.
   */
  let fit = clamp01(
    1 - Math.abs(temperatureOf(cc, ch, rules.poles) - temperatureOf(gc, gh, rules.poles)) / 2,
  );

  /*
   * TWO LARGE AREAS DO NOT BOTH CARRY THE CHROMA. Penalised rather than excluded: a bright top
   * with bright trousers is a real choice somebody might make deliberately, and this engine
   * ranks rather than forbids. The threshold is the profile's own chroma tolerance, so a person
   * who wears strong colour is not told their own preference is a clash.
   */
  if (isLargeArea(garmentSlot) && isLargeArea(candidateSlot)) {
    const ceiling = profile.chroma.max;
    if (gc > ceiling && cc > ceiling) fit *= 0.6;
  }

  return clamp01(fit);
}

/**
 * The cheap filter, run **before** any scoring.
 *
 * It computes no score and reads no profile confidence — only OKLCh lightness, which the
 * candidate already carries. What it removes is the part of the pool that no ranking would ever
 * surface: colours whose lightness could not produce a usable separation from the garment under
 * any contrast preference.
 *
 * Deliberately generous. A filter that narrowed to exactly the answer would be doing the
 * ranking's job with none of its evidence, and the bound below is what actually caps the work.
 */
function shortlist(
  input: OutfitInput,
  candidates: readonly Candidate[],
  rules: RuleSet,
): readonly Candidate[] {
  const [gl] = oklchOf(input.color);
  const widest = Math.max(...Object.values(CONTRAST_TARGET));

  return (
    candidates
      .filter((candidate) => {
        const [cl] = oklchOf(candidate.color);
        // Within the widest separation anybody could prefer, plus the rule set's own falloff —
        // so the bound moves with the published rules rather than with a number typed here.
        return Math.abs(cl - gl) <= widest + rules.falloff.lightness;
      })
      // Sorted before slicing so the cap is deterministic rather than "whatever came first".
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, SHORTLIST_LIMIT)
  );
}

/**
 * Rank the pool for one slot.
 *
 * Pure: the same inputs always produce the same order, ties broken on `id` so the result cannot
 * depend on the order the caller happened to supply.
 */
export function recommendForSlot(
  input: OutfitInput,
  slot: OutfitSlot,
  candidates: readonly Candidate[],
  profile: PersonalProfile,
  rules: RuleSet,
): OutfitRecommendation {
  const pool = shortlist(input, candidates, rules);

  const ranked = pool
    .map((candidate) => {
      const personal = scoreColor(profile, candidate.color, rules);
      const pairing = pairingFit(input.color, input.slot, candidate.color, slot, profile, rules);
      return {
        id: candidate.id,
        slot,
        score: Math.round(personal.score * PERSONAL_WEIGHT + pairing * 100 * PAIRING_WEIGHT),
        personal,
        pairing: Math.round(pairing * 100),
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return {
    slot,
    ranked,
    alternatives: alternativesFor(input, ranked, candidates, rules),
    rulesVersion: rules.versionId,
    considered: candidates.length,
    scored: pool.length,
  };
}

/**
 * Recommend for every slot except the one the garment is in.
 *
 * The input slot is never recommended back — a second top is not what "what goes with this"
 * means, and returning one would be the kind of answer that is technically responsive.
 */
export function recommendOutfit(
  input: OutfitInput,
  candidates: readonly Candidate[],
  profile: PersonalProfile,
  rules: RuleSet,
): readonly OutfitRecommendation[] {
  return OUTFIT_SLOTS.filter((slot) => slot !== input.slot).map((slot) =>
    recommendForSlot(input, slot, candidates, profile, rules),
  );
}

/**
 * Alternatives: the best candidate that moves along each named axis, relative to the top pick.
 *
 * **Relative to the top pick, not to the garment.** An alternative answers *"like that, but
 * warmer"*, and the thing it is "like" is what was recommended.
 *
 * An axis with no candidate is **omitted**, never filled with a duplicate or the next-best
 * unrelated colour. FR-38 asks for at least three labelled alternatives; three real ones and a
 * missing fourth is an honest answer, while four where one is mislabelled is not.
 */
function alternativesFor(
  input: OutfitInput,
  ranked: readonly RankedCandidate[],
  candidates: readonly Candidate[],
  rules: RuleSet,
): readonly Alternative[] {
  const best = ranked[0];
  if (best === undefined) return [];
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const bestColor = byId.get(best.id);
  if (bestColor === undefined) return [];

  const [bl, , bh] = oklchOf(bestColor.color);
  const bestBias = hueBias(bh, rules.poles);
  const [gl] = oklchOf(input.color);
  const bestSeparation = Math.abs(bl - gl);

  const moves: Readonly<Record<AlternativeAxis, (c: Candidate) => boolean>> = {
    warmer: (c) => hueBias(oklchOf(c.color)[2], rules.poles) > bestBias,
    cooler: (c) => hueBias(oklchOf(c.color)[2], rules.poles) < bestBias,
    lighter: (c) => oklchOf(c.color)[0] > bl,
    higherContrast: (c) => Math.abs(oklchOf(c.color)[0] - gl) > bestSeparation,
  };

  const out: Alternative[] = [];
  for (const axis of ALTERNATIVE_AXES) {
    const moved = ranked.find((r) => {
      if (r.id === best.id) return false;
      const candidate = byId.get(r.id);
      return candidate !== undefined && moves[axis](candidate);
    });
    if (moved !== undefined) out.push({ axis, candidate: moved });
  }
  return out;
}

export { intervalFit };
