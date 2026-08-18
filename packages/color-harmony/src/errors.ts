/**
 * The one error harmony generation raises.
 *
 * Same shape as `NamingError` and `CorpusError`: the operation, then what was wrong. A message
 * has to be actionable by someone who did not write this package.
 */
export class HarmonyError extends Error {
  /** The operation — `generateHarmony`, `wrapHue`. */
  readonly what: string;

  constructor(what: string, detail: string) {
    super(`${what}: ${detail}`);
    this.name = 'HarmonyError';
    this.what = what;
  }
}
