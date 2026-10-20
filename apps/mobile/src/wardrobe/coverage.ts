/**
 * The wardrobe as `coverage()` reads it, assembled once (F-242, ADR-0138 D6).
 *
 * ## Why this is its own module
 *
 * `coverage()` and `gaps()` need the garments that fill an outfit slot, and a context of four
 * things: the profile, the rule set, the weights and the corpus as a reference set. The Wardrobe
 * route assembled that context inline (F-150). Home's count pill (`01.wardrobe.count`) needs the
 * same number, and a second inline copy would let `01`'s pill and `11`'s dial disagree the first
 * time one of the four moved — so both routes take it from here (E-208).
 *
 * ## Without a profile there is no context
 *
 * A valid outfit is one that scores at or above the threshold against a person's profile, so
 * without a stored profile there is nothing to count against. `undefined` says so, and each
 * screen omits the figure rather than drawing a zero it never computed (R9 §4 E2).
 *
 * Pure: every input is an argument, and nothing here touches the repository or React.
 */

import { outfitWeights, parseWeightContent } from '@irodora/recommendation';
import type { CoverageContext, CoverageGarment } from '@irodora/optimization';
import type { StoredGarment, StoredPersonalProfile } from '@irodora/store';
import { engineProfile, slotFor } from '../outfit/builder';
import { toWorking } from '../profile/store';
import { ruleSet } from '../rules';
import { WEIGHTS_TEXT } from '../rules/generated/weights';
import { colorOf } from '../wardrobe';
import { referenceSet } from './reference';

/** The garments that fill an outfit slot, as `coverage()` takes them. A garment with no slot is not one. */
export function placeableGarments(garments: readonly StoredGarment[]): readonly CoverageGarment[] {
  return garments
    .map((g): CoverageGarment | null => {
      const slot = slotFor(g);
      return slot === null ? null : { id: g.id, slot, color: colorOf(g.color) };
    })
    .filter((g): g is CoverageGarment => g !== null);
}

/** What a valid outfit is counted against, or `undefined` when no profile is stored. */
export function coverageContext(stored: StoredPersonalProfile | null): CoverageContext | undefined {
  if (stored === null) return undefined;
  return {
    profile: engineProfile(toWorking(stored)),
    rules: ruleSet(),
    weights: outfitWeights(parseWeightContent(JSON.parse(WEIGHTS_TEXT), 'weights.json')),
    reference: referenceSet(),
  };
}
