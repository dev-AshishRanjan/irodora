/**
 * The one error naming raises.
 *
 * Every message has to survive being read by someone who did not write this package, so each
 * names the thing that was wrong and — where the rule is not obvious — why the rule exists.
 * "Invalid input" would be true and useless.
 */
export class NamingError extends Error {
  /** What was being done — `buildNamingIndex`, `nameColor`. */
  readonly what: string;

  constructor(what: string, detail: string) {
    super(`${what}: ${detail}`);
    this.name = 'NamingError';
    this.what = what;
  }
}
