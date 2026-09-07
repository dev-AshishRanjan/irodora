# Plan: F-173 — A mutation proof cannot leave a plant behind

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-173 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | NFR-25                                                    |
| **Service / package** | `scripts` · `tests/bench`                                 |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-07                                                |

> Written after the first increment had already started, which is golden rule 3 broken and gate 0
> catching it — for the second time in eight features. Recorded here rather than tidied away.

## Intent

Seven incidents this month, by three mechanisms:

| how the run ended | what the `finally` did |
| --- | --- |
| a timeout, a Ctrl+C, a closed terminal | never ran |
| Windows `EPERM` on `rmSync` | ran, and threw inside itself |
| Windows `UNKNOWN` on `writeFileSync` | ran, and the restoring write failed |

The damage: a CI workflow with a gate step disabled by `if: false`, a performance budget of
`0.0001`, four deleted corpus fixtures, a benchmark whose `percentile` returned constants, and a
design manifest with a colour value quietly changed. **Every one is something `git add -A` would
have committed.**

## Why the guard added after the fourth incident has not helped

`verify-ci.mjs` compares `git status` before and after and warns when a file a proof plants into
is modified. It has now failed on three consecutive incidents, for one reason:

**It cannot tell a leak from ordinary work.** Each of those runs was a feature that had
legitimately edited a file in the same session, so the warning was correct, expected, and
dismissed — by me, twice, in writing.

A guard whose signal is indistinguishable from ordinary work trains people to ignore it, which is
worse than not having one. That is the actual defect, and it is not fixable by making the
heuristic cleverer: git can only say whether *anybody* changed a file, and the question is whether
*this run* did.

## Approach

### 1. A write-ahead journal, because the answer is intent rather than state

`scripts/plant.mjs`. Before a proof mutates a file it writes the original bytes to
`.harness/state/.plant-journal.json`; after it restores, it removes the entry.

- A journal with entries means a proof did not finish — whatever git thinks, and whatever else
  the author edited. **No false positives are possible**, because the journal only ever contains
  what a proof deliberately put there.
- The entry holds the bytes, so recovery needs neither git nor a clean tree.

**The ordering is the safety property.** Journal first, mutate second: a failure to journal means
no mutation happens at all, so there is no window in which a file is broken and unrecorded.

### 2. It refuses rather than repairing

A leftover journal makes the next proof **exit** with the recovery command. Automatic restore
would overwrite whatever is in the file now, and somebody who has already fixed the damage by
hand should not have it reverted by a tool being helpful.

The check runs when a journal is opened — so it covers a proof run directly, not only one run
under `verify:ci`. That matters: most of these are run one at a time during a feature.

### 3. Every proof that plants into a tracked file

An untracked plant is scratch. A tracked one is a commit waiting to happen, and that is the list
to migrate. Each migration is two lines — `record` before the mutation, `close` after the restore
— but each is verified by running the proof, because a proof that stops discriminating is worse
than the leak.

### 4. Proven by a run that is actually killed

**Every mutation proof in this repository is verified by letting it finish**, which is the one
path where `finally` works. So the proof of this one has to end the way the incidents did: spawn a
child that plants and then blocks, `SIGKILL` it, and assert three things —

1. the file really is still mutated, so the kill genuinely skipped the cleanup;
2. the journal names it;
3. recovery puts it back byte for byte.

And the decoy in the other direction: a child allowed to finish leaves no journal.

## Files to touch

```
scripts/plant.mjs                   — new: the journal and its CLI
scripts/plant-proof.mjs             — new: the killed-run proof
scripts/verify-gate-mirror.mjs      — and every other proof that plants into a tracked file
scripts/verify-ci.mjs               — the stray-plant guard reads the journal
.gitignore                          — the journal is never committed
.github/workflows/ci.yml            — the new proof as a step
.harness/verification/gates.json    — if the mirror requires it
```

## Anticipated effects

- **Every migrated proof gains a startup refusal** ⇒ a run with a leftover journal now exits
  instead of proceeding. That is the point, and it will be inconvenient exactly once per incident.
- **A new CI step** ⇒ the gate ↔ CI mirror, which checks that every gate in `gates.json` has a
  step and every step a gate.
- **The journal file** ⇒ `.gitignore`, and `verify-state.mjs` reads `.harness/state/` — the name
  is dot-prefixed so it is machinery rather than state.

## Test plan

- **The killed run, both directions**: killed leaves a journal and a mutated file, recovery
  restores it byte for byte; a completed run leaves neither.
- **The refusal**: opening a journal with entries exits non-zero and names the files.
- **Recovery is idempotent** and safe on an empty journal.
- **A file the proof deleted** rather than modified is restored as a deletion.
- **Every migrated proof still discriminates** — run each one, and its own decoys are what say so.

## Risks and open questions

- **Migrating eighteen proofs mechanically could break one quietly.** Each is run after migration,
  and each already has decoys that fail if it stops discriminating.
- **A journal write can fail the same way a restore can.** It fails *before* the mutation, so the
  outcome is a proof that does not run rather than a tree that is broken — which is the correct
  direction, and worth stating because it means this feature makes some runs fail that used to
  pass.
- **Concurrency.** `verify:ci` runs steps in sequence and turbo does not parallelise these, but
  the journal is keyed by path and merges rather than overwrites, so two proofs planting into
  different files would still be recorded correctly.

## Out of scope

- Making the proofs themselves faster or fewer.
- Anything about why Windows returns `UNKNOWN` from `writeFileSync`. It does; the design has to
  survive it rather than explain it.
