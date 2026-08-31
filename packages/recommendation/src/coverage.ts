/**
 * What a wardrobe actually gives you, and what one thing would give you more (FR-42, FR-43).
 *
 * ## "Valid" cannot mean "one garment per slot"
 *
 * `tops × trousers × shoes` is a multiplication, not a coverage score. It says nothing about
 * colour, and it **rises when you buy a second black jumper** — which is the opposite of what
 * somebody asking "how much does my wardrobe give me" wants to know.
 *
 * A valid outfit is one that clears `COVERAGE_THRESHOLD`. `scoreOutfit` already produces the
 * number; this file counts and never judges.
 *
 * ## Incremental, because the whole thing is combinatorial
 *
 * Whole coverage is `t × r × s` calls to `scoreOutfit`. For thirty garments that is a thousand,
 * and adding one jumper should not redo them. `applyChange` computes only the combinations the
 * change creates or destroys — and the test that earns it is that **its answer equals a full
 * recompute after any sequence of changes**, because an incremental cache that drifts is worse
 * than no cache: it is confidently wrong and nothing looks broken.
 *
 * ## The gap vocabulary is CONTENT and is not defined here
 *
 * FR-43 wants gaps named in product language — its own example is *"no warm light neutral"*.
 * `content/rules/phrase-lexicon.*.json` already publishes that vocabulary, with a rationale per
 * term, at a version, parsed by `@irodora/corpus` and already read by the Finder.
 *
 * Inventing a second one here would be [E-013](../../../.harness/state/effects.json)'s shape:
 * one content rule in two places, drifting the first time an editor publishes. **A consequence
 * follows and is worth stating: the gaps this can name are exactly the ones the lexicon can
 * express.** If no term covers a region, no gap is reported there — which is the correct
 * failure, because a vocabulary an editor chose beats one this file made up.
 */

import { fromXyz, type Color } from '@irodora/color-core';
import { oklchToXyz, xyzToOklch } from '@irodora/color-spaces';
import type { LexiconTerm } from '@irodora/corpus';
import { NEUTRAL_CHROMA } from './score.js';
import { OUTFIT_SLOTS, type OutfitSlot } from './slots.js';
import { scoreOutfit, type OutfitComponent, type OutfitPiece } from './outfit-score.js';
import type { Candidate } from './outfit.js';
import type { PersonalProfile } from './profile.js';
import type { RuleSet } from './rules.js';

/**
 * The score at or above which an outfit counts.
 *
 * **A judgement, and labelled as one.** 60 out of 100 is "you would leave the house in this"
 * rather than "this is good" — the point of a coverage count is what the wardrobe *can* do, and
 * a bar set at 80 would report most real wardrobes as producing nothing.
 *
 * Exported because **"34 outfits" means nothing without it**. A caller that shows the number
 * without the threshold it was counted at is reporting a measurement with no units.
 */
export const COVERAGE_THRESHOLD = 60;

/** One garment, as coverage sees it: an id, a slot, and a colour. */
export interface CoverageGarment {
  readonly id: string;
  readonly slot: OutfitSlot;
  readonly color: Color;
  /** The published family, when it has one. Used only by `gaps`. */
  readonly family?: string | undefined;
}

/** Everything the engine needs that a wardrobe does not carry. */
export interface CoverageContext {
  readonly reference: readonly Candidate[];
  readonly profile: PersonalProfile;
  readonly rules: RuleSet;
  readonly weights: Readonly<Record<OutfitComponent, number>>;
  /** Defaults to `COVERAGE_THRESHOLD`; exposed so a caller can state what it counted at. */
  readonly threshold?: number;
}

export interface Coverage {
  /** How many combinations clear the threshold. */
  readonly valid: number;
  /** How many of those each garment appears in, keyed by id. Zero is present, not absent. */
  readonly perGarment: ReadonlyMap<string, number>;
  /** The threshold this count was produced at. Carried so the number can be reported honestly. */
  readonly threshold: number;
  /**
   * Every valid combination, as sorted garment-id triples.
   *
   * Kept so `applyChange` can subtract without recomputing, and so a caller can ask *which*
   * outfits rather than only how many. It is the state an incremental recompute needs, and
   * holding it is what makes the increment a set operation rather than a guess.
   */
  readonly combinations: ReadonlySet<string>;
}

const key = (ids: readonly string[]): string => [...ids].sort().join('|');

function bySlot(
  wardrobe: readonly CoverageGarment[],
): Readonly<Record<OutfitSlot, readonly CoverageGarment[]>> {
  const grouped = {} as Record<OutfitSlot, CoverageGarment[]>;
  for (const slot of OUTFIT_SLOTS) grouped[slot] = [];
  for (const garment of wardrobe) grouped[garment.slot].push(garment);
  return grouped;
}

const pieces = (combo: readonly CoverageGarment[]): OutfitPiece[] =>
  combo.map((g) => ({ slot: g.slot, color: g.color, family: g.family }));

/** Whether one combination clears the bar. The engine judges; this compares. */
function clears(
  combo: readonly CoverageGarment[],
  context: CoverageContext,
  threshold: number,
): boolean {
  const score = scoreOutfit(
    pieces(combo),
    context.reference,
    context.profile,
    context.rules,
    context.weights,
  );
  return score.overall >= threshold;
}

/** Every combination that takes one garment from each slot. */
function* combinations(
  wardrobe: readonly CoverageGarment[],
): Generator<readonly CoverageGarment[]> {
  const slots = bySlot(wardrobe);
  for (const top of slots.top)
    for (const trouser of slots.trouser) for (const shoe of slots.shoe) yield [top, trouser, shoe];
}

/**
 * Coverage from scratch.
 *
 * `t × r × s` calls to the engine. This is the baseline `applyChange` has to agree with and
 * the thing it exists to avoid doing twice.
 */
export function coverage(wardrobe: readonly CoverageGarment[], context: CoverageContext): Coverage {
  const threshold = context.threshold ?? COVERAGE_THRESHOLD;
  const valid = new Set<string>();
  // EVERY garment gets an entry, including the ones in nothing. A garment absent from the map
  // is indistinguishable from a garment nobody looked at, and "which of mine is dead weight"
  // is the question this number is for.
  const perGarment = new Map<string, number>(wardrobe.map((g) => [g.id, 0]));

  for (const combo of combinations(wardrobe)) {
    if (!clears(combo, context, threshold)) continue;
    valid.add(key(combo.map((g) => g.id)));
    for (const g of combo) perGarment.set(g.id, (perGarment.get(g.id) ?? 0) + 1);
  }

  return { valid: valid.size, perGarment, combinations: valid, threshold };
}

/** Adding or removing one garment. */
export type WardrobeChange =
  | { readonly kind: 'added'; readonly garment: CoverageGarment }
  | { readonly kind: 'removed'; readonly id: string };

/**
 * Coverage after one change, without recomputing what did not move (FR-42's *"incrementally"*).
 *
 * **Adding** scores only the combinations the new garment takes part in — the cross product of
 * the *other* two slots, which is the whole saving. **Removing** is a set subtraction and
 * scores nothing at all.
 *
 * The counts are rebuilt from the surviving combinations rather than decremented. Decrementing
 * is faster and is how an incremental cache drifts: one missed decrement is invisible for
 * months and then the numbers are simply wrong, with nothing to point at. Rebuilding a small
 * map from a set that is already correct costs nothing worth having.
 */
export function applyChange(
  previous: Coverage,
  wardrobe: readonly CoverageGarment[],
  change: WardrobeChange,
  context: CoverageContext,
): Coverage {
  const threshold = context.threshold ?? COVERAGE_THRESHOLD;

  if (change.kind === 'removed') {
    const surviving = new Set(
      [...previous.combinations].filter((k) => !k.split('|').includes(change.id)),
    );
    return {
      valid: surviving.size,
      perGarment: countFrom(surviving, wardrobe),
      combinations: surviving,
      threshold,
    };
  }

  const added = change.garment;
  const others = OUTFIT_SLOTS.filter((s) => s !== added.slot);
  const slots = bySlot(wardrobe.filter((g) => g.id !== added.id));
  const next = new Set(previous.combinations);

  const [a, b] = others as [OutfitSlot, OutfitSlot];
  for (const first of slots[a])
    for (const second of slots[b]) {
      const combo = [added, first, second];
      if (clears(combo, context, threshold)) next.add(key(combo.map((g) => g.id)));
    }

  return {
    valid: next.size,
    perGarment: countFrom(next, [...wardrobe.filter((g) => g.id !== added.id), added]),
    combinations: next,
    threshold,
  };
}

/* ------------------------------------------------------------- gap analysis (FR-43) */

/** A region of colour space nobody in the wardrobe occupies, named in published words. */
export interface Gap {
  /**
   * The terms that name it — lightness, then chroma.
   *
   * **Published words, never this file's.** FR-43's own example is *"no warm light neutral"*,
   * and every word here came from `content/rules/phrase-lexicon.*.json` with a rationale an
   * editor wrote.
   */
  readonly terms: readonly string[];
  /**
   * How many outfits a garment in this region would add.
   *
   * **A PROJECTION, not a measurement.** There is no such garment, so the count comes from
   * scoring a representative colour at the region's centre. Golden rule 11 applies to our own
   * reports as much as to the UI, and the honest form of this number is one whose basis is
   * visible — which is what `representative` is for.
   */
  readonly wouldUnlock: number;
  /** The synthetic colour the projection used. Carried so the number is reproducible. */
  readonly representative: Color;
  /** The slot the projection filled. A gap is only a gap somewhere. */
  readonly slot: OutfitSlot;
}

/**
 * Regions the wardrobe does not cover, named from the published lexicon.
 *
 * ## The vocabulary is content, and the consequence is stated
 *
 * A region is one lightness term crossed with one **near-neutral chroma** term. **The gaps this
 * can name are exactly the ones the lexicon can express**: publish no term for a region and
 * none is reported there. That is the correct failure — a vocabulary an editor chose and wrote
 * a rationale for beats one this file invented, and inventing one would be E-013's shape.
 *
 * ## Why only near-neutral, and it is not a shortcut
 *
 * A lightness-and-chroma region has **no hue**, so a representative colour needs one chosen —
 * and choosing one would be this file inventing the most consequential part of the answer.
 *
 * Below `NEUTRAL_CHROMA` that problem does not exist: F-101 established that a hue angle on a
 * near-neutral is a rounding artefact, and the lexicon's own `neutral` term ends at exactly
 * 0.039, the same boundary. So the representative's hue is arbitrary **and demonstrably does
 * not matter**, which is the only condition under which picking one is honest.
 *
 * Above it hue matters a great deal, and a gap named *"light vivid"* without one would be both
 * unactionable and a claim this file cannot support. **Filed rather than guessed** — the
 * hue-bearing half needs the lexicon's hue terms as a third axis, which is a feature, not a
 * loop bound.
 *
 * ## Empty regions with nothing to unlock are dropped
 *
 * A gap nobody would benefit from filling is not a gap; it is a hole in a taxonomy.
 */
export function gaps(
  wardrobe: readonly CoverageGarment[],
  lexicon: readonly LexiconTerm[],
  context: CoverageContext,
): readonly Gap[] {
  const base = coverage(wardrobe, context);

  const lightnessTerms = lexicon.filter(
    (t) => t.constrains.lightness !== undefined && t.constrains.chroma === undefined,
  );
  const chromaTerms = lexicon.filter(
    (t) =>
      t.constrains.chroma !== undefined &&
      t.constrains.lightness === undefined &&
      t.constrains.hue === undefined &&
      // NEAR-NEUTRAL ONLY — see the header. Above this boundary a region has a hue nobody
      // published and this function would have to invent one.
      t.constrains.chroma.max <= NEUTRAL_CHROMA,
  );

  const found: Gap[] = [];

  for (const light of lightnessTerms)
    for (const chroma of chromaTerms)
      for (const slot of OUTFIT_SLOTS) {
        if (wardrobe.some((g) => g.slot === slot && occupies(g, light, chroma))) continue;

        const representative = representativeOf(light, chroma);
        const candidate: CoverageGarment = { id: GAP_CANDIDATE_ID, slot, color: representative };
        const after = applyChange(
          base,
          [...wardrobe, candidate],
          { kind: 'added', garment: candidate },
          context,
        );

        const wouldUnlock = after.valid - base.valid;
        if (wouldUnlock <= 0) continue;
        found.push({ terms: [light.term, chroma.term], wouldUnlock, representative, slot });
      }

  // Best first, ties broken by the name so the ordering is TOTAL. Same reason F-045 breaks ties
  // on garment id: without it, `sort`'s stability leaves the order at the mercy of the lexicon's
  // term order, which an editor is free to change.
  return found.sort(
    (a, b) => b.wouldUnlock - a.wouldUnlock || a.terms.join(' ').localeCompare(b.terms.join(' ')),
  );
}

/** The id a projected garment carries. Distinctive, so it cannot collide with a real one. */
const GAP_CANDIDATE_ID = '__projected_gap_candidate__';

/** Whether a garment sits inside both terms' published ranges. */
function occupies(garment: CoverageGarment, light: LexiconTerm, chroma: LexiconTerm): boolean {
  const [l, c] = xyzToOklch(garment.color.xyz);
  const lr = light.constrains.lightness;
  const cr = chroma.constrains.chroma;
  if (lr !== undefined && (l < lr.min || l > lr.max)) return false;
  if (cr !== undefined && (c < cr.min || c > cr.max)) return false;
  return true;
}

/**
 * A colour at the centre of a region.
 *
 * The hue is **0 and it is arbitrary** — which is only acceptable because `gaps` restricts
 * itself to chroma below `NEUTRAL_CHROMA`, where F-101 showed a hue angle is a rounding
 * artefact. Widening the chroma range without also taking a hue from the lexicon would make
 * this line a silent invention.
 */
function representativeOf(light: LexiconTerm, chroma: LexiconTerm): Color {
  const lr = light.constrains.lightness;
  const cr = chroma.constrains.chroma;
  const l = lr === undefined ? 0.5 : (lr.min + lr.max) / 2;
  const c = cr === undefined ? 0 : (cr.min + cr.max) / 2;
  return fromXyz(oklchToXyz([l, c, 0]), {
    source: 'declared',
    confidence: 1,
    originSpace: 'oklch',
  });
}

/** Per-garment counts, rebuilt from the combination set. Every garment appears, zeros included. */
function countFrom(
  combos: ReadonlySet<string>,
  wardrobe: readonly CoverageGarment[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>(wardrobe.map((g) => [g.id, 0]));
  for (const combo of combos)
    for (const id of combo.split('|')) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}
