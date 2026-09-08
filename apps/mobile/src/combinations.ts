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
}

/** An OKLCh as the engine takes it. */
export type Oklch = readonly [number, number, number];

/**
 * Every relationship for a colour, ranked.
 *
 * Pure, and it throws nothing a caller has to catch: `generateHarmony` validates its input and
 * the only invalid input here is one the type already refuses.
 */
export function combinationsFor(source: Oklch): readonly Combination[] {
  return COMBINATION_ORDER.map((kind) => {
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
    };
  });
}

/** The first {@link COMBINATIONS_SHOWN}, for a screen that opens on an answer. */
export function leadingCombinations(source: Oklch): readonly Combination[] {
  return combinationsFor(source).slice(0, COMBINATIONS_SHOWN);
}
