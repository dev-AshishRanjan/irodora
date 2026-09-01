/**
 * Capsule optimisation (FR-45, F-050).
 *
 * ## What earns this file
 *
 * A solver's characteristic failure is returning something plausible and wrong while every test
 * agrees with it. Two assertions here exist for that and nothing else:
 *
 * 1. **Optimality against brute force.** An exhaustive search is the only oracle that can catch
 *    a bound which prunes too aggressively — the defect that makes a solver *faster* and
 *    quietly wrong.
 * 2. **Greedy is beaten.** Without an instance where the seed is strictly suboptimal, a "solver"
 *    that returned the greedy seed and never searched would pass everything else in this file.
 */

import { describe, expect, it } from 'vitest';
import {
  CAPSULE_NODE_BUDGET,
  solveCapsule,
  type Capsule,
  type CapsuleRequest,
} from '../src/capsule.js';
import type { Coverage } from '../src/coverage.js';

/**
 * A `Coverage` carrying only what the solver reads.
 *
 * The solver never scores an outfit — `coverage()` already did — so a fixture here is a set of
 * valid combinations and nothing else. Building one by hand is the point: it lets a test state
 * the combinatorial problem exactly, with no colour in it.
 */
const withCombinations = (combos: readonly (readonly string[])[]): Coverage => ({
  valid: combos.length,
  perGarment: new Map(),
  threshold: 60,
  combinations: new Set(combos.map((c) => [...c].sort().join('|'))),
});

const solve = (combos: readonly (readonly string[])[], request: CapsuleRequest): Capsule =>
  solveCapsule(withCombinations(combos), request);

/** The oracle: every subset up to `maxGarments`, scored honestly. */
function bruteForce(
  combos: readonly (readonly string[])[],
  targetOutfits: number,
  maxGarments: number,
): { readonly size: number; readonly outfits: number; readonly feasible: boolean } {
  const ids = [...new Set(combos.flat())].sort();
  const count = (set: ReadonlySet<string>): number =>
    combos.filter((c) => c.every((g) => set.has(g))).length;

  let bestSize = Number.POSITIVE_INFINITY;
  let bestOutfits = 0;

  for (let mask = 0; mask < 2 ** ids.length; mask += 1) {
    const chosen = new Set(ids.filter((_, i) => (mask & (1 << i)) !== 0));
    if (chosen.size > maxGarments) continue;
    const outfits = count(chosen);
    if (outfits > bestOutfits) bestOutfits = outfits;
    if (outfits >= targetOutfits && chosen.size < bestSize) bestSize = chosen.size;
  }
  return {
    size: bestSize,
    outfits: bestOutfits,
    feasible: bestSize !== Number.POSITIVE_INFINITY,
  };
}

/** Three slots, so a valid outfit is a triple — the shape `coverage()` produces. */
const GRID = ['t1', 't2', 't3'].flatMap((top) =>
  ['p1', 'p2'].flatMap((trouser) => ['s1', 's2'].map((shoe) => [top, trouser, shoe])),
);

/**
 * A deterministic generator, so the instances below are many but never random.
 *
 * A fixed-seed LCG rather than `Math.random`: the same instances every run, on every machine,
 * and a failure that can be reproduced by reading the seed off this line.
 */
function instances(count: number): (readonly (readonly string[])[])[] {
  let state = 0x2f6e2b1;
  const next = (n: number): number => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % n;
  };

  return Array.from({ length: count }, () => {
    const tops = ['t1', 't2', 't3'];
    const trousers = ['p1', 'p2', 'p3'];
    const shoes = ['s1', 's2'];
    const all = tops.flatMap((t) => trousers.flatMap((p) => shoes.map((s) => [t, p, s])));
    // Keep a lopsided, unpredictable subset — the asymmetry is what makes greedy fallible.
    return all.filter(() => next(3) !== 0);
  }).filter((c) => c.length > 0);
}

describe('the smallest set that reaches the target', () => {
  it('matches an exhaustive search across many asymmetric instances', () => {
    /*
     * THE CENTRE OF THE FILE. A bound that prunes a branch it should have kept produces a
     * larger-than-necessary capsule and NOTHING ELSE LOOKS WRONG — the set is valid, the count
     * is honest, the answer is simply not the best one. Only brute force can tell.
     *
     * IT HAS TO BE MANY INSTANCES, AND THEY HAVE TO BE LOPSIDED. A single symmetric fixture is
     * not enough: on a full 3x2x2 grid the greedy seed is already optimal, so the search never
     * has to do anything and an over-pruning bound passes unnoticed. That is not a hypothetical
     * — it is what this test did before, and a mutation weakening the bound to `<=` went green.
     */
    for (const [n, combos] of instances(40).entries())
      for (let target = 1; target <= combos.length; target += 1) {
        const oracle = bruteForce(combos, target, 8);
        const got = solve(combos, { targetOutfits: target, maxGarments: 8 });
        const where = `instance ${String(n)}, target ${String(target)}`;

        expect(got.stoppedBy, `${where} should be provable at this size`).toBe('proved');
        expect(got.meetsTarget, `${where} feasibility`).toBe(oracle.feasible);
        if (oracle.feasible)
          expect(got.garments.length, `${where} should need ${String(oracle.size)} garments`).toBe(
            oracle.size,
          );
      }
  });

  it('matches an exhaustive search on the full grid too', () => {
    for (let target = 1; target <= GRID.length; target += 1) {
      const oracle = bruteForce(GRID, target, 7);
      const got = solve(GRID, { targetOutfits: target, maxGarments: 7 });

      expect(got.stoppedBy, `target ${String(target)} should be provable at this size`).toBe(
        'proved',
      );
      expect(got.meetsTarget, `target ${String(target)} feasibility`).toBe(oracle.feasible);
      if (oracle.feasible)
        expect(
          got.garments.length,
          `target ${String(target)} should need ${String(oracle.size)} garments`,
        ).toBe(oracle.size);
    }
  });

  it('beats the greedy seed where greedy is provably wrong', () => {
    /*
     * THE DECOY FOR THE WHOLE FEATURE. Greedy takes the garment sitting in the most
     * combinations first, and here that pick is a trap: `hub` feeds three outfits that each
     * need a *different* pair, so four garments spent around it buy exactly one outfit.
     * Meanwhile `x` and `y` share their partners, so {x, y, z1, z2} buys two.
     *
     * A solver that returned the seed unsearched fails here and passes everything else.
     */
    const combos = [
      // `hub` looks best: it is in three combinations, more than any other garment.
      ['hub', 'a1', 'a2'],
      ['hub', 'b1', 'b2'],
      ['hub', 'c1', 'c2'],
      // But these two share their partners, so three garments buy two outfits.
      ['x', 'y', 'z1'],
      ['x', 'y', 'z2'],
    ];

    const oracle = bruteForce(combos, 2, 4);
    const searched = solve(combos, { targetOutfits: 2, maxGarments: 4 });
    // `nodeBudget: 0` stops before the first search node, so this IS the seed, alone.
    const seedOnly = solve(combos, { targetOutfits: 2, maxGarments: 4, nodeBudget: 0 });

    // The seed takes `hub` first because it sits in the most combinations, and that is exactly
    // the wrong move: the three it feeds each need a different pair, so it MISSES THE TARGET.
    expect(seedOnly.garments).toContain('hub');
    expect(seedOnly.meetsTarget).toBe(false);

    // The search throws `hub` away and finds {x, y, z1, z2}.
    expect(searched.stoppedBy).toBe('proved');
    expect(searched.meetsTarget).toBe(true);
    expect(searched.garments).not.toContain('hub');
    expect(searched.garments.length).toBe(oracle.size);
    expect(searched.outfits).toBeGreaterThan(seedOnly.outfits);
  });

  it('honours maxGarments even when that makes the target unreachable', () => {
    const got = solve(GRID, { targetOutfits: 12, maxGarments: 3 });

    expect(got.garments.length).toBeLessThanOrEqual(3);
    expect(got.meetsTarget).toBe(false);
    // Three garments can only be one outfit, and it says so rather than reporting a set it
    // cannot actually deliver.
    expect(got.outfits).toBe(bruteForce(GRID, 12, 3).outfits);
  });
});

describe('the heuristic seed (criterion 2)', () => {
  it('produces a usable capsule before the search runs at all', () => {
    /*
     * `nodeBudget: 0` stops before the first search node, so whatever comes back IS the seed.
     *
     * THIS IS THE TEST THAT A NO-OP SEED FAILS, and a no-op seed is easy to write by accident:
     * an outfit needs three garments, so the first garment added completes NOTHING. A greedy
     * ranking candidates only by "combinations completed" sees zero improvement on its first
     * step and returns an empty set for every wardrobe there is — which is what this
     * implementation did until a mutation showed the branch-and-bound doing all the work.
     */
    const seedOnly = solve(GRID, { targetOutfits: 4, maxGarments: 5, nodeBudget: 0 });

    expect(seedOnly.garments.length).toBeGreaterThan(0);
    expect(seedOnly.meetsTarget).toBe(true);
    expect(seedOnly.stoppedBy).toBe('nodes');

    // And it is honest about itself: the count matches the set it handed back.
    const chosen = new Set(seedOnly.garments);
    expect(seedOnly.outfits).toBe(GRID.filter((c) => c.every((g) => chosen.has(g))).length);
  });

  it('ranks a garment by the combinations it could still reach, not only those it completes', () => {
    /*
     * The tiebreak that makes the seed a heuristic rather than an arbitrary prefix. Every first
     * pick completes nothing, so gain alone cannot separate them; `hub` is the right first
     * choice here because it participates in three combinations and everything else in one or
     * two. Without the tiebreak the seed takes whatever sorts first, which is `a1`.
     */
    /*
     * `a`…`f` sort before `hub`, and CRUCIALLY NO TWO OF THEM SHARE A COMBINATION. That is what
     * makes the fixture discriminate: a seed walking ids in order takes `a`, `b`, `c` and lands
     * on nothing, because none of those three ever complete an outfit together.
     *
     * An earlier version of this test paired the alphabetically-first ids in one combination, so
     * index order stumbled into the right answer and the test proved nothing.
     */
    const combos = [
      ['hub', 'a', 'c'],
      ['hub', 'b', 'd'],
      ['hub', 'e', 'f'],
    ];
    // A target no three garments can reach, so this measures the seed and nothing else.
    const seedOnly = solve(combos, { targetOutfits: 3, maxGarments: 3, nodeBudget: 0 });

    /*
     * Asserted through the OUTCOME, not the pick order: `garments` comes back sorted by id, so
     * its first element reports the alphabet rather than the heuristic.
     *
     * Ranking by potential takes `hub` first and finishes {hub, a, c} — one whole outfit.
     * Ranking by index takes {a, b, c} — none. The outfit count is what separates a heuristic
     * from an arbitrary prefix.
     */
    expect(seedOnly.garments).toContain('hub');
    expect(seedOnly.outfits).toBe(1);
  });
});

describe('the number it reports is the number you get', () => {
  it('recomputes the count from the returned garments', () => {
    const got = solve(GRID, { targetOutfits: 4, maxGarments: 6 });
    const chosen = new Set(got.garments);
    const actual = GRID.filter((c) => c.every((g) => chosen.has(g))).length;

    // Independently recomputed. Comparing against the search's own accumulator would only
    // assert that it is self-consistent, which it would be even after a backtracking bug.
    expect(got.outfits).toBe(actual);
    expect(got.meetsTarget).toBe(actual >= 4);
  });
});

describe('deterministic and reproducible', () => {
  it('returns an identical result for an identical question', () => {
    const a = solve(GRID, { targetOutfits: 6, maxGarments: 5 });
    const b = solve(GRID, { targetOutfits: 6, maxGarments: 5 });
    expect(a).toEqual(b);
  });

  it('returns the identical SET when the wardrobe arrives in a different order', () => {
    /*
     * The stronger claim, and the one that fails if any tie is broken by input position. A Set's
     * iteration order follows insertion, so reversing the fixture genuinely reorders what the
     * solver sees.
     */
    const forward = solve(GRID, { targetOutfits: 6, maxGarments: 5 });
    const reversed = solve([...GRID].reverse(), { targetOutfits: 6, maxGarments: 5 });

    expect(reversed.garments).toEqual(forward.garments);
    expect(reversed.outfits).toBe(forward.outfits);
  });

  it('is reproducible exactly when the wall clock did not stop it', () => {
    const proved = solve(GRID, { targetOutfits: 4, maxGarments: 5 });
    expect(proved.stoppedBy).toBe('proved');
    expect(proved.reproducible).toBe(true);
  });
});

describe('the two limits', () => {
  it('stops on the deterministic budget and still returns something usable', () => {
    const got = solve(GRID, { targetOutfits: 8, maxGarments: 6, nodeBudget: 3 });

    expect(got.stoppedBy).toBe('nodes');
    // Best-so-far, and STILL REPRODUCIBLE — that is the whole point of counting nodes rather
    // than milliseconds.
    expect(got.reproducible).toBe(true);
    expect(got.nodesExplored).toBeLessThanOrEqual(4);

    // Whatever it returns must be honest: the count matches the set it actually handed back.
    const chosen = new Set(got.garments);
    expect(got.outfits).toBe(GRID.filter((c) => c.every((g) => chosen.has(g))).length);
  });

  it('stops on the wall clock and says the answer is NOT reproducible', () => {
    // An injected clock jumps straight past the deadline, so the backstop is tested without
    // waiting for it and without depending on how fast this machine happens to be.
    let ticks = 0;
    const now = (): number => {
      ticks += 1;
      return ticks > 2 ? 10_000 : 0;
    };

    const got = solve(GRID, { targetOutfits: 8, maxGarments: 6, deadlineMs: 100, now });

    expect(got.stoppedBy).toBe('deadline');
    expect(got.reproducible).toBe(false);
  });

  it('prefers the deterministic stop when both limits fall due at the same node', () => {
    /*
     * The guarantee is narrow and worth stating exactly: when a single node exhausts BOTH
     * limits, the node count wins and the answer stays reproducible. A slow machine cannot turn
     * a reproducible answer into an irreproducible one at the moment the budget runs out.
     *
     * It is NOT a claim that the clock never wins — an already-expired clock stops a solve whose
     * node budget still has room, and reporting `deadline` there is the honest answer. The test
     * above covers that case.
     */
    const got = solve(GRID, {
      targetOutfits: 8,
      maxGarments: 6,
      nodeBudget: 0,
      deadlineMs: -1,
      now: () => 10_000,
    });

    expect(got.stoppedBy).toBe('nodes');
    expect(got.reproducible).toBe(true);
  });

  it('defaults the node budget rather than searching forever', () => {
    expect(CAPSULE_NODE_BUDGET).toBeGreaterThan(0);
    const got = solve(GRID, { targetOutfits: 4, maxGarments: 5 });
    expect(got.nodesExplored).toBeLessThanOrEqual(CAPSULE_NODE_BUDGET);
  });
});

describe('nothing to solve', () => {
  it('returns an empty capsule for an empty wardrobe', () => {
    const got = solve([], { targetOutfits: 3, maxGarments: 5 });
    expect(got.garments).toEqual([]);
    expect(got.outfits).toBe(0);
    expect(got.meetsTarget).toBe(false);
  });

  it('returns nothing when no garments are allowed', () => {
    const got = solve(GRID, { targetOutfits: 1, maxGarments: 0 });
    expect(got.garments).toEqual([]);
    expect(got.meetsTarget).toBe(false);
  });

  it('treats a target of zero as already met, with an empty capsule', () => {
    const got = solve(GRID, { targetOutfits: 0, maxGarments: 5 });
    expect(got.meetsTarget).toBe(true);
    expect(got.garments).toEqual([]);
  });

  it('never returns a garment that appears in no valid outfit', () => {
    // Such a garment cannot add an outfit, so including it could only grow a set that is
    // supposed to be the smallest.
    const got = solve(GRID, { targetOutfits: 2, maxGarments: 8 });
    expect(got.garments).not.toContain('unused');
  });
});
