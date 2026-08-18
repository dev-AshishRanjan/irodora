/**
 * The one error the corpus raises, and why it always names a path.
 *
 * NFR-20's promise is that the build fails *on a single incomplete entry*. A promise like
 * that is only kept if the message says **which** entry and **which** field — an editor
 * looking at "validation failed" across two hundred files has been told nothing.
 *
 * So every rejection carries the source it came from and the dotted path inside it. This is
 * the same shape as `ManifestError` in `@irodora/design-tokens`, for the same reason: a gate
 * that cannot say what it rejected is barely better than one that failed open
 * [[a-gate-that-errors-is-failing-open]].
 */
export class CorpusError extends Error {
  /** The file or fixture the value came from — `ai-nezumi.json`, not an absolute path. */
  readonly source: string;
  /** Dotted path inside that source — `provenance.derivation`. */
  readonly path: string;

  constructor(source: string, path: string, detail: string) {
    super(`${source}: ${path} — ${detail}`);
    this.name = 'CorpusError';
    this.source = source;
    this.path = path;
  }
}
