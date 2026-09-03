# Plan: F-134 — A `finally` does not run when you are killed

| | |
|---|---|
| **Feature** | F-134 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` (`scripts/`) |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-03 |

---

## Intent

`verify-gate-mirror.mjs` plants `if: false # planted by verify-gate-mirror.mjs` onto a CI step,
runs gate 0, and restores the workflow in a `finally` — verified byte-for-byte, which is careful
work for the case it anticipated.

**A `finally` does not run when the process is killed**, and a timeout kills. So an interrupted
run leaves a workflow file with a **blocking gate conditioned out**, and the next `git add -A`
commits it.

The consequence is worse than a dirty tree: a CI step that never runs is exactly the failure this
script exists to detect — *gate 11 nearly shipped skipped for the whole of R1*, which is why it
was written. **It would be disabled by its own scaffolding.**

It also produced a failure recorded in F-127 as *"not reproduced, not explained"*: a leftover
plant makes gate 0 fail inside gate-mirror's child process while a direct run, after the tree has
been restored by something else, passes.

## Approach

**Two mechanisms, and the second matters more than the first.**

### 1. Restore on a signal, then re-raise

`process.on('SIGINT' | 'SIGTERM')` restores every workflow and exits with the conventional
`128 + signal`. Re-raising rather than exiting 0 matters: a caller that asked for the process to
stop should see that it stopped, not that it succeeded.

**This is necessary and not sufficient.** `SIGKILL` cannot be handled at all, a crash in the
handler itself leaves the plant, and a machine losing power leaves it too.

### 2. Refuse to start when a plant is already present

The one that actually closes the hole. Before reading anything else, the script scans the
workflows it is about to touch for its **own marker** and, finding one, **exits 1 naming the file
and the command that clears it** — rather than planting a second time on top and restoring to a
state that already contained a plant.

That last part is the real danger of the current code: the "original" it saves would include a
leftover plant, and restoring would *preserve* it while reporting a clean run.

### The marker becomes a constant

It is currently written inline in the planting code. Making it a named constant means the startup
check and the planter cannot disagree about what a plant looks like — the shape F-129's
`TOKEN_EXTENSION` needed for the same reason.

## Increments

| # | Step | Verified by |
|---|---|---|
| 1 | The marker as a constant; the startup refusal; signal handlers | `lint` |
| 2 | `scripts/verify-gate-mirror-proof.mjs` — an actually-interrupted run | `lint` |
| 3 | Correct the F-127 progress note (already done in F-133; verify it stands) | `state` |

## Files to touch

```
scripts/verify-gate-mirror.mjs        — the marker, the refusal, the handlers
scripts/verify-gate-mirror-proof.mjs  — NEW. Spawns, kills, and checks the tree
package.json                          — the proof script, and lint runs it
```

## Criterion 3 is the whole feature

> *Both are proven by a run that is actually interrupted, not by reading the handler.*

**A handler nobody has watched fire is a handler that might only be capable of being read.** The
proof therefore:

1. **Spawns** `verify-gate-mirror.mjs` as a child process.
2. **Waits until it has actually planted** — polls the workflow for the marker rather than
   sleeping, because a fixed delay is a race that passes on a fast machine and fails on a slow
   one.
3. **Sends `SIGTERM`.**
4. **Asserts the workflow is byte-identical to what it was before.**

And separately:

5. **Plants a marker by hand**, runs the script, and asserts it **refuses** and **changes
   nothing** — the case that covers `SIGKILL`, a crash, and a power cut, none of which a handler
   can reach.

**The decoy for both:** an unmutated run must still pass and still leave the tree clean, or
"it refused" is equally true of a script that refuses everything.

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| `gate:state` and the CI mirror | The script that proves every gate is mirrored gains a way to fail safely | its own proof, run in `lint` |
| `.github/workflows/*` | Nothing changes in them; the point is that nothing is *left* changed | the proof's byte-for-byte comparison |

**No new effect link.**

## Risks and open questions

- **No `OQ-*`.**
- **The proof kills a process that edits a tracked file.** If the proof itself is interrupted
  between planting its hand-made marker and restoring, it leaves one — the same defect one level
  up. Its own restore therefore uses the startup-refusal path as its safety net rather than a
  `finally` alone, and the last thing it prints is whether the tree is clean.
- **`SIGKILL` is unreachable and stays unreachable.** The startup refusal is the answer, and the
  script will say so on every run rather than implying the handler covers everything.

## Out of scope

- **Other scripts that mutate tracked files.** `verify-cache-scope.mjs` plants a test file and
  `verify-content.mjs` builds spoiled copies in memory. The first is worth the same treatment and
  is **not** taken here — if it needs it, it is filed rather than absorbed.
