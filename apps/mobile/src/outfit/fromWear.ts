/**
 * `07`'s *Save to Outfit Lab*: the combination handed to the Lab, once (F-248, ADR-0152 D5).
 *
 * `07`'s slots are corpus colours, and the Lab works with the garments a person owns. So the save
 * stores nothing: it hands the combination over, and the Lab opens with a draft built from it — for
 * each of the Lab's slots, the owned garment of that slot nearest the combination's colour, with the
 * top locked, as `13` opens with `07`'s outfit and its slot 1 locked. It is `13`'s own save that
 * persists, to the lookbook (ADR-0136).
 *
 * ## A mailbox, like the Lens's hand-off
 *
 * The route that saves and the route that opens are two screens with expo-router between them, so
 * the combination waits here until the Lab takes it, and taking it empties the box: a Lab opened
 * again later from the Wardrobe starts empty, as it always has (`lens/handoff.ts`'s shape and its
 * reasons — slugs, not a serialised route parameter, and one-shot).
 */

import type { OutfitSlot } from '@irodora/recommendation';
import type { StoredGarment } from '@irodora/store';
import { entryBySlug } from '../corpus';
import { differenceOklch } from '../engine';
import { slotFor, type OutfitDraft, type Placement } from './builder';

/** What `07` hands over: the colour in each of the Lab's slots, by corpus slug. */
export interface WornCombination {
  readonly top: string;
  readonly trouser: string | null;
  readonly shoe: string | null;
}

let waiting: WornCombination | null = null;

/** Hand a combination to the Lab. A second hand-off before the Lab takes the first replaces it. */
export function offerCombination(combination: WornCombination): void {
  waiting = combination;
}

/** The combination waiting for the Lab, once: taking it empties the box. */
export function takeCombination(): WornCombination | null {
  const taken = waiting;
  waiting = null;
  return taken;
}

/** Ties go to the earlier garment id, so the draft never depends on wardrobe order. */
const byId = (a: StoredGarment, b: StoredGarment): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * The Lab's opening draft (ADR-0152 D5): for each slot, the owned garment of that slot nearest the
 * combination's colour by ΔE00 (the engine's, through `engine.ts`), ties to the earlier garment id;
 * the top locked, as `13` opens. A slot with no owned garment is left empty, and the Lab proposes for
 * it. The outer layer waits for `13`'s fourth row (F-257).
 */
export function labDraftFrom(
  combination: WornCombination,
  wardrobe: readonly StoredGarment[],
): OutfitDraft {
  const slots: readonly (readonly [OutfitSlot, string | null])[] = [
    ['top', combination.top],
    ['trouser', combination.trouser],
    ['shoe', combination.shoe],
  ];
  return slots.flatMap(([slot, slug]): Placement[] => {
    const target = slug === null ? null : entryBySlug(slug);
    if (target === null) return [];
    const nearest = wardrobe
      .filter((g) => slotFor(g) === slot)
      .map((garment) => ({
        garment,
        distance: differenceOklch(target.derived.oklch, [
          garment.color.oklch_l,
          garment.color.oklch_c,
          garment.color.oklch_h,
        ]),
      }))
      .sort((a, b) => a.distance - b.distance || byId(a.garment, b.garment))[0];
    return nearest === undefined
      ? []
      : [{ slot, garment: nearest.garment, locked: slot === 'top' }];
  });
}
