/**
 * Capsule optimisation (FR-45, F-050).
 *
 * > *Smallest subset producing the most valid outfits. Solves "≥ N outfits from ≤ M garments"
 * > for a 40-item wardrobe within NFR-4; solution is deterministic and reproducible.*
 *
 * **N and M are the question, not constants.** A person asks *"can I get 20 outfits out of 12
 * things?"* and the answer is a specific set of garments, or an honest no.
 *
 * ## This file does no colour maths at all
 *
 * [`coverage()`](./coverage.ts) has already decided which outfits are valid, against
 * `COVERAGE_THRESHOLD`, and hands over `Coverage.combinations` — every valid outfit as a set of
 * garment ids. So the problem here is purely combinatorial:
 *
 * > Given a set of combinations over the wardrobe, find the smallest **S** with
 * > `|{c ∈ combinations : c ⊆ S}| ≥ N`, subject to `|S| ≤ M`.
 *
 * That is maximum-coverage-shaped and **NP-hard**, which is why the acceptance criterion names
 * branch-and-bound rather than leaving the choice open.
 *
 * ## Two limits, because the criteria contradict each other
 *
 * The criteria ask for *"a hard time budget"* **and** for the result to be *"deterministic and
 * reproducible"*. A wall clock cannot give you both: a faster machine explores more in 3 s and
 * returns a better subset, so the same wardrobe answers differently on a phone than on a
 * workstation.
 *
 * | limit | kind | role |
 * |---|---|---|
 * | `nodeBudget` | a deterministic count of search nodes | **primary** — same input, same nodes, same answer, anywhere |
 * | `deadlineMs` | wall clock | **backstop** — NFR-4's 3 s, and it should never be what stops us |
 *
 * `stoppedBy` says which one fired, and `reproducible` is exactly `stoppedBy !== 'deadline'`.
 * When the clock does fire the caller is **told**, rather than handed a machine-dependent
 * answer that claims to be reproducible.
 *
 * The clock is read **only** to test the backstop. It never influences which branch is taken,
 * which is what keeps the deterministic path deterministic.
 */

import type { Coverage } from './coverage.js';

/**
 * How many search nodes a solve may explore before returning best-so-far.
 *
 * **This is the limit that normally binds**, and it is a count rather than a duration precisely
 * so that two machines agree. Sized so the wall-clock backstop stays a safety net at the 40-item
 * size FR-45 names.
 */
export const CAPSULE_NODE_BUDGET = 200_000;

/** NFR-4's capsule ceiling, verbatim. The backstop, not the working limit. */
export const CAPSULE_DEADLINE_MS = 3_000;

/**
 * Why the search stopped.
 *
 * - `proved` — the tree was exhausted. The answer is optimal.
 * - `nodes` — the deterministic budget ran out. Best-so-far, and still reproducible.
 * - `deadline` — the wall clock ran out. Best-so-far, and **not** reproducible.
 */
export type CapsuleStop = 'proved' | 'nodes' | 'deadline';

export interface CapsuleRequest {
  /** N — how many valid outfits the capsule must produce. */
  readonly targetOutfits: number;
  /** M — the most garments it may use. */
  readonly maxGarments: number;
  readonly nodeBudget?: number;
  readonly deadlineMs?: number;
  /**
   * The clock, injectable so a test can drive the backstop without waiting for it.
   *
   * The same shape as `uuidv7(now = Date.now())` in `@irodora/store`, and for the same reason:
   * the impure thing is a default argument rather than a hidden dependency.
   */
  readonly now?: () => number;
}

export interface Capsule {
  /** The chosen garments, sorted by id so the result is comparable and stable. */
  readonly garments: readonly string[];
  /** How many valid outfits these garments produce. Recomputed, never accumulated. */
  readonly outfits: number;
  /** Whether `outfits >= targetOutfits`. A capsule that misses says so. */
  readonly meetsTarget: boolean;
  readonly stoppedBy: CapsuleStop;
  /** `stoppedBy !== 'deadline'`. The one claim the wall clock can invalidate. */
  readonly reproducible: boolean;
  readonly nodesExplored: number;
}

/** The search's mutable state, kept in one object so backtracking is obviously symmetrical. */
interface Search {
  readonly size: readonly number[];
  readonly byGarment: readonly (readonly number[])[];
  readonly present: Int32Array;
  readonly missing: Int32Array;
  readonly inSet: Uint8Array;
  covered: number;
  possible: number;
  nodes: number;
  stopped: CapsuleStop | null;
  readonly budget: number;
  readonly deadline: number;
  readonly now: () => number;
}

/*
 * `noUncheckedIndexedAccess` makes every typed-array read `number | undefined`, so each of these
 * reads into a local first. Worth the four extra lines: the four functions below must be exact
 * mirrors of each other, and a compound assignment hides which half is the read.
 */

const include = (s: Search, g: number): void => {
  s.inSet[g] = 1;
  for (const c of s.byGarment[g] ?? []) {
    const next = (s.present[c] ?? 0) + 1;
    s.present[c] = next;
    if (next === s.size[c]) s.covered += 1;
  }
};

const unInclude = (s: Search, g: number): void => {
  s.inSet[g] = 0;
  for (const c of s.byGarment[g] ?? []) {
    const current = s.present[c] ?? 0;
    if (current === s.size[c]) s.covered -= 1;
    s.present[c] = current - 1;
  }
};

/** Excluding a garment removes every combination that needed it from what is still reachable. */
const exclude = (s: Search, g: number): void => {
  for (const c of s.byGarment[g] ?? []) {
    const current = s.missing[c] ?? 0;
    if (current === 0) s.possible -= 1;
    s.missing[c] = current + 1;
  }
};

const unExclude = (s: Search, g: number): void => {
  for (const c of s.byGarment[g] ?? []) {
    const next = (s.missing[c] ?? 0) - 1;
    s.missing[c] = next;
    if (next === 0) s.possible += 1;
  }
};

/**
 * Charge one node, and report whether the search may continue.
 *
 * The node count is checked first and the clock second, so that a solve which would stop on
 * either stops on the **deterministic** one and stays reproducible.
 */
const spend = (s: Search): boolean => {
  if (s.stopped !== null) return false;
  s.nodes += 1;
  if (s.nodes > s.budget) {
    s.stopped = 'nodes';
    return false;
  }
  if (s.now() > s.deadline) {
    s.stopped = 'deadline';
    return false;
  }
  return true;
};

export function solveCapsule(coverage: Coverage, request: CapsuleRequest): Capsule {
  const { targetOutfits, maxGarments } = request;
  const budget = request.nodeBudget ?? CAPSULE_NODE_BUDGET;
  const now = request.now ?? ((): number => Date.now());
  const deadline = now() + (request.deadlineMs ?? CAPSULE_DEADLINE_MS);

  // Combinations arrive as sorted, joined garment ids — the key `coverage()` builds.
  const combos = [...coverage.combinations].map((c) => c.split('|'));

  /*
   * ONLY GARMENTS THAT APPEAR IN A VALID OUTFIT CAN MATTER. A garment in no combination cannot
   * add one, so including it could only grow a set that is supposed to be the SMALLEST. Sorted,
   * which fixes the index space before anything else reads it.
   */
  const ids = [...new Set(combos.flat())].sort();
  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const members = combos.map((c) => c.map((id) => indexOf.get(id) ?? -1));

  const byGarment: number[][] = ids.map(() => []);
  members.forEach((m, c) => {
    m.forEach((g) => {
      byGarment[g]?.push(c);
    });
  });

  const outfitsIn = (chosen: ReadonlySet<number>): number =>
    members.filter((m) => m.every((g) => chosen.has(g))).length;

  const empty = (stoppedBy: CapsuleStop, nodes: number): Capsule => ({
    garments: [],
    outfits: 0,
    meetsTarget: targetOutfits <= 0,
    stoppedBy,
    reproducible: stoppedBy !== 'deadline',
    nodesExplored: nodes,
  });

  if (maxGarments <= 0 || ids.length === 0) return empty('proved', 0);

  const s: Search = {
    size: members.map((m) => m.length),
    byGarment,
    present: new Int32Array(members.length),
    missing: new Int32Array(members.length),
    inSet: new Uint8Array(ids.length),
    covered: 0,
    possible: members.length,
    nodes: 0,
    stopped: null,
    budget,
    deadline,
    now,
  };

  /*
   * THE HEURISTIC SEED (criterion 2). Repeatedly take the garment completing the most
   * not-yet-covered combinations. This is what gives the bound something to prune against —
   * without an incumbent, branch-and-bound is exhaustive search with extra steps.
   *
   * It is a SEED and not the answer: greedy max-coverage is provably suboptimal in the worst
   * case, and a test constructs an instance where the search beats it. Ties break on index,
   * which is id order, so the seed is deterministic too.
   */
  const seed = new Set<number>();
  while (seed.size < maxGarments) {
    let best = -1;
    let bestGain = -1;
    let bestPotential = -1;

    for (let g = 0; g < ids.length; g += 1) {
      if (seed.has(g)) continue;

      let gain = 0;
      let potential = 0;
      for (const c of byGarment[g] ?? []) {
        const m = members[c];
        if (m === undefined) continue;
        // Adding `g` completes this combination outright.
        if (m.every((x) => x === g || seed.has(x))) gain += 1;
        // Or it is a combination `g` is part of that is not covered yet.
        if (!m.every((x) => seed.has(x))) potential += 1;
      }

      if (gain > bestGain || (gain === bestGain && potential > bestPotential)) {
        bestGain = gain;
        bestPotential = potential;
        best = g;
      }
    }

    /*
     * POTENTIAL IS WHAT MAKES THE SEED START AT ALL, and leaving it out is a silent no-op.
     * An outfit is three garments, so the FIRST garment added completes nothing — every
     * candidate scores a gain of zero, and a greedy that ranked on gain alone would find no
     * improvement on its very first step and return an empty seed for every wardrobe there is.
     * That is not a hypothetical: it is what this loop did until a mutation test showed the
     * search doing all the work and the "heuristic seed" of criterion 2 contributing nothing.
     */
    if (best === -1 || bestPotential === 0) break;
    seed.add(best);
    if (outfitsIn(seed) >= targetOutfits) break;
  }

  const seedOutfits = outfitsIn(seed);

  // Sorted ids, then the joined form, so equally good answers resolve one way and only one way.
  const asIds = (set: Iterable<number>): string[] =>
    [...set].map((g) => ids[g] ?? '').sort((a, b) => a.localeCompare(b));
  const lexBefore = (a: readonly string[], b: readonly string[]): boolean =>
    a.join('|').localeCompare(b.join('|')) < 0;

  const chosen: number[] = [];
  let bestSet: string[] | null = seedOutfits >= targetOutfits ? asIds(seed) : null;
  let bestSize = bestSet ? bestSet.length : Number.POSITIVE_INFINITY;

  /*
   * SEARCH 1 — the smallest set reaching the target.
   *
   * Both prune rules are safe in the obvious way, which matters more than their strength: a
   * bound that prunes too hard makes the solver FASTER AND QUIETLY WRONG, and only the
   * brute-force comparison in the test file can see that.
   *
   *   · `possible < targetOutfits` — the combinations still reachable cannot reach N at all.
   *   · `chosen.length + 1 >= bestSize` — every completion from here is at least as big as the
   *     incumbent, and we are looking for strictly smaller.
   */
  const minimise = (i: number): void => {
    if (!spend(s)) return;

    if (s.covered >= targetOutfits) {
      const candidate = asIds(chosen);
      if (
        candidate.length < bestSize ||
        (candidate.length === bestSize && bestSet !== null && lexBefore(candidate, bestSet))
      ) {
        bestSet = candidate;
        bestSize = candidate.length;
      }
      return; // Adding more garments can only make the set larger.
    }
    if (s.possible < targetOutfits) return;
    if (chosen.length + 1 > maxGarments) return;
    if (chosen.length + 1 >= bestSize) return;
    if (i >= ids.length) return;

    chosen.push(i);
    include(s, i);
    minimise(i + 1);
    unInclude(s, i);
    chosen.pop();

    exclude(s, i);
    minimise(i + 1);
    unExclude(s, i);
  };

  minimise(0);

  /*
   * SEARCH 2 — only when the target is out of reach. Then the honest answer is the best capsule
   * available under M, reported with `meetsTarget: false` rather than dressed up as a success.
   */
  let fallback: string[] = asIds(seed);
  let fallbackOutfits = seedOutfits;

  const maximise = (i: number): void => {
    if (!spend(s)) return;

    if (
      s.covered > fallbackOutfits ||
      (s.covered === fallbackOutfits && chosen.length < fallback.length)
    ) {
      fallback = asIds(chosen);
      fallbackOutfits = s.covered;
    }
    // Safe and deliberately weak: an equal bound may still hide a SMALLER set of equal value.
    if (s.possible < fallbackOutfits) return;
    if (chosen.length >= maxGarments) return;
    if (i >= ids.length) return;

    chosen.push(i);
    include(s, i);
    maximise(i + 1);
    unInclude(s, i);
    chosen.pop();

    exclude(s, i);
    maximise(i + 1);
    unExclude(s, i);
  };

  if (bestSet === null) maximise(0);

  const garments = bestSet ?? fallback;
  const stoppedBy = s.stopped ?? 'proved';

  /*
   * THE COUNT IS RECOMPUTED FROM THE RETURNED SET, never taken from the search's accumulator.
   * The accumulator is the number most likely to drift after a backtracking bug, and it would
   * drift into a confident overstatement of how many outfits somebody owns.
   */
  const chosenIndices = new Set(garments.map((id) => indexOf.get(id) ?? -1));
  const outfits = outfitsIn(chosenIndices);

  return {
    garments,
    outfits,
    meetsTarget: outfits >= targetOutfits,
    stoppedBy,
    reproducible: stoppedBy !== 'deadline',
    nodesExplored: s.nodes,
  };
}
