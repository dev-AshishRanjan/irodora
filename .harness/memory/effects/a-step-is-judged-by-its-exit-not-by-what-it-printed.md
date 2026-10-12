# E-201 — A step is judged by its exit, not by what it printed

**Link:** `verify-ci.mjs#runSteps` → every Tier 2 record (ADR-0132), and the lessons that recommend
`verify-ci --all`
**Guard:** `verify-ci --prove` in `lint`, through the run's own `runSteps` and `failureReport`, on
the printed text: a 16 MiB step passes; an exit 3 fails and shows its log's end; an unstartable step
and a killed step are not run, named; the count keeps them apart **Severity:** medium
**Feature:** F-295

---

## Why B changes when A does

`spawnSync` buffers a child's output and kills it past `maxBuffer`, 1 MiB by default. Test, a11y and
contrast print 7–12 MB uncached, so verify-ci killed them, read `status` null as 1, and reported three
passing steps red on every run; every Tier 2 record since F-240 had to explain them away. The step
now writes to a log file, so nothing is buffered, and the runner reports three outcomes. `not run`
— it could not start, or it was killed — is marked apart from a failed check, names why, and is
counted apart in the summary.

The run and the proof share one path: `runSteps` prints each step's line, `failureReport` the tails
and the count. A proof that called only the runner beneath them would pass while the lines a person
reads said something else.

## What it does not do

It does not stream a step's output live, and it sets no timeout of its own: a step that hangs still
hangs. A failed step shows its last 30 lines, as before.

It cannot tell every kill from a failure. A signal reads `not run` only when it ends the process the
runner started: the shell, or the command the shell `exec`ed in its place. A shell that did not
`exec` the command exits 128+N, and on win32 a process another program terminates ends with an exit
code. Both read `failed`. A command the shell cannot find is
`failed` too (cmd.exe 1, sh 127).
