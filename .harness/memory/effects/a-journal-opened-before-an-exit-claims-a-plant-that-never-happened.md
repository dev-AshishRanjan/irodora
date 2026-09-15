# A journal opened before an exit claims a plant that never happened

**Effect:** [E-127](../../state/effects.json) · `scripts/plant.mjs#guardPlants` → every mutation
proof that opens a journal · **medium** · guard owed by `F-271`

## What happened

`guardPlants()` writes `.harness/state/.plant-journal.json` **when it is called**, recording the
original of every file the proof is about to plant into. `finally` closes it. A `process.exit(1)`
does not run `finally`.

So a proof that opens its journal and then exits — because a fixture is missing, or because its
baseline is already red — leaves a journal claiming plants that never happened. The next run of
**any** proof refuses to start until someone runs `node scripts/plant.mjs --recover`, which restores
"originals" that were never displaced.

It happened twice in one day:

- **F-218**, `verify-mockups --prove`: a red baseline exited after `guardPlants()`, and the journal
  claimed five plants. Fixed there by opening the journal after the baseline check.
- **F-219**, `verify-claims-proof`: the same shape, confirmed on a red baseline — and then made
  worse by F-219 itself, which added a fixture exit after the journal opened.

## Why it is medium, not critical

The failure is **loud**. The next run refuses and names the journal; nothing is silently
overwritten, because recovery compares against the recorded originals. The cost is a blocked gate
and a person who has to decide whether the journal is stale — and a stale journal that someone
recovers without checking it is the one way this turns into lost work.

## The guard

**None yet.** `F-271` owns it: a check that each proof opens its journal only after its last early
exit, and a case that demonstrates the stale journal. A crude scan (does a `process.exit(1)` follow
`guardPlants(` before the first write?) flags `verify-gate-mirror-proof`,
`verify-no-inference-proof`, `verify-spacing-scale` and `verify-viewport`; it cannot tell a baseline
exit from the deliberate refuse-a-leftover branch, so each needs reading.

## What F-219 fixed

`verify-claims-proof` now declares `let journal = null` before its `try`, opens the journal after
every early exit and immediately before the first plant, and closes it with `journal?.close()`. That
meets F-271's first criterion for this one script; the other four and the demonstrating case remain.
