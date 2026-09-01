/**
 * The shopping check (FR-52, F-052).
 *
 * > *Outfits unlocked, personal compatibility and duplicate warning, computed against the
 * > local wardrobe offline.*
 *
 * ## Three answers, three engine calls, and nothing invented in between
 *
 * Every judgement here already exists: `coverage`/`applyChange` count outfits (F-048),
 * `scoreColor` scores a colour against a person (F-026), `findDuplicates` measures how close
 * two garments in one category are (F-049). **This file composes them.** The only arithmetic
 * it performs is one subtraction, and that is a comparison rather than a colour decision —
 * the same line F-045's builder holds, and the reason both stayed mobile features instead of
 * becoming engine changes (E-008).
 *
 * ## Nothing is written, and that is the premise
 *
 * The garment has not been bought. It has no id, no `saved_color` row and no place in the
 * wardrobe; it exists for the length of one question. A `shopping_check` table would be state
 * for a decision nobody has taken, which is the shape F-041 refused with `change_log` and
 * F-042 refused twice in one migration.
 *
 * ## The three refusals are as much the feature as the three answers
 *
 * A type nobody recognises fills no slot, a person with no profile has no compatibility score,
 * and a wardrobe with nothing in the other two slots unlocks nothing that can be counted. Each
 * of those is reported as *what it is*, never as a zero — because `0 outfits` is an answer, and
 * "this engine cannot place a scarf" is not that answer.
 */

import type { Color } from '@irodora/color-core';
import {
  applyChange,
  coverage,
  findDuplicates,
  type Coverage,
  type CoverageContext,
  type CoverageGarment,
  type DuplicateCandidate,
  type DuplicatePair,
} from '@irodora/optimization';
import {
  scoreColor,
  type CompatibilityScore,
  type OutfitSlot,
  type PersonalProfile,
  type RuleSet,
} from '@irodora/recommendation';
import type { StoredGarment } from '@irodora/store';
import { slotFor } from '../outfit/builder';
import { colorOf } from '../wardrobe';

/**
 * The id the candidate carries while it is being considered.
 *
 * Not a UUIDv7, deliberately: every real garment id is one, so this cannot collide with a row
 * — and it reads as what it is in any output that leaks it. `findDuplicates` needs *an* id to
 * report a pair, and inventing a real-looking one would make a garment nobody owns
 * indistinguishable from one they do.
 */
export const CANDIDATE_ID = 'candidate-not-owned';

/** The thing being considered. No id, no row, no created-at — it has not been bought. */
export interface ShoppingCandidate {
  /** Free text, exactly as `garment.type` is. FR-39 asks for two fields, not a taxonomy. */
  readonly type: string;
  readonly color: Color;
  /** The published family, when the colour has one. Only `gaps` uses it; carried for parity. */
  readonly family?: string | undefined;
}

/** What the wardrobe does with a candidate, when it can be placed at all. */
export interface OutfitEffect {
  /** Valid outfits the wardrobe produces today. */
  readonly now: number;
  /** How many MORE it would produce. A difference, never a total. */
  readonly unlocked: number;
  /**
   * The score at or above which an outfit counted.
   *
   * Carried because **"three more outfits" means nothing without "out of nine, counted at
   * 60"**. `COVERAGE_THRESHOLD` is exported by F-048 for exactly this reason, and a caller
   * showing the count without it reports a measurement with no units.
   */
  readonly threshold: number;
}

export interface ShoppingCheck {
  /** `null` when the type fills no slot — a refusal, not a slot of zero. */
  readonly slot: OutfitSlot | null;
  /**
   * `null` when the candidate cannot be placed.
   *
   * **Never `unlocked: 0` for an unplaceable garment.** Zero is an answer — *"it adds
   * nothing"* — and a scarf is not a garment that adds nothing; it is a garment this engine
   * has no slot for. `slotFor` returns `null` for the same reason, and collapsing the two
   * would tell somebody their scarf is useless on the authority of a vocabulary list.
   */
  readonly outfits: OutfitEffect | null;
  /**
   * `null` when there is no profile to score against.
   *
   * A default profile would be a claim about somebody nobody asked. The outfit route already
   * refuses to invent one and sends people to set one up; this returns the absence so the
   * screen can say the same thing.
   */
  readonly compatibility: CompatibilityScore | null;
  /** Only pairs involving the candidate. Closest first, as `findDuplicates` orders them. */
  readonly duplicates: readonly DuplicatePair[];
}

/** Everything the check needs that the wardrobe does not carry. */
export interface ShoppingContext {
  /** `null` when nobody has set one up. */
  readonly profile: PersonalProfile | null;
  readonly rules: RuleSet;
  readonly reference: CoverageContext['reference'];
  readonly weights: CoverageContext['weights'];
  /** Defaults to F-048's `COVERAGE_THRESHOLD`. Exposed so a caller can state what it counted at. */
  readonly threshold?: number | undefined;
  /**
   * Today's coverage, when the caller already has it.
   *
   * The baseline is `t × r × s` engine calls and it does not depend on the candidate, so a
   * screen that recomputed it per keystroke would do the expensive half of this repeatedly to
   * get the same number. Passing it in is what makes changing the candidate cost only
   * `applyChange`'s cross-product of the other two slots — the saving F-048 exists for.
   */
  readonly baseline?: Coverage | undefined;
}

/** A stored garment as coverage sees it. `null` when its type fills no slot. */
function asCoverageGarment(garment: StoredGarment): CoverageGarment | null {
  const slot = slotFor(garment);
  if (slot === null) return null;
  return { id: garment.id, slot, color: colorOf(garment.color) };
}

/** A stored garment as duplicate detection sees it: its own type, not its slot (FR-44). */
const asDuplicateCandidate = (garment: StoredGarment): DuplicateCandidate => ({
  id: garment.id,
  category: garment.type,
  color: colorOf(garment.color),
});

/**
 * What this garment would do to this wardrobe.
 *
 * ## Why the wardrobe is filtered twice, differently
 *
 * Coverage sees **slots** and drops anything it cannot place; duplicate detection sees
 * **categories** and keeps everything, because a scarf can absolutely be a duplicate of
 * another scarf. Reusing one filtered list for both would silently stop reporting duplicates
 * for every garment type the outfit vocabulary does not know — a hole that grows every time
 * somebody types a word `SLOT_WORDS` has not heard of.
 */
export function shoppingCheck(
  candidate: ShoppingCandidate,
  wardrobe: readonly StoredGarment[],
  context: ShoppingContext,
): ShoppingCheck {
  const slot = slotFor(candidate);

  /*
   * DUPLICATES FIRST, because they are the one answer that does not need a slot or a profile.
   * A candidate the outfit engine cannot place and nobody has a profile for can still be the
   * jumper you already own, and that is the most useful thing this screen could tell you.
   */
  const owned = wardrobe.map(asDuplicateCandidate);
  const mine: DuplicateCandidate = {
    id: CANDIDATE_ID,
    category: candidate.type,
    color: candidate.color,
  };
  const duplicates = findDuplicates([mine, ...owned]).filter(
    (pair) => pair.a.id === CANDIDATE_ID || pair.b.id === CANDIDATE_ID,
  );

  const compatibility =
    context.profile === null ? null : scoreColor(context.profile, candidate.color, context.rules);

  if (slot === null || context.profile === null)
    // No slot, or no profile: `scoreOutfit` needs both, so there is no honest count to give.
    // The other answers stand — which is why this returns them rather than refusing wholesale.
    return { slot, outfits: null, compatibility, duplicates };

  const placeable = wardrobe.map(asCoverageGarment).filter((g): g is CoverageGarment => g !== null);
  const coverageContext: CoverageContext = {
    reference: context.reference,
    profile: context.profile,
    rules: context.rules,
    weights: context.weights,
    ...(context.threshold === undefined ? {} : { threshold: context.threshold }),
  };

  const before = context.baseline ?? coverage(placeable, coverageContext);
  const mineAsGarment: CoverageGarment = {
    id: CANDIDATE_ID,
    slot,
    color: candidate.color,
    family: candidate.family,
  };
  const after = applyChange(
    before,
    [...placeable, mineAsGarment],
    { kind: 'added', garment: mineAsGarment },
    coverageContext,
  );

  return {
    slot,
    outfits: {
      now: before.valid,
      // A DIFFERENCE, NEVER THE TOTAL. `after.valid` is the number somebody would read as
      // "this unlocks nine outfits" when eight of them were already theirs.
      unlocked: after.valid - before.valid,
      threshold: after.threshold,
    },
    compatibility,
    duplicates,
  };
}
