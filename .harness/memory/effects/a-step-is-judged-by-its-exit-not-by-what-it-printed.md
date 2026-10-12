# E-201 — A step is judged by its exit, not by what it printed

**Link:** `verify-ci.mjs#runStep` → every Tier 2 record (ADR-0132), and the lessons that recommend
`verify-ci --all`
**Guard:** `verify-ci --prove` in `lint` (a 2 MiB step passes; an exit 3 fails with its tail; an
unstartable step and a killed step are not run, named) **Severity:** medium **Feature:** F-295

---

## Why B changes when A does

`spawnSync` buffers a child's output and kills it past `maxBuffer`, 1 MiB by default. Test, a11y and
contrast print 7–12 MB uncached, so verify-ci killed them, read `status` null as 1, and reported three
passing steps red on every run; every Tier 2 record since F-240 had to explain them away. The step
now writes to a log file, so nothing is buffered, and the runner reports three outcomes. `not run`
— it could not start, or it was killed — is marked apart from a failed check and names its error.

## What it does not do

It does not stream a step's output live, and it sets no timeout of its own: a step that hangs still
hangs. A failed step shows its last 30 lines, as before.
