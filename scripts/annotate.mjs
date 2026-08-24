/**
 * Make a script's failure visible where a reader can actually reach it.
 *
 * ## The blind spot this closes
 *
 * A GitHub Actions job's **log** needs authentication to read. Its **annotations** do not —
 * they are on the public check-run API. So for anyone diagnosing a failure without a token,
 * a script that prints to stdout has effectively said nothing.
 *
 * That cost five wrong diagnoses during F-083 and one during F-085, in two different shapes:
 *
 * - Vitest emits annotations, but **GitHub publishes at most ten failure annotations per
 *   check run** and the API returns only those ten. Absence was repeatedly read as a pass.
 *   [[a-truncated-report-reads-exactly-like-a-passing-one]]
 * - The `verify-*` scripts emit **none at all**, so a red gate reduced to *"Process completed
 *   with exit code 1"* and the reason stayed inside a log nobody could open.
 *
 * `::error::` lines are annotations, so this puts a script's own reasons on the public API.
 *
 * ## Why it is here and not in `scripts/lib/`
 *
 * It was, for one commit. `.gitignore` carries `lib/` — a build-output pattern — which also
 * matches `scripts/lib/`, so `git add -A` silently skipped it, the push carried four scripts
 * importing a file that did not exist, and gate 2 died before it could annotate why. The
 * mirror image of the keystore that the same `git add -A` swept IN two commits earlier: both
 * times the ignore list and the intent disagreed and nothing said so.
 *
 * ## Use it for the SUMMARY, not for every line
 *
 * The ten-annotation cap applies here too. A script that emits one per failing case will lose
 * the eleventh silently, which is the exact failure above. **Emit one annotation carrying the
 * whole story**, the way `identity.test.ts` collects findings and asserts once.
 */

/** Newlines and carriage returns have to be escaped or the annotation stops at the first one. */
const encode = (s) => String(s).replaceAll('%', '%25').replaceAll('\n', '%0A').replaceAll('\r', '');

/**
 * Emit one failure annotation, if this is running in CI.
 *
 * A no-op locally, where the terminal is already the reader. Nothing here changes the exit
 * status: the caller still decides that, and a script that annotated but exited 0 would be a
 * gate that fails open.
 */
export function ciError(title, detail) {
  if (!process.env['GITHUB_ACTIONS']) return;
  process.stdout.write(`::error title=${encode(title)}::${encode(detail)}\n`);
}
