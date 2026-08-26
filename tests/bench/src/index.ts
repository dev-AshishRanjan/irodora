/**
 * `@irodora/bench` — gate 12's performance budgets (NFR-4, F-038).
 *
 * **The bench itself is not here.** It lives in [`bench.mjs`](./bench.mjs), with its proof in
 * [`bench-proof.mjs`](./bench-proof.mjs), and both are plain `.mjs` on purpose: they measure the
 * BUILT `@irodora/*` packages, so they cannot be part of a build that has to finish before the
 * thing they measure exists. `pnpm bench` runs one; `pnpm bench:prove` runs the other.
 *
 * This module exists so the package has a TypeScript entry point for `tsc -p
 * tsconfig.build.json` and exports the budget shape, which is the one thing a consumer would
 * want from it — the ceilings themselves are content, in
 * [`budgets.json`](../budgets.json), never in code.
 */

/**
 * Where a budget can honestly be measured.
 *
 * `device` is NFR-4's actual claim — *"measured on the slowest device in the support matrix
 * rather than the fastest"*. A CI runner is neither, so the gate reports those as NOT RUN
 * instead of counting them passed. `node-reference` is the engine's own cost, which a runner
 * can measure, and which is not evidence about NFR-4.
 */
export type BudgetScope = 'node-reference' | 'device';

/** One committed ceiling. Absolute, never a delta against a previous run. */
export interface Budget {
  readonly id: string;
  readonly scope: BudgetScope;
  /** What is timed, in enough detail that the number can be reproduced. */
  readonly measures: string;
  /** The ceiling on the p95, in milliseconds. */
  readonly ceilingMs: number;
  /** Why this number and not another. A ceiling with no reasoning gets edited on a red run. */
  readonly rationale: string;
  /** Timed runs. `node-reference` only — a `device` budget is not run here. */
  readonly runs?: number;
  /**
   * Calls per timed run. Above 1 where a single call costs less than the timer can resolve, in
   * which case the ceiling is on the batch and `measures` says so.
   */
  readonly callsPerRun?: number;
}
