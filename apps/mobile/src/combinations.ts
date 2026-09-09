/**
 * What goes with a colour — the engine that has been finished since F-014 and called by nothing.
 *
 * ## The gap
 *
 * `@irodora/color-harmony` generates twelve relationships in OKLCh, gamut-maps every colour it
 * returns, and reports the ΔE00 the mapping cost. It is covered by gate 5 and by property tests.
 * **It was imported by zero files** — F-183's gate says so by name, and `packages/color-core`
 * declares a dependency on it that no source backs.
 *
 * Reported as *"if shirt is a color, then what color could pants should be … that was the whole
 * point of this app."*
 *
 * ## Nothing here computes
 *
 * Every colour comes from `generateHarmony`. This file decides **which relationships to offer
 * and in what order**, which is a product decision rather than a colour-science one — and it is
 * reachable by a test that renders nothing, the convention `contemporary.ts`, `compare.ts` and
 * `home.ts` all follow.
 *
 * ## Twelve is a menu; choosing is the feature
 *
 * The engine generates twelve. A screen listing all twelve is a colour-theory lesson, and
 * somebody asking *what goes with this* has asked one question.
 *
 * The order is **hue first**, and the reason is what the question means: a person holding a
 * shirt is asking what OTHER colour to put beside it, and a relationship that only changes
 * lightness or chroma returns a variation on the shirt. Those are still offered — a tonal ramp
 * is genuinely useful for a second garment in the same family — but they come after.
 *
 * **This ranking is a decision with no measurement behind it.** It is written here so somebody
 * can disagree with it, rather than buried in a render where they would have to infer it.
 */

import type { Color } from '@irodora/color-core';
import { scoreColor, type PersonalProfile, type RuleSet } from '@irodora/recommendation';
import type { Deficiency } from '@irodora/cvd-engine';
import { HARD_TO_SEPARATE, SEVERITY, worstSeparation } from './outfit/cvd';
import { displayFromOklch } from './engine';
import {
  generateHarmony,
  HARMONY_KINDS,
  VARIES,
  type Harmony,
  type HarmonyColor,
  type HarmonyKind,
} from '@irodora/color-harmony';

/**
 * The relationships offered, in order.
 *
 * Derived from `VARIES` rather than listed, so a kind added to the engine appears here without
 * an edit — and a kind removed from it cannot linger as a name nothing generates.
 *
 * `warm-cool` is pulled to the front of the hue group by hand and that is the one hand-placed
 * entry: it is the relationship the outfit engine already scores against (`pairingCoherence`),
 * so it is the one a person is most likely to have seen this product reason about.
 */
export const COMBINATION_ORDER: readonly HarmonyKind[] = (() => {
  const changesHue = HARMONY_KINDS.filter((k) => VARIES[k].includes('h'));
  const rest = HARMONY_KINDS.filter((k) => !VARIES[k].includes('h'));
  const warmCool: HarmonyKind = 'warm-cool';
  return [warmCool, ...changesHue.filter((k) => k !== warmCool), ...rest];
})();

/**
 * How many are shown before a person has asked for more.
 *
 * Five, which is the hue group plus one — enough that the screen answers the question several
 * ways, few enough that it is an answer. The rest are reachable, not hidden.
 */
export const COMBINATIONS_SHOWN = 5;

/**
 * The message key naming each relationship, in the order they are offered.
 *
 * **Derived from the order, not listed beside it.** The screen renders the key by building
 * it from the kind, so the literal never appears in source and `i18n.test.ts`’s unused-key
 * scan — which is a source-literal scan — cannot see the consumer. That exclusion is safe
 * only while both directions are pinned: every key here exists in both catalogues, and the
 * catalogue declares no `combo.*` this does not emit. Same mechanism, and same protection, as
 * `SCORE_MESSAGE_KEYS` and `OUTFIT_MESSAGE_KEYS` (F-052, F-124).
 */
export const COMBINATION_MESSAGE_KEYS: readonly string[] = COMBINATION_ORDER.map(
  (kind) => `combo.${kind}`,
);

/**
 * Two colours in a set that are close together under one deficiency.
 *
 * **A measurement, never a verdict.** `outfit/cvd.ts` states the rule this obeys:
 *
 * > *"These two are hard to tell apart"* — an observation about the colours. Never *"you may
 * > not be able to distinguish these"* — a claim about the reader's vision, which this product
 * > knows nothing about and must not imply it does.
 *
 * So the note carries the deficiency, the severity and the number, and the combination is still
 * shown. Somebody choosing a low-separation pair on purpose is making a decision.
 *
 * ## It is reported for EVERY combination, not only the poor ones
 *
 * Measured over the shipped corpus, **53% of generated relationships fall below the convention**
 * — `warm-cool` at 96%, `analogous` at 95%. That is not noise and the threshold was not nudged:
 * warm against cool at similar lightness is precisely the axis a red-green deficiency loses, so a
 * high rate there is the check telling the truth about the relationship.
 *
 * But a badge that appears on half the cards reads as an alarm, and this screen already settled
 * the same question one feature ago for the gamut cost:
 *
 * > *Zero is a value, not an absence — a screen that simply omitted the line would leave a
 * > person unable to tell "nothing moved" from "nobody checked".*
 *
 * So the figure is always present and {@link SeparationNote.close} says whether it fell below
 * the convention. A number that is always there is data; one that appears half the time is a
 * warning, and this product does not warn people about their own eyes.
 */
export interface SeparationNote {
  /** Which deficiency separates the pair least. */
  readonly deficiency: Deficiency;
  /** The severity the check ran at. Reported, because a score without one is not reproducible. */
  readonly severity: number;
  /** [0,100] — the worst pair's separation. */
  readonly separation: number;
  /** The two colours, by hex, so a screen can point at them rather than at the set. */
  readonly pair: readonly [string, string];
  /** Whether it fell below {@link HARD_TO_SEPARATE}. The convention, not a verdict. */
  readonly close: boolean;
}

/**
 * The worst pair in a set, always — `null` only when there is no pair to measure.
 *
 * **All pairs, including the source.** A combination is the colour in hand placed beside its
 * companions, so a companion that vanishes against the shirt is the case that matters most —
 * and it is exactly the pair a check over companions alone would miss.
 *
 * **The worst, not the mean.** A set that survives two pairs and collapses on the third is a set
 * that collapses, and averaging would report otherwise.
 *
 * Nothing here computes a separation: `worstSeparation` is FR-5's, the same definition the
 * design system's `cvdPairs` check and the recommendation engine read (E-005).
 */
export function separationOf(
  colours: readonly { hex: string; color: Color }[],
): SeparationNote | null {
  let found: SeparationNote | null = null;
  for (let i = 0; i < colours.length; i += 1)
    for (let j = i + 1; j < colours.length; j += 1) {
      const a = colours[i];
      const b = colours[j];
      if (a === undefined || b === undefined) continue;
      const { score, deficiency } = worstSeparation(a.color, b.color);
      if (found !== null && found.separation <= score) continue;
      found = {
        deficiency,
        severity: SEVERITY,
        separation: score,
        pair: [a.hex, b.hex],
        close: score < HARD_TO_SEPARATE,
      };
    }
  return found;
}

/** A relationship, with the cost of every colour in it already summed. */
export interface Combination {
  readonly kind: HarmonyKind;
  readonly harmony: Harmony;
  /**
   * The colours other than the source, in the engine's order.
   *
   * The source itself is dropped: a screen showing "what goes with this" beside the colour it is
   * about does not need to include it in the list of companions, and a person counting five
   * swatches where four are new is counting wrong.
   */
  readonly companions: readonly HarmonyColor[];
  /**
   * The largest ΔE00 any colour in this relationship paid to be shown, or `0`.
   *
   * **The number behind "less vivid".** A relationship whose colours all sit inside the display
   * gamut reports 0 — which is a value rather than an absence, so a screen can say *nothing was
   * lost* rather than saying nothing.
   */
  readonly gamutCost: number;
  /** Whether any colour in it moved at all. `gamutCost > 0` implies this; the reverse is not so. */
  readonly wasMapped: boolean;
  /**
   * The worst pair under simulated CVD (F-198). `null` only for a set with fewer than two
   * colours, which the generators do not produce.
   *
   * Always populated, so a screen shows a figure rather than a badge that appears half the time
   * — see {@link SeparationNote}.
   */
  readonly separation: SeparationNote | null;
  /**
   * [0,100] — how well this relationship's companions suit the person, or `null` without one.
   *
   * **`null` rather than a midpoint**, because those are different facts. F-195 found the shape
   * of the trap next door: a no-evidence profile scores 50 with every factor neutral, and a
   * caller that could not tell that from a real 50 would present the engine's midpoint as an
   * opinion about somebody it knows nothing about.
   */
  readonly personalFit: number | null;
}

/** An OKLCh as the engine takes it. */
export type Oklch = readonly [number, number, number];

/**
 * Every relationship for a colour, ranked.
 *
 * Pure, and it throws nothing a caller has to catch: `generateHarmony` validates its input and
 * the only invalid input here is one the type already refuses.
 */
export function combinationsFor(
  source: Oklch,
  weighting?: { readonly profile: PersonalProfile; readonly rules: RuleSet },
): readonly Combination[] {
  const shown = COMBINATION_ORDER.map((kind) => {
    const harmony = generateHarmony(source, kind);

    /*
     * THE SOURCE IS DROPPED BY VALUE, not by index.
     *
     * Every generator includes the source somewhere in its output and they do not agree on
     * where — `monochromatic` puts it in the middle of a ramp, `complementary` puts it first.
     * Filtering on the coordinates is the only reading that holds for all twelve, and it is
     * exact rather than approximate: the source passes through the generator unmapped, so it
     * comes back bit-identical when it was in gamut to begin with.
     */
    const companions = harmony.colors.filter(
      (c) =>
        !(
          c.requested[0] === source[0] &&
          c.requested[1] === source[1] &&
          c.requested[2] === source[2]
        ),
    );

    const gamutCost = companions.reduce((worst, c) => Math.max(worst, c.gamutDeltaE00), 0);

    return {
      kind,
      harmony,
      companions,
      gamutCost,
      /*
       * READ FROM THE FLAG, NOT FROM THE COST. A colour can be gamut-mapped and land close
       * enough that ΔE00 rounds to zero — `wasGamutMapped` is the engine saying it moved, and
       * inferring it from the number would report "nothing was lost" about a colour that was
       * changed.
       */
      wasMapped: companions.some((c) => c.wasGamutMapped),

      /*
       * THE SOURCE IS IN THE CHECK. See `separationOf`: a companion that vanishes against the
       * colour in hand is the pair that matters most, and it is the one a check over companions
       * alone cannot see.
       */
      separation: separationOf([
        displayFromOklch([source[0], source[1], source[2]]),
        ...companions.map((x) => displayFromOklch([x.oklch[0], x.oklch[1], x.oklch[2]])),
      ]),

      /*
       * THE MEAN OF THE COMPANIONS, and the source is deliberately NOT in it: a person already
       * has that colour, and scoring it would move every relationship by the same amount while
       * adding nothing that distinguishes them.
       */
      personalFit:
        weighting === undefined
          ? null
          : Math.round(
              companions.reduce(
                (sum, x) =>
                  sum +
                  scoreColor(
                    weighting.profile,
                    displayFromOklch([x.oklch[0], x.oklch[1], x.oklch[2]]).color,
                    weighting.rules,
                  ).score,
                0,
              ) / Math.max(companions.length, 1),
            ),
    };
  });

  /*
   * THE WEIGHT REORDERS; IT NEVER REMOVES (F-198).
   *
   * Without a profile the order is the geometric one `COMBINATION_ORDER` states — hue first,
   * and said out loud there to be disagreed with. With one, the relationships whose companions
   * suit the person come first, ties broken on the geometric order so the result stays
   * deterministic and a tie does not depend on iteration.
   *
   * Every relationship is still returned. F-194's rule holds: the ranking decides what somebody
   * sees first, not what they are allowed to see.
   */
  /*
   * A RELATIONSHIP THAT PROPOSES NOTHING IS NOT OFFERED (found in F-198).
   *
   * F-194 dropped the source from its own companions by value, and for 23 corpus colours that
   * leaves a relationship with NO companions at all — every one is `near-neutral` on a colour
   * that is already near-neutral, so the generator returns the source and the filter removes it.
   *
   * The screen rendered those as a card with a heading, a "Generated" label, a gamut-cost line
   * and **no swatches**: an empty answer that looks like an answer. It was invisible because
   * F-194's own check asked one source whether every relationship had companions, and that
   * source had them.
   *
   * Dropping it here rather than in the screen, because it is not a rendering question: a
   * relationship with nothing in it is not a relationship this module should be offering.
   */
  const offered = shown.filter((c) => c.companions.length > 0);

  if (weighting === undefined) return offered;
  const rank = new Map(offered.map((c, i) => [c.kind, i]));
  return [...offered].sort(
    (a, b) =>
      (b.personalFit ?? 0) - (a.personalFit ?? 0) ||
      (rank.get(a.kind) ?? 0) - (rank.get(b.kind) ?? 0),
  );
}

/** The first {@link COMBINATIONS_SHOWN}, for a screen that opens on an answer. */
export function leadingCombinations(
  source: Oklch,
  weighting?: { readonly profile: PersonalProfile; readonly rules: RuleSet },
): readonly Combination[] {
  return combinationsFor(source, weighting).slice(0, COMBINATIONS_SHOWN);
}
