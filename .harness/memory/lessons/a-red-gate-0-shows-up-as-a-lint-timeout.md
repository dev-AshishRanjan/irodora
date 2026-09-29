# A red gate 0 shows up as a lint timeout

**Learned:** F-233 (2026-09-29) · **Applies to:** anyone running `pnpm lint` with the state file dirty

---

`pnpm lint` runs `verify-gate-mirror-proof.mjs`, which spawns the gate-mirror check and waits up to
two minutes for it to plant a marker in `ci.yml`. The mirror checks gate 0 before it plants, so
**when `verify-state.mjs` is red the marker never appears**, and lint reports:

> the run plants something to interrupt — No marker appeared within two minutes

It reads like a slow machine or a broken interrupt handler. It was neither: a new backlog feature
named a service the schema refuses, and then a `mobile` feature with no mockup or open question.
Fixing the state file turned lint green with nothing else changed.

**How to apply:** when lint's gate-mirror proof times out, run `node scripts/verify-state.mjs` first,
and fix gate 0 before reading anything into the timeout. Run gates in the manual's order — state
first — so the cause is seen before its symptom.

Related: [[a-pipe-hides-the-exit-code-that-decides-the-commit]].
