/**
 * Which two colours in a set are hard to tell apart, and what to swap to fix it.
 *
 * > *CVD outfit mode — flag reduced separation and propose alternatives with the measured
 * > improvement. Improvement is stated as a percentage derived from FR-5, reproducible from the
 * > stored envelope.* — FR-35
 *
 * ## There is no simulation preview here, and that is the whole design
 *
 * [[cvd-is-scoring-not-rendering]] is blunt about it:
 *
 * > *Someone with deuteranomaly choosing trousers does not want to see what their outfit looks
 * > like **to someone else**. They want to know whether the outfit works … and if not, what to
 * > wear instead.*
 *
 * The industry default is a display filter, which helps designers and does close to nothing for
 * the person it names. This module finds the worst pair, searches the corpus for a replacement
 * that raises separation, and reports the before, the after and the improvement.
 *
 * ## One definition of separation
 *
 * `separationScore` from `@irodora/cvd-engine` — FR-5's, the same one the design system's
 * `cvdPairs` check and the recommendation engine read
 * ([E-005](../../../../.harness/state/effects.json)). Nothing here computes a separation of its
 * own, and nothing here simulates a colour for display.
 *
 * ## What the copy may never say
 *
 * *"These two are hard to tell apart"* — an observation about the colours.
 * Never *"you may not be able to distinguish these"* — a claim about the reader's vision, which
 * this product knows nothing about and must not imply it does. Criterion 3, and it is checked.
 */

import { separationScore, type Deficiency } from '@irodora/cvd-engine';
import { xyzToSrgb, type Triple } from '@irodora/color-spaces';
import type { Color } from '@irodora/color-core';
import { allEntries, colorFor, CORPUS_LABEL, type PublishedEntry } from '../corpus';

/** The three deficiencies, checked at the strongest tabulated severity. */
export const DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

/**
 * The severity every check here runs at.
 *
 * The strongest tabulated one. A separation that only holds for mild deficiency is not a
 * property worth reporting — it would be an accessibility claim with a footnote nobody reads.
 */
export const SEVERITY = 1;

/**
 * Below this separation score, two colours are reported as hard to tell apart.
 *
 * **A convention, not a measured threshold** (NFR-2), and deliberately low. `separationScore` is
 * [0,100]; 20 is well into the range where the post-simulation ΔE00 and lightness difference are
 * both small. Setting it higher would flag pairs most people manage fine and teach the reader to
 * dismiss the flag, which is worse than not having one.
 */
export const HARD_TO_SEPARATE = 20;

/** How much better a swap has to be before it is worth proposing. Also a convention. */
export const WORTH_PROPOSING = 15;

/** A member of the set being checked. `id` is how the caller names it — a corpus slug. */
export interface CheckedColour {
  readonly id: string;
  readonly label: string;
  readonly color: Color;
}

/**
 * The versions a reported improvement can be reproduced from.
 *
 * FR-35 asks for reproducibility "from the stored envelope". **Nothing stores one yet** — the
 * recommendation table is unbuilt — so what this feature owes, and gates, is that the number
 * CAN be recomputed from these three strings and the two colours. The storing is owed by
 * whatever first persists a recommendation.
 */
export interface CvdEnvelope {
  readonly engine: string;
  readonly corpus: string;
  readonly severity: number;
}

/** One pair the check reports, with the alternative if the corpus offers a better one. */
export interface SeparationFinding {
  readonly a: CheckedColour;
  readonly b: CheckedColour;
  /** Which deficiency separates them least. */
  readonly deficiency: Deficiency;
  /** [0,100] — the worst separation across the three deficiencies. */
  readonly separation: number;
  /** The corpus entry that would replace `b`, or `null` when nothing improves it enough. */
  readonly alternative: {
    readonly slug: string;
    readonly label: string;
    readonly hex: string;
    readonly separation: number;
    /** Percentage points gained, on the same [0,100] scale. `separation - finding.separation`. */
    readonly improvement: number;
  } | null;
  readonly envelope: CvdEnvelope;
}

const rgbOf = (color: Color): Triple => xyzToSrgb(color.xyz);

/**
 * The worst separation between two colours, and which deficiency produced it.
 *
 * The **worst**, not the mean: a pair that survives two deficiencies and vanishes under the
 * third is a pair that vanishes, and averaging would report otherwise.
 */
export function worstSeparation(
  a: Color,
  b: Color,
): { readonly score: number; readonly deficiency: Deficiency } {
  const ra = rgbOf(a);
  const rb = rgbOf(b);
  let score = 100;
  // Seeded with `protan` by name rather than by index, so there is no element access that could
  // be undefined and no assertion silencing the question.
  let deficiency: Deficiency = 'protan';
  for (const d of DEFICIENCIES) {
    const found = separationScore(ra, rb, d, SEVERITY);
    if (found < score) {
      score = found;
      deficiency = d;
    }
  }
  return { score, deficiency };
}

/**
 * A corpus entry that would separate better from `keep` than `replace` does.
 *
 * Searched over the published corpus in slug order and resolved by the **best** score, so the
 * proposal is deterministic and does not depend on iteration order. Returns `null` rather than
 * the least-bad option when nothing clears `WORTH_PROPOSING` — a swap that gains two points is
 * a change asked of somebody for nothing.
 */
export function proposeAlternative(
  keep: Color,
  replace: Color,
  entries: readonly PublishedEntry[] = allEntries(),
): SeparationFinding['alternative'] {
  const before = worstSeparation(keep, replace).score;
  let best: SeparationFinding['alternative'] = null;

  for (const entry of entries) {
    const candidate = colorFor(entry.entry);
    const after = worstSeparation(keep, candidate).score;
    const improvement = after - before;
    if (improvement < WORTH_PROPOSING) continue;
    if (best !== null && after <= best.separation) continue;
    best = {
      slug: entry.entry.slug,
      label: entry.entry.name.en,
      hex: entry.derived.hex,
      separation: after,
      improvement,
    };
  }
  return best;
}

/**
 * Every pair in the set that is hard to tell apart, worst first.
 *
 * Pairs, not colours: separation is a property of two things together, and reporting "this
 * colour is a problem" would be reporting the wrong noun.
 *
 * `entries` is injected so the search is testable against a fixed set.
 */
export function findSeparationProblems(
  colours: readonly CheckedColour[],
  entries: readonly PublishedEntry[] = allEntries(),
): readonly SeparationFinding[] {
  const envelope: CvdEnvelope = {
    // The corpus label is the version every proposed alternative comes from; without it the
    // improvement is a number nobody could reproduce.
    engine: CVD_MODE_VERSION,
    corpus: CORPUS_LABEL,
    severity: SEVERITY,
  };

  const findings: SeparationFinding[] = [];
  for (let i = 0; i < colours.length; i += 1)
    for (let j = i + 1; j < colours.length; j += 1) {
      const a = colours[i];
      const b = colours[j];
      if (a === undefined || b === undefined) continue;
      const { score, deficiency } = worstSeparation(a.color, b.color);
      if (score >= HARD_TO_SEPARATE) continue;
      findings.push({
        a,
        b,
        deficiency,
        separation: score,
        // `b` is the one proposed for replacement, by position. An arbitrary choice, made
        // consistently so the proposal is deterministic — the screen says which one it means.
        alternative: proposeAlternative(a.color, b.color, entries),
        envelope,
      });
    }
  // Worst first: if a person acts on one thing, it should be the one that matters most. Ties
  // break on the pair's ids so the order cannot depend on input order.
  return findings.sort(
    (x, y) =>
      x.separation - y.separation || `${x.a.id}${x.b.id}`.localeCompare(`${y.a.id}${y.b.id}`),
  );
}

/**
 * Recompute an improvement from an envelope and two colours.
 *
 * FR-35's reproducibility clause, as a function rather than as a promise. Given the same
 * envelope, the same pair and the same replacement, the number comes back identical — which is
 * what makes a stored finding explainable months later.
 */
export function reproduceImprovement(
  envelope: CvdEnvelope,
  keep: Color,
  before: Color,
  after: Color,
): number {
  if (envelope.severity !== SEVERITY)
    throw new Error(
      `cvd: this build checks separation at severity ${String(SEVERITY)} and the envelope ` +
        `records ${String(envelope.severity)}. Recomputing at a different severity would ` +
        'produce a number that is not the one that was reported.',
    );
  return worstSeparation(keep, after).score - worstSeparation(keep, before).score;
}

/** The version of this check, recorded in every envelope it produces. */
export const CVD_MODE_VERSION = '0.1.0' as const;
