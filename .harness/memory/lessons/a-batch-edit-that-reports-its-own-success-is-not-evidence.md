---
kind: lesson
title: A batch edit that reports its own success is not evidence
category: convention
confidence: 1.0
created: 2026-08-19
scope: [root, scripts]
links: [[generating-an-artefact-is-not-checking-it]], [[a-gate-that-errors-is-failing-open]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
---

# A batch edit that reports its own success is not evidence

A script rewrote 12 vitest configs, replacing `defineConfig` with a shared helper. It printed:

```
wrote 7 new configs, updated 5 existing
```

**Three of those five were not updated.** The regex matched a multi-line `test: { … }` body;
three files used the single-line form `test: { include: [...] },`. The import line was
replaced in all five — that pattern did match — so those three ended up importing a helper
they never called and calling a `defineConfig` they no longer imported.

Every one of them was a syntactically valid TypeScript file that threw
`ReferenceError: defineConfig is not defined` the moment vitest loaded it.

## Why the report was worse than no report

The count came from `n++` inside the loop, incremented after a successful `writeFileSync`.
Every file *was* written. What the script could not tell was whether the write **changed what
it was supposed to change** — it only knew the file had been replaced, not that both
substitutions landed.

> A counter that increments on "I did something" reads exactly like a counter that increments
> on "I did the right thing", and the difference is invisible in the output.

## The shape that works

Assert the **post-condition**, not the operation, and assert it from outside the script:

```bash
# not: "updated 5 files"
grep -rn "defineConfig(" --include='vitest*.ts' packages/ || echo "none — all converted"
```

For a batch edit, the post-condition is usually one of two things:

- **the old pattern appears nowhere** — the search that finds zero is the evidence
- **the new pattern appears everywhere expected** — `grep -L` over the target set

Both are one command, both run after the script, and both would have caught this instantly.
The script's own tally would not, and did not.

## The tell

If a transform reports a number, ask what happens when it matches nothing. If the answer is
"the file is written unchanged and the counter still goes up", the number is decoration.

This is [[generating-an-artefact-is-not-checking-it]] applied to an edit rather than a build:
performing an action and verifying its result are different acts, and only the second one is
a check.
