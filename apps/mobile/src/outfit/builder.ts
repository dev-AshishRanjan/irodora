/**
 * The outfit builder (FR-33, F-045).
 *
 * ## The problem, and where it must not be solved
 *
 * `recommendOutfit` takes **one** anchor garment and fills every other slot. FR-33 wants **N
 * locked slots** constraining generation, and no engine call does that.
 *
 * The tempting fix is to score candidates against each locked garment here and combine the
 * results. **That is new colour arithmetic in the app**, and
 * [E-008](../../../../.harness/state/effects.json) is exactly about why it cannot live here: a
 * second implementation makes the same outfit rank differently on two surfaces, both pass
 * their own tests, and nothing runs both.
 *
 * `scoreOutfit` already takes the **whole composed outfit**. So generation is: for each
 * unlocked slot, for each garment that could fill it, compose `locks + candidate`, ask the
 * engine what that outfit scores, and rank by its answer. Every judgement is the engine's.
 * This file supplies combinations and sorts a list; the only arithmetic in it is a comparison.
 *
 * ## Determinism is criterion 2, and the engine is not what threatens it
 *
 * *"The same locked set and versions always regenerate the same candidates."* The engine is
 * pure, so every risk is here:
 *
 * - **No `Math.random`.** No shuffle, no chance tie-break.
 * - **No `Date.now` in the generation path.** A time-seeded anything satisfies every test
 *   written on one afternoon.
 * - **A TOTAL ordering.** Sorting by score alone is not deterministic when two candidates tie:
 *   `sort` is stable, so a tie preserves *input* order, and the input order is the wardrobe's —
 *   which changes the moment a garment is added. Ties therefore break on **garment id**, a
 *   UUIDv7, which is stable and unique.
 *
 * The test that catches this is **not** "call it twice and compare" — that passes for an
 * implementation that is entirely order-dependent. It is the same locks over a **differently
 * ordered wardrobe**.
 *
 * ## What F-108 had to fix first
 *
 * Turning a stored garment into an `OutfitPiece` needs its colour as a `Color`, and ADR-0005
 * will not produce one without complete provenance. A Lens-captured garment could not supply
 * it until F-108 stored the capture conditions — so this file's first line of real work was
 * blocked by a defect two features upstream, and `colorOf` is what unblocked it.
 */

import {
  outfitWeights,
  OUTFIT_SLOTS,
  scoreOutfit,
  type Candidate,
  type OutfitPiece,
  type OutfitScore,
  type OutfitSlot,
  type PersonalProfile,
  type RuleSet,
} from '@irodora/recommendation';
import type { StoredGarment } from '@irodora/store';
import type { Profile } from '../profile/dimensions';
import { colorOf } from '../wardrobe';

/** A garment placed in a slot, with whether the person has decided about it. */
export interface Placement {
  readonly slot: OutfitSlot;
  readonly garment: StoredGarment;
  readonly locked: boolean;
}

/** The outfit as it stands. Sparse: a slot with nothing in it is simply absent. */
export type OutfitDraft = readonly Placement[];

export interface RankedGarment {
  readonly garment: StoredGarment;
  /**
   * The whole outfit's score with this garment in the slot.
   *
   * The **score object**, never a bare number. F-031's criterion 2 says the overall is never
   * present without its components, and handing the surface a number would make that
   * unsatisfiable one layer up.
   */
  readonly score: OutfitScore;
}

export interface SlotProposal {
  readonly slot: OutfitSlot;
  /** Best first. Empty when the wardrobe holds nothing that could fill the slot. */
  readonly ranked: readonly RankedGarment[];
}

/**
 * The engine's profile, from the one the store holds.
 *
 * A narrowing, not a translation: the store carries seven dimensions and the engine scores on
 * four. Written out rather than spread, so a dimension added to the store does not silently
 * become a scoring factor nobody chose.
 */
export function engineProfile(profile: Profile): PersonalProfile {
  return {
    lightness: profile.lightness,
    temperatureBias: profile.temperatureBias,
    chroma: profile.chroma,
    contrast: profile.contrast,
    confidence: {
      temperature: profile.confidence.temperature,
      lightness: profile.confidence.lightness,
      chroma: profile.confidence.chroma,
      contrast: profile.confidence.contrast,
    },
  };
}

const pieceOf = (p: Placement): OutfitPiece => ({ slot: p.slot, color: colorOf(p.garment.color) });

/**
 * Which slot a garment can fill.
 *
 * `garment.type` is free text — FR-39 asks for two fields, not a taxonomy — so this maps the
 * words people actually type. **An unrecognised type fills no slot** rather than defaulting to
 * `top`: a garment silently proposed as a shirt because nobody recognised "belt" is worse than
 * one the builder does not offer, because the second is visible and the first is not.
 *
 * The list is deliberately short and English-only today. Widening it is a content question —
 * the taxonomy is `content/`'s, not this file's — and guessing at it here would be the second
 * place garment vocabulary is defined.
 *
 * **The parameter is `Pick<…, 'type'>` rather than `StoredGarment` (F-052).** It only ever read
 * the type, and the shopping check asks this question about a garment nobody owns — one that
 * has no id, no colour row and no created-at, because the entire premise is that it has not
 * been bought. Widening the parameter is what stops that caller from having to fabricate a
 * stored garment to ask a question about a word.
 */
const SLOT_WORDS: Readonly<Record<OutfitSlot, readonly string[]>> = {
  top: ['top', 'shirt', 'jumper', 'sweater', 'blouse', 'jacket', 'coat', 'cardigan', 't-shirt'],
  trouser: ['trouser', 'trousers', 'jeans', 'skirt', 'shorts', 'chinos', 'slacks'],
  shoe: ['shoe', 'shoes', 'boot', 'boots', 'trainers', 'sneakers', 'sandals', 'loafers'],
};

export function slotFor(garment: Pick<StoredGarment, 'type'>): OutfitSlot | null {
  const type = garment.type.trim().toLowerCase();
  return OUTFIT_SLOTS.find((slot) => SLOT_WORDS[slot].includes(type)) ?? null;
}

export interface RegenerateInput {
  readonly draft: OutfitDraft;
  readonly wardrobe: readonly StoredGarment[];
  readonly profile: Profile;
  readonly rules: RuleSet;
  /** The published weight content, for `outfitWeights`. */
  readonly weights: Parameters<typeof outfitWeights>[0];
  /** The corpus, as the reference set the components score against. */
  readonly reference: readonly Candidate[];
}

/**
 * Propose garments for every slot the person has not locked.
 *
 * A locked placement is never proposed against and never replaced — that is what "locking
 * constrains generation" means, and the tests assert it rather than this comment doing so.
 */
export function regenerate(input: RegenerateInput): readonly SlotProposal[] {
  const { draft, wardrobe, profile, rules, weights, reference } = input;

  const locked = draft.filter((p) => p.locked);
  const lockedSlots = new Set(locked.map((p) => p.slot));
  const lockedPieces = locked.map(pieceOf);
  const engine = engineProfile(profile);
  const componentWeights = outfitWeights(weights);

  return OUTFIT_SLOTS.filter((slot) => !lockedSlots.has(slot)).map((slot) => ({
    slot,
    ranked: wardrobe
      .filter((g) => slotFor(g) === slot)
      .map((garment) => ({
        garment,
        // THE ENGINE SCORES THE WHOLE OUTFIT, locks included. Scoring the candidate alone would
        // answer a different question — "is this a good jumper" rather than "is this a good
        // jumper WITH those trousers" — and the second is the one FR-33 asks.
        score: scoreOutfit(
          [...lockedPieces, { slot, color: colorOf(garment.color) }],
          reference,
          engine,
          rules,
          componentWeights,
        ),
      }))
      .sort(compareRanked),
  }));
}

/**
 * Best first, ties broken by id.
 *
 * The tie-break is not tidiness. `sort` is stable, so without it two equally-scored garments
 * come back in **wardrobe order** — which changes the day a garment is added, while criterion 2
 * says the same locks and versions always regenerate the same candidates. A UUIDv7 is stable
 * and unique, so this ordering is total.
 */
function compareRanked(a: RankedGarment, b: RankedGarment): number {
  if (a.score.overall !== b.score.overall) return b.score.overall - a.score.overall;
  return a.garment.id < b.garment.id ? -1 : a.garment.id > b.garment.id ? 1 : 0;
}

/** Place a garment, replacing whatever was in that slot. Locking is a separate decision. */
export function place(draft: OutfitDraft, slot: OutfitSlot, garment: StoredGarment): OutfitDraft {
  return [...draft.filter((p) => p.slot !== slot), { slot, garment, locked: false }];
}

/** Lock or unlock a slot. A slot with nothing in it cannot be locked — there is nothing to fix. */
export function setLocked(draft: OutfitDraft, slot: OutfitSlot, locked: boolean): OutfitDraft {
  return draft.map((p) => (p.slot === slot ? { ...p, locked } : p));
}
