/**
 * Synthetic corpora for the equivalence suite.
 *
 * ## Why generated rather than authored
 *
 * `content/colors/` is empty — F-012 is blocked on OQ-4 and OQ-5 — so there is no real corpus to
 * brute-force. That is F-011's problem one feature on
 * [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], and here it has a better
 * answer than fixtures: **equivalence is a property of the algorithm, not of the data.** Twenty
 * thousand adversarial entries test it far harder than two hundred real ones would.
 *
 * There are no fixture *files*, either. `packages/color-naming` is inside the colour-engine
 * ESLint zone, whose override has no `ignores` for tests, so a test cannot import `node:fs` to
 * read one. Everything is built in-process from a recorded seed — which also removes the "could
 * this be mistaken for corpus content" question entirely. Ids still carry F-011's `fixture-`
 * prefix, which `checkCorpus` fails on if one ever appears under `content/`.
 *
 * ## The strata are chosen to break the bound, not to look like colours
 *
 * Each one targets a step in the derivation that could be wrong:
 *
 * | stratum | attacks |
 * |---|---|
 * | exact duplicates | the id tiebreak — without these the comparator's totality is untested |
 * | dense clusters | near-ties, where a shortlist that is one entry short still looks right |
 * | high chroma | `S_C` is largest and the bound loosest, so the search must expand furthest |
 * | blue, h ≈ 275° | where `Rt` peaks and the `√3` ceiling would show if it were wrong |
 * | L at 0 and 100 | where `S_L` peaks |
 * | uniform spread | the ordinary case, so the suite is not all corner |
 */

import type { Triple } from '@irodora/color-spaces';
import type { NamingRecord } from '../src/index.js';

/** A small deterministic PRNG. Local: seeded, portable, and no dependency on the host. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticCorpus {
  readonly name: string;
  readonly seed: number;
  readonly records: readonly NamingRecord[];
}

/**
 * Build an adversarial corpus of roughly `size` records from `seed`.
 *
 * Deterministic: the same seed always produces the same corpus, so a failure is reproducible
 * and a pass is not luck (F-071).
 */
export function syntheticCorpus(name: string, seed: number, size: number): SyntheticCorpus {
  const rand = mulberry32(seed);
  const between = (lo: number, hi: number): number => lo + rand() * (hi - lo);
  const records: NamingRecord[] = [];
  const push = (lab: Triple): void => {
    records.push({ id: `fixture-${name}-${String(records.length).padStart(6, '0')}`, lab });
  };

  const share = Math.max(1, Math.floor(size / 6));

  // 1. uniform spread — the ordinary case
  for (let i = 0; i < share; i += 1)
    push([between(0, 100), between(-100, 100), between(-100, 100)]);

  // 2. high chroma — S_C largest, bound loosest
  for (let i = 0; i < share; i += 1) {
    const angle = between(0, Math.PI * 2);
    const chroma = between(80, 128);
    push([between(20, 90), Math.cos(angle) * chroma, Math.sin(angle) * chroma]);
  }

  // 3. the blue region near h = 275, where Rt peaks
  for (let i = 0; i < share; i += 1) {
    const h = (between(265, 285) * Math.PI) / 180;
    const chroma = between(20, 110);
    push([between(10, 60), Math.cos(h) * chroma, Math.sin(h) * chroma]);
  }

  // 4. lightness extremes, where S_L peaks
  for (let i = 0; i < share; i += 1)
    push([rand() < 0.5 ? between(0, 3) : between(97, 100), between(-30, 30), between(-30, 30)]);

  // 5. dense clusters — near-ties, the case a one-short shortlist still looks right on
  const clusters = Math.max(1, Math.floor(share / 10));
  for (let c = 0; c < clusters; c += 1) {
    const centre: Triple = [between(20, 80), between(-60, 60), between(-60, 60)];
    for (let i = 0; i < 10; i += 1)
      push([
        centre[0] + between(-0.3, 0.3),
        centre[1] + between(-0.3, 0.3),
        centre[2] + between(-0.3, 0.3),
      ]);
  }

  // 6. EXACT duplicates — the tiebreak's decoy. Without these the comparator's totality is
  //    asserted and never exercised.
  const duplicateSource = records.slice(0, Math.max(3, Math.floor(share / 20)));
  for (const source of duplicateSource) push([source.lab[0], source.lab[1], source.lab[2]]);

  return { name, seed, records };
}

/** Query points, drawn from the same adversarial regions as the corpora. */
export function syntheticQueries(seed: number, count: number): readonly Triple[] {
  const rand = mulberry32(seed);
  const between = (lo: number, hi: number): number => lo + rand() * (hi - lo);
  const queries: Triple[] = [];
  for (let i = 0; i < count; i += 1) {
    const pick = i % 4;
    if (pick === 0) queries.push([between(0, 100), between(-100, 100), between(-100, 100)]);
    else if (pick === 1) {
      const angle = between(0, Math.PI * 2);
      const chroma = between(90, 128);
      queries.push([between(20, 90), Math.cos(angle) * chroma, Math.sin(angle) * chroma]);
    } else if (pick === 2) {
      const h = (between(265, 285) * Math.PI) / 180;
      queries.push([
        between(10, 60),
        Math.cos(h) * between(30, 110),
        Math.sin(h) * between(30, 110),
      ]);
    } else
      queries.push([
        rand() < 0.5 ? between(0, 2) : between(98, 100),
        between(-20, 20),
        between(-20, 20),
      ]);
  }
  return queries;
}
