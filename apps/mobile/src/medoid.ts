/**
 * The medoid of a set of corpus entries: the member whose summed CIEDE2000 to the others, over each
 * entry's published Lab, is least; ties to the earlier slug (ADR-0143 D4).
 *
 * ## One definition, two readers
 *
 * `05`'s family chips draw their dot in their group's medoid, and `09`'s Finder puts its search point
 * at the medoid of the set a query names, and at the corpus's when the field is empty (ADR-0158 D2).
 * Both read this function, so a change to the metric or the tie moves both together and is seen by
 * both surfaces' tests (E-231). A second copy of the loop would be a second answer to one question.
 *
 * ## A real colour, chosen by a stated rule
 *
 * The medoid is a member, so it is a corpus colour with its own provenance (rule 12) — not a mean,
 * which would be a colour no entry holds and whose chroma collapses as opposing hues average. ΔE00 is
 * not a metric (it can break the triangle inequality); the least sum is still well defined.
 */

import { deltaE00 } from '@irodora/color-difference';
import type { PublishedEntry } from './corpus';

/** The set's medoid. Throws on an empty set, which has none. */
export function medoid(entries: readonly PublishedEntry[]): PublishedEntry {
  const members = [...entries].sort((a, b) => a.entry.slug.localeCompare(b.entry.slug));
  const first = members[0];
  if (first === undefined) throw new Error('medoid: an empty set has none');
  let best = first;
  let bestSum = Number.POSITIVE_INFINITY;
  for (const m of members) {
    let sum = 0;
    for (const o of members) if (o !== m) sum += deltaE00(m.derived.lab, o.derived.lab);
    if (sum < bestSum) {
      best = m;
      bestSum = sum;
    }
  }
  return best;
}
