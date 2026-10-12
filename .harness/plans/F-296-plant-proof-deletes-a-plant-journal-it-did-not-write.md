# Plan: F-296 — plant-proof deletes a plant journal it did not write, so a real leftover plant goes unrecorded

| | |
|---|---|
| **Feature** | F-296 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/plant-proof.mjs`, `scripts/verify-a11y-proof.mjs`. No product code, no dependency. |
| **Author** | The implementing session (a contained harness fix; no planner subagent) |
| **Date** | 2026-10-12 |

---

## Intent

The plant journal (F-173) is how a mutation proof that was killed leaves a record of what it broke
and the bytes to undo it. `plant-proof.mjs` proves the journal, and it deletes the journal to do so:
`reset()` and its `finally` both `rmSync(JOURNAL)`. It runs inside `pnpm lint` and as a `ci.yml`
step, so it wipes any journal an earlier proof left. In F-291 that lost the record of two real plants.

After this feature, `plant-proof` refuses to start while any journal exists, names what it records,
and never deletes a journal it did not write. A leftover journal survives every proof in the `lint`
chain and in `ci.yml` until a person, or `recover()`, acts on it.

## Approach

**1. The a11y proof's skip path closes its journal first, or the build goes red.**

F-295's review found that `verify-a11y-proof.mjs` opens its journal (`guardPlants`) before it checks
that a case can plant. On "cannot plant: source moved" it `continue`s past `journal.close()`.

- The tap-target case (F-324) is the last of six, so every run leaves an entry naming an unmodified
  `packages/ui/src/Button.tsx`.
- The next `ci.yml` step is the plant journal proof, which deletes the entry today.
- Once `plant-proof` refuses instead, every local `verify-ci` run and every CI run would go red from
  that step on.

The fix opens the journal only once the case is known to plant. This is the class F-271 owns: a
journal opened before an exit. F-271 keeps the general check; this closes the one instance that
leaks on every run (rule 6: the build stays green). It will be watched leaking first, on the tree as
it is.

**2. `plant-proof` refuses over a leftover, and deletes nothing it did not write.**

- **First, before anything is written:** if `describeLeftovers()` reports entries, it prints the
  files and owners and the recovery command, and exits 1. This replaces today's "baseline: no plant
  is outstanding", which ran after `reset()` had already deleted the journal and so could never fail.
- **`reset()` no longer touches the journal.** Between cases the journal is already empty: case 1
  and case 3 end in `recover()`, and the decoy leaves none.
- **The `finally` recovers only its own.** If the journal holds entries and every owner is one of
  plant-proof's own children, it calls `recover()` (it restores a scratch file about to be removed)
  and the journal goes. If any other owner appears, it leaves the journal and says so.
- **A new case, watched failing first.**
  - A child with a different owner plants and is killed, so a real leftover journal is in place.
  - `plant-proof` is then run again as a child of itself.
  - It must exit 1, name the planted file, and leave the journal byte for byte.
  - There is no recursion: the second run refuses before it does anything.
  - On the script as it is, the second run deletes the journal and carries on, so the case fails.

**3. Every other proof is shown not to act on the journal.** A check in `plant-proof`'s coverage
section reads every script under `scripts/` and `tests/bench/src/`. Outside `plant.mjs` and
`plant-proof.mjs`, none may:

- import `JOURNAL` or `recover` from `plant.mjs`;
- or name `.plant-journal`.

Today none does (surveyed: `grep` over both directories). The check keeps it that way, so criterion
2 holds by construction for every proof in `lint` and in `ci.yml`. A person acts through
`node scripts/plant.mjs --recover`.

**Reused:** `describeLeftovers`, `recover`, the child that plants and is killed, `NO_JOURNAL_NEEDED`
and the coverage section's source walk.

**Not done:**

- F-271's general check (a journal opened before any early exit, in every proof);
- F-333's restore retry;
- F-331's leftover after `verify-ci` on win32.

Each is recorded and out of scope (rule 2).

## Files to touch

```
scripts/verify-a11y-proof.mjs   — the journal opens only once a case can plant
scripts/plant-proof.mjs         — the refusal, no journal deletion, the new case, the import check
.harness/state/effects.json, .harness/memory/effects/*.md (one new link; E-127's note), feature_list.json, progress.md
```

## Anticipated effects

| id | from → to | guard |
|---|---|---|
| **E-202** (high, new) | `scripts/plant-proof.mjs` → every leftover journal a proof leaves, and so the recovery F-173 promises (E-094) | `plant-proof`: a second run refuses over a foreign leftover, names it, and leaves it byte for byte; no other script imports `JOURNAL` or `recover` or names the journal file |
| **E-127** (existing) | `guardPlants` → every proof that opens a journal | its note gains the a11y skip path as an instance, fixed here; the guard stays F-271's |
| **E-124** (existing) | `plant-proof` in the lint chain | unchanged: the proof stays in `lint` and is now a refusal point too |

## Test plan

- **The leak, watched first:** `node scripts/verify-a11y-proof.mjs` on the tree as it is leaves a
  journal naming Button.tsx. After the fix it leaves none. (It still exits 1 on F-324's case.)
- **The refusal, watched failing first:** the new case added to the script as it is must report BAD,
  because the second run deletes the journal. After the fix, every case is OK.
- **Criterion 1 by hand, once:** with a real leftover in place (a killed child's entry),
  `node scripts/plant-proof.mjs` exits 1, names the file, and the journal's bytes are unchanged.
- **Criterion 2, on the chain:** with a leftover in place, `pnpm lint` stops at its first proof that
  opens a journal, and the journal survives byte for byte. Then `plant.mjs --recover`.
- **The build stays green:** Tier 2's `verify-ci --all` reaches the plant journal proof green after
  the a11y proof.

## Verification

```
# Tier 1 per increment (ADR-0132): format, typecheck, the root lint, state
# Tier 2 once: state, lint (F-296's list), security, verify-ci --all, and the full set
```

## Attestations

None: both criteria are gated by `plant-proof` in `lint`.

## Risks and open questions

**No `OQ-*` blocks this feature.**

1. **R1: F-331.** On win32 an interrupted gate-mirror child has once left a journal with the original
   bytes, cause unknown. Today plant-proof wipes that journal mid-run. Afterwards it refuses on it,
   loudly. That is the intended behaviour, and F-331 still owns the cause.
2. **R2: the a11y proof's other exits.** Its baseline exits come before the loop, so no journal is
   open. This feature changes only the skip path.

## Out of scope

F-271, F-324, F-331, F-333 (each recorded).

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claim and plan. **Tier 1 run:** state (exit 0). |
| 1 | this commit | **Both fixes, in one increment.** Approach items 1 and 2 were planned as two increments. Landed apart, plant-proof's fix would turn CI red at the a11y proof's leftover, so they go together. *(Approach item 3, the import check, is in this increment too.)*
- **The leak, watched first.** On the tree as it was, `node scripts/verify-a11y-proof.mjs` exited 1 (F-324) and left a journal, `packages/ui/src/Button.tsx`, owner `verify-a11y-proof`, with Button.tsx equal to HEAD. With the journal opened after the "cannot plant" check, the same run leaves none.
- **The refusal, watched failing first, over that real leftover.** Saved first. The unfixed plant-proof (with the new case added) printed "OK baseline: no plant is outstanding" over it, deleted it, and failed the new case twice: the second run exited 0, and the journal was deleted. With the fix and the saved journal put back, plant-proof exited 1, named Button.tsx and its owner, and left the journal with the same SHA-256. Then `plant.mjs --recover` (Button.tsx unchanged), and plant-proof exited 0: every case OK, no journal and no scratch directory left.
- **The import check, watched catching:** five decoy scripts, each caught (`JOURNAL`, `recover` renamed, `import * as`, `import()`, the file's name), and a `describeLeftovers`-only control that passes.
- **Tier 1, each exit 0:** format, typecheck, state, lint (plant-proof included, no journal after). |
| 2 | this commit | **Close-out.** E-202 (high) with its note and index line. E-127's and E-094's notes; the journal lesson's addendum (a `continue` is an early exit); a new lesson, *a proof of a safety net must not clear the net it proves*. Downstream notes on F-271, F-324, F-331 and F-333. **Tier 1, each exit 0:** format, state, claims. |
| review | this commit | **The one review (evaluator, cut off by a usage limit and resumed): FAIL as delivered.** One blocking, one significant and seven minor findings. Its Tier 2 on 2046121: state, typecheck, lint, format and build each exited 0; security exited 1 on F-322's nine advisories; `verify-ci --all` was 35 passed and 3 failed, exactly the known reds (the iOS half, F-324, F-322), with the plant journal proof green straight after the a11y proof and no F-333 event. Both criteria were demonstrated over the saved real leftover: plant-proof exited 1 with the SHA-256 unchanged, and `pnpm lint` stopped at `verify-guards` with the SHA-256 unchanged. Each finding fixed or recorded:
- **B1, fixed: plant-proof started over a journal it could not read, and deleted it.** `plant.mjs` reads an unparseable journal as empty, so the start check saw nothing to refuse. It now refuses on the file's existence, and says when the file cannot be read. A new case writes a truncated journal (after asserting it reads as empty) and runs plant-proof again: exit 1, the refusal's words, none of its cases, the bytes unchanged. The same fail-open read in every other proof is recorded as **F-334** (backlog).
- **S1, fixed: the refusal case passed on a second run that crashed.** It now asserts the refusal's own words, that the nested run printed no case lines, and that the planted file is still planted.
- **M1, fixed: the owner-scoped clean-up had no case.** The `finally`'s body is `cleanUp()`. A case meets `reset()` and `cleanUp()` with a third owner's entry, which must survive byte for byte and be reported.
- **M2, fixed:** the import check also catches a re-export, `import()` or `require()`, double quotes, and a call that runs `plant.mjs --recover`. It reads `package.json`'s scripts and the workflows, where the command text itself counts. It prints how many sources it read, and its blind spots are written beside it. A printed instruction to run `--recover`, which `verify-ci` and `verify-motion` carry, is not a recovery and is not flagged.
- **M3, fixed:** twelve decoys and four controls run inside the proof, so a typo in a pattern turns it BAD.
- **M4, fixed:** a run given `--nested` says it skipped the refusal cases.
- **M5, recorded:** `verify-contrast-proof.mjs:261-266` (a `continue` past `close()`) and `verify-contract-pin.mjs:60/85` (one module-level journal over three probes), both on F-271.
- **M6:** F-333's note, "F-296 IS DONE", becomes true with the done commit, which follows this one.
- **M7, fixed:** the header now says the refusal is stricter than other proofs', and why.
- **Seven mutants**, run from the scratchpad, one at a time, each fail the proof and the identity copy passes:
  - the start refusal removed;
  - the old readable-only check;
  - no refusal with `OWN` narrowed, which passed every case before;
  - the clean-up deleting the journal;
  - the clean-up recovering whatever the owner;
  - `reset()` deleting the journal;
  - a pattern typo.

  No journal and no scratch directory were left.
- **Records:** E-202's guard and note now describe what was built, with the blind spots. The lesson gains rule 4: refuse on the state's existence, not on what a forgiving reader makes of it.

**Tier 1 on the fixes:** see the commit. Tier 2 on the final tree: see `progress.md`. |
