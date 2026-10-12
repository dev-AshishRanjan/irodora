# Plan: F-295 — verify-ci reports a passing step as failed when it prints more than 1 MiB

| | |
|---|---|
| **Feature** | F-295 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/verify-ci.mjs` and the root `lint` chain. No product code, no dependency. |
| **Author** | The implementing session (a small, contained harness fix; no planner subagent) |
| **Date** | 2026-10-12 |

---

## Intent

`node scripts/verify-ci.mjs --all` is how "what would CI say?" gets an answer without a push. It
reports three steps red that pass: test, a11y and contrast. Every Tier 2 run since F-240 has had to
explain them away. After this feature:

- a step that exits 0 is reported as passing, whatever it prints;
- a step the runner killed, or could not start, is reported as that and names the error, instead of
  being reported as a failed check.

## Approach

**The cause, read in the source.** Each step runs through `spawnSync(step.command, { shell: true,
encoding: 'utf8' })` with no `maxBuffer`. Node's default is 1 MiB. Uncached, the three steps print
6.7–11.8 MB (F-295's note; F-266's Tier 2 measured about 11–12 MB). `spawnSync` kills the child with
SIGTERM, sets `error` to ENOBUFS and `status` to null, and `result.status ?? 1` turns that into a
failure.

**The fix: the output goes to a file, and the exit status is judged on its own.**

1. **`runStep(step, options)`**, extracted. The child writes stdout and stderr straight to a log file
   in the OS temp directory (`stdio: ['ignore', fd, fd]`). Nothing is buffered in this process, so
   no size can kill a step. The file's tail (the last 30 lines, as today) is read only for a step
   that did not pass.
2. **Three outcomes, never two.**
   - `passed`: status 0.
   - `failed`: status non-zero.
   - `not run`: a spawn `error` (ENOENT, a timeout) or a `signal` with no status. It is reported with
     its own mark and the error's code and message, and still counts against the run, because a
     step that did not run proved nothing.
3. **A `--prove` mode**, beside the repository's other proofs, that runs synthetic steps through the
   same `runStep`:
   - a step that writes 2 MiB and exits 0 must be `passed` (watched failing first, on the runner as
     it was);
   - a step that exits 3 must be `failed`, and its tail must be shown (the decoy for (1));
   - a step that cannot start (a working directory that does not exist) must be `not run`, naming
     ENOENT;
   - a step killed by the runner (a timeout the proof sets) must be `not run`, naming ETIMEDOUT or
     its signal.
4. **The proof joins the root `lint` chain**, so `lint` (F-295's verification) holds it on every run.
   It is fast (four tiny node processes).

**Reused:** `classify`, `stepsFrom`, the dirty-tree comparison, `describeLeftovers`, and the output
format of the summary.

**Not done:** streaming the step's output live to the console. Today a step's output is shown only
when it fails, and that is kept.

## Files to touch

```
scripts/verify-ci.mjs          — runStep, three outcomes, --prove
package.json                   — the root lint chain gains `node scripts/verify-ci.mjs --prove`
.harness/state/effects.json, .harness/memory/effects/*.md (one link), feature_list.json, progress.md
```

## Anticipated effects

| id | from → to | guard |
|---|---|---|
| **E-201** (medium, new) | `scripts/verify-ci.mjs#runStep` → every Tier 2 run's evidence (ADR-0132), the `an-always-gate-nobody-runs…` lesson's recommendation | `verify-ci --prove` in `lint`: a 2 MiB step passes, an exit 3 fails and shows its tail, an unstartable step and a killed step are `not run` with their error named |

## Test plan

- **The proof is the test.** It runs on every `lint`, plants nothing in the tree, and writes only to
  the OS temp directory, so it needs no plant journal. *(Corrected after the review: verify-ci is not
  in `plant-proof`'s `NO_JOURNAL_NEEDED` list. `plant-proof` accepts it because it imports
  `plant.mjs`, for `describeLeftovers`.)*
- **Watched failing first:** with the 2 MiB case in place and the runner unchanged, the proof must
  fail on that case.
- **Then, on the real thing:** `verify-ci --all` on this tree must show test, a11y and contrast green.

## Verification

```
# Tier 1 per increment (ADR-0132): format, typecheck, the root lint, state
# Tier 2 once: the full set, and verify-ci --all (which this feature changes)
```

**Not run, and why:** no product code changes, so no gate beyond the full set runs specially.

## Attestations

None: both criteria are fully gated by the proof.

## Risks and open questions

**No `OQ-*` blocks this feature.**

1. **R1:** a shell on Windows (`shell: true`, cmd.exe) and a file descriptor for stdio. Node supports
   that on win32; the proof runs here.
2. **R2:** a step that hangs now writes to a file instead of filling a buffer. Hanging was never
   caught (no timeout), and that is unchanged.

## Out of scope

Live streaming; a per-step timeout; the restore retry of the mutation proofs (F-333).

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claim and plan. **Tier 1 run:** state (exit 0), and Prettier writing the two changed files. *(Corrected after the review: the commit said "format, state", but `format:check` did not run.)* |
| 1 | this commit | **The runner reports what each step did.**
- `runStep` extracted. The child writes stdout and stderr to a log in the OS temp directory (`stdio: ['ignore', fd, fd]`), so nothing is buffered here. A failed or not-run step's last 30 lines are read from the log's end. The temp directory is removed best effort: on Windows a killed shell's own child can hold the log a moment.
- Three outcomes: `passed`, `failed` (`exit N`) and `not run`, which is a spawn error or a signal without a status, named by its code and message. The run's report marks `not run` with `!` and its reason, apart from `✗`.
- **`--prove`** runs four synthetic steps through `runStep`: a 2 MiB writer that exits 0; an exit 3 whose tail is kept; an unstartable step (a missing working directory, ENOENT); a step the runner kills (a 500 ms timeout, ETIMEDOUT). It is in the root `lint` chain and documented in the usage block.
- **Watched failing first:** on the runner as it was, the proof failed on the 2 MiB case (`failed`) and on both not-run cases (`failed`); the exit-3 decoy passed. On the fixed runner all four pass.
- **Tier 1, each exit 0:** format, typecheck, lint (the proof included), state. |
| 2 | this commit | **Close-out.** E-201 with its note and index line. The two lessons and ADR-0132, which told a reader to discount three verify-ci reds, now say F-295 is done and what verify-ci reports. **Tier 1, each exit 0:** format, state, and `verify-claims`. *(Corrected after the review: lint was not run on this increment.)* |
| review | this commit | **The one review (evaluator): FAIL as delivered.** No blocking finding, 2 significant and 11 minor; the fix itself worked on the real run (test, a11y and contrast green). Each finding fixed or recorded:
- **S1, fixed: the proof checked the runner, not the report.** A mutant forcing every not-run line to a failure, or a main loop left on the old `spawnSync`, passed it. The run and the proof now share `runSteps` (each step's line) and `failureReport` (the tails and the count), and the proof asserts the printed text. Seven mutants each fail it: a not-run line drawn as a failure; every non-pass counted as failed; the tail read from the start; the first fragment kept; the output buffered again; the runner's own kill read as a start failure; a not-run step headed as a failure.
- **S2, fixed: not-run steps were counted and headed as failures.** The count reads `F step(s) failed, N not run`, and a not-run step's header is drawn apart, with its reason.
- **M1 and M2, corrected above:** rows 0 and 2 now name the Tier 1 that ran; the test plan's journal claim is corrected (verify-ci passes `plant-proof` through its `plant.mjs` import, not its list).
- **M3, fixed:** the two lessons no longer speak of F-295 as open, and say what changed in the past tense.
- **M4, fixed:** the temp directory is made inside the `try`, and a removal that fails prints the directory instead of passing in silence.
- **M5, fixed:** the decoy prints 80 KiB before its reason, past the tail's 64 KiB window, and the big case prints 16 MiB.
- **M6, fixed:** a tail window that starts inside the file drops its first, partial line (unless it is the only line).
- **M7, fixed:** the runner's comment and E-201's note say what each outcome cannot tell apart (a command the shell cannot find; a signal through a shell that did not `exec`; a win32 termination). `not run` now names which: `killed after N ms (ETIMEDOUT)`, `could not start in <dir>: <code>` (named by the directory, since Node's message names the shell), or `killed by <signal>`, whose branch the proof cannot reach portably, as the comment says.
- **M8, fixed:** `--prove` runs before the journal check: it plants nothing, and a journal another proof left is reported by the proofs that own it.
- **M9, fixed:** the node path is quoted for the shell (`"${process.execPath}"`), not JSON-escaped.
- **M10, recorded (rule 5):** `verify-a11y-proof.mjs` `continue`s past `journal.close()` on "cannot plant", so every run leaves an entry naming an unmodified Button.tsx, which only plant-proof's deletion (F-296) clears. Recorded on F-324 and F-296: F-296's fix must close that path too, or the run goes red from the plant journal proof on.
- **M11:** informational; no change.
- **Also recorded:** while F-296 is open, an F-333 restore failure before the plant journal proof loses its journal (F-333's and F-296's notes).

**Tier 1 on the fixes, each exit 0:** format, typecheck, lint (the proof included), state. Tier 2 on the final tree: see `progress.md`. |
