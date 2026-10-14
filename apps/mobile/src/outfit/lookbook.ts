/**
 * The lookbook, as data (F-238, FR-33; ADR-0136 D4, D5).
 *
 * Pure: a draft from the Outfit Lab in, a record for the store out, and a stored record back into
 * what a screen shows. Nothing here renders and nothing here writes.
 *
 * ## The score of the outfit as composed
 *
 * The Lab's proposals each score *the locked pieces plus one candidate* — the question "is this a
 * good jumper with those trousers". A saved outfit needs the other question, "what does this whole
 * outfit score", which the Lab never asked. {@link scoreDraft} is that one engine call over every
 * placed piece, and the Lab shows it beside the save, so what is stored is what the person saw.
 * F-257's score card is composed over the same function (ADR-0136 D7).
 *
 * ## A snapshot, and never a recomputation
 *
 * A garment's colour row can be overwritten and the garment removed; the profile is updated in
 * place and keeps no history. So {@link outfitRecord} copies each scored colour with its
 * provenance and keeps the score as computed, and {@link shownScoreOf} reads a stored record back
 * without calling the engine at all. A saved figure is a claim about the moment it was saved, and
 * the envelope says which versions made it (golden rule 11).
 */

import { assertEnvelope } from '@irodora/color-core';
import { ENGINE_VERSION } from '@irodora/color-spaces';
import { COVERAGE_THRESHOLD } from '@irodora/optimization';
import {
  outfitWeights,
  OUTFIT_SLOTS,
  RECOMMENDATION_VERSION,
  scoreOutfit,
  type OutfitScore,
  type RuleSet,
} from '@irodora/recommendation';
import {
  captureConditionsOf,
  type NewOutfit,
  type NewSavedColor,
  type OutfitDirection,
  type OutfitEnvelope,
  type SavedColorRow,
  type StoredOutfit,
  type StoredPersonalProfile,
} from '@irodora/store';
import { CORPUS_LABEL } from '../corpus';
import { RULES_OCCASION } from '../rules';
import { engineProfile, pieceOf, type OutfitDraft, type RegenerateInput } from './builder';

/** What scoring a draft needs: everything the Lab's regeneration does, but the draft and wardrobe. */
export type ScoringContext = Omit<RegenerateInput, 'draft' | 'wardrobe'>;

/** One engine call over every placed piece: the score of the outfit as composed. */
export function scoreDraft(draft: OutfitDraft, context: ScoringContext): OutfitScore {
  return scoreOutfit(
    draft.map(pieceOf),
    context.reference,
    engineProfile(context.profile),
    context.rules,
    outfitWeights(context.weights),
  );
}

/** An outfit is one garment per slot (FR-42's combinations), so it is complete when every slot is filled. */
export function isComplete(draft: OutfitDraft): boolean {
  return OUTFIT_SLOTS.every((slot) => draft.some((p) => p.slot === slot));
}

/**
 * What an outfit IS: its slot→garment pairs, in one canonical order. The locks are how it was made,
 * not what it is, so they are not part of it. The store compares compositions the same way.
 */
export function compositionKey(
  items: readonly { readonly slot: string; readonly garmentId: string }[],
): string {
  return items
    .map((item) => `${item.slot}=${item.garmentId}`)
    .sort()
    .join('|');
}

/** The composition of a draft. */
export const draftKey = (draft: OutfitDraft): string =>
  compositionKey(draft.map((p) => ({ slot: p.slot, garmentId: p.garment.id })));

/** The composition of a saved outfit. */
export const storedKey = (outfit: StoredOutfit): string => compositionKey(outfit.items);

/**
 * The versions that scored an outfit (FR-10; color-engine.md §11).
 *
 * The profile is named by its identity and revision, `id:updatedAt`, because no published profile
 * version exists to read and the row is updated in place. Checked with the engine's own
 * `assertEnvelope`, so this file is not a second validator of what a version looks like.
 */
export function outfitEnvelope(profile: StoredPersonalProfile, rules: RuleSet): OutfitEnvelope {
  const envelope: OutfitEnvelope = {
    engine: ENGINE_VERSION,
    scorer: RECOMMENDATION_VERSION,
    corpus: CORPUS_LABEL,
    rules: rules.versionId,
    occasion: RULES_OCCASION,
    profile: `${profile.id}:${String(profile.updatedAt)}`,
  };
  assertEnvelope({
    engine: envelope.engine,
    corpus: envelope.corpus,
    rules: envelope.rules,
    profile: envelope.profile,
  });
  return envelope;
}

/**
 * A colour row as an outfit's snapshot holds it: the same values, its conditions as one object.
 * The values are copied as the engine wrote them (E-001); a captured colour without its conditions
 * is refused here, by name, as it is everywhere else (ADR-0005).
 */
function snapshotOf(row: SavedColorRow): Omit<NewSavedColor, 'id'> {
  const conditions = captureConditionsOf(row);
  return {
    name: row.name,
    xyz_x: row.xyz_x,
    xyz_y: row.xyz_y,
    xyz_z: row.xyz_z,
    lab_l: row.lab_l,
    lab_a: row.lab_a,
    lab_b: row.lab_b,
    oklch_l: row.oklch_l,
    oklch_c: row.oklch_c,
    oklch_h: row.oklch_h,
    hex: row.hex,
    source: row.source,
    confidence: row.confidence,
    corpus_slug: row.corpus_slug,
    ...(conditions === null ? {} : { conditions }),
  };
}

/**
 * The record a complete draft is saved as.
 *
 * `score` is the one the Lab showed, passed in rather than recomputed, so the record cannot differ
 * from what the person saw. Slots in the engine's order; each label is what the slot was called on
 * screen; components in the engine's order, each with its weight and contribution from the overall's
 * own decomposition.
 */
export function outfitRecord(
  draft: OutfitDraft,
  score: OutfitScore,
  envelope: OutfitEnvelope,
): NewOutfit {
  if (!isComplete(draft))
    throw new Error(
      'lookbook: an outfit is one garment per slot, and this draft has an empty one. The save is ' +
        'disabled until every slot is filled; reaching this means something enabled it early.',
    );
  return {
    overall: score.overall,
    countsThreshold: COVERAGE_THRESHOLD,
    envelope,
    items: OUTFIT_SLOTS.flatMap((slot) =>
      draft
        .filter((p) => p.slot === slot)
        .map((p) => ({
          slot: p.slot,
          garmentId: p.garment.id,
          garmentLabel: p.garment.name ?? p.garment.type,
          locked: p.locked,
          color: snapshotOf(p.garment.color),
        })),
    ),
    components: score.components.map((c) => {
      const factor = score.factors.find((f) => f.component === c.component);
      if (factor === undefined)
        throw new Error(
          `lookbook: the score has a component "${c.component}" with no factor. The engine ` +
            'reports both for all six, always; a missing one is a different engine.',
        );
      return {
        component: c.component,
        score: c.score,
        direction: c.direction,
        weight: factor.weight,
        contribution: factor.contribution,
      };
    }),
  };
}

/** The catalogue key for one component's sentence, in the engine's own format (E-053). */
export const componentMessageKey = (component: string, direction: OutfitDirection): string =>
  `outfit.${component}.${direction}`;

/** A score as a screen shows it: the overall beside its components, never instead of them (FR-32). */
export interface ShownScore {
  readonly overall: number;
  readonly components: readonly {
    readonly component: string;
    readonly score: number;
    readonly messageKey: string;
  }[];
}

/** A live score, as the Lab shows it. */
export const shownScoreOfScore = (score: OutfitScore): ShownScore => ({
  overall: score.overall,
  components: score.components.map((c) => ({
    component: c.component,
    score: c.score,
    messageKey: c.messageKey,
  })),
});

/** A stored score, as the lookbook shows it: read back, never recomputed. */
export const shownScoreOf = (outfit: StoredOutfit): ShownScore => ({
  overall: outfit.overall,
  components: outfit.components.map((c) => ({
    component: c.component,
    score: c.score,
    messageKey: componentMessageKey(c.component, c.direction),
  })),
});
