# Plan: F-216 — The plant-journal proof is the one proof no local run executes

| | |
|---|---|
| **Feature** | F-216 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-26 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The failure

```
BAD every proof that writes into the tree uses the journal:
    verify-dead-exports · verify-layout-primitives-proof
    verify-reachability · verify-surface-not-card-proof
```

`plant-proof.mjs` asks a question of the **source**: any `.mjs` under `scripts/` containing
`writeFileSync|cpSync|copyFileSync|unlinkSync|rmSync` must either import `plant.mjs` or appear in
`NO_JOURNAL_NEEDED` with a reason.

It **over-collects on purpose**, and says so: *"Being wrong in that direction costs an entry in
the list below, with a reason; being wrong in the other costs the guarantee."*

**All four write only into `mkdtempSync(join(tmpdir(), …))` and remove it.** Nothing they touch is
in the repository, so a killed run leaves nothing behind and the journal has nothing to protect.
Three scripts are already declared for precisely that reason — `verify-motion`,
`verify-app-imports`, `verify-engine-purity`.

So the entries are the fix for the symptom, and the regex is left exactly as it is: weakening a
recorded decision to make my own commit green is the wrong trade, and an auto-detector that
guessed "this one only uses tmpdir" is the guess that costs the guarantee.

## The root cause is the feedback loop

The check has been red since **F-179, on 2026-09-08**. Three features have shipped past it since,
and every one of them reported a green local run honestly:

```
in the lint chain      verify-gate-mirror-proof · e2e-flows-proof · verify-blocked-reason-proof
                       verify-layout-primitives-proof · verify-surface-not-card-proof
CI only                plant-proof                     ← the anomaly
```

`plant-proof.mjs` is the **only** proof in `scripts/` that no local command runs. Four authors in
a row is not four careless authors; it is a check that cannot be heard from where the work
happens.

So it joins the lint chain, beside the five proofs already there. CI keeps its own
`Gate 0 — plant journal proof` step — the duplication is a few seconds and the mirror gate
compares gate commands to CI steps rather than forbidding a script from appearing twice.

## Files to touch

```
scripts/plant-proof.mjs   — four entries in NO_JOURNAL_NEEDED, each with its reason
package.json              — plant-proof joins the lint chain
```

## Test plan

- **The proof passes**, and its *other* direction still holds: the stale-exemption case must stay
  green, since an entry for a file that later starts journalling is an entry nobody removes.
- **The added entries are real**, asserted by that same stale check rather than by my reading.
- **`pnpm lint` now fails when the list is behind** — watched, by removing one entry and running
  the chain.
- The gate-mirror proof, because the lint chain changed and that is what it compares.

## Verification

`state · lint · format:check · test`.

## Risks

- **Adding a SIGKILL proof to the lint chain.** It spawns a child, kills it, and restores from
  the journal; on win32 there is no signal and the proof says so itself. It has run clean here.
- **A longer lint.** A few seconds against a check that has been silent for four features.

## Out of scope

The `RESTORES` regex, and any attempt to infer which writers are temp-only. Both are the recorded
decision this plan deliberately does not reverse.
