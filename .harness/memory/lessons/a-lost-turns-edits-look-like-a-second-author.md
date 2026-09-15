# A lost turn's edits look like a second author — diff against HEAD before believing either

**Date:** 2026-09-14 · **Found in:** F-219

A session was interrupted mid-feature, twice (a "continue" with no recollection of the last tool
results). Resuming, two files had changed in ways I had not seen myself make:

- `packages/testing/fixtures/claims/variants.md` had lost a line;
- `scripts/verify-claims-proof.mjs` held a **second** implementation of the check I was about to add
  — the same fixtures loaded under different names, the same cases under a different field, and a
  line-by-line check that no longer parsed.

The obvious reading was a concurrent author — another session, another agent — and the right
response to *that* would have been to stop and coordinate. **`ListAgents` showed no live session on
the machine.** The duplicate had a signature: `[.]` for `\.`, `[0-9]` for `\d`,
`String.fromCharCode(10)` for `'\n'` — exactly the workaround for the heredoc escape trap this
session had just hit. It was my own work from a turn whose results never reached my context, and
its broken `.split('` was that same trap, one more time.

**The rule.** When a file differs from what you believe you wrote:

1. **Check for a live second author first** (`ListAgents`, recent commits). If there is one, stop
   and coordinate — two writers who do not know about each other overwrite each other.
2. If there is none, **diff the file against `HEAD`**, not against memory, and decide from the diff.
   Remove duplicates by markers that occur exactly once.
3. **Choose the end marker for a cut from the diff, never from the file's layout.** The first cut
   here ended at the next top-level statement and took two untouched functions with it (`runLint`,
   `proveCoverage`); ESLint caught it, and they were restored verbatim from `HEAD`.
4. **Prove nothing else was lost**: after the repair, every line removed relative to `HEAD` must be
   one you meant to remove. Here it was exactly one.

Links: [[a-heredoc-can-turn-an-escape-into-an-invisible-control-character]]
