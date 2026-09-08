# A pipe hides the exit code that decides the commit

**Date:** 2026-09-08 · **Found in:** F-194

I ran this, and it committed:

```
node scripts/verify-state.mjs 2>&1 | tail -2 && git add -A && git commit ...
```

Gate 0 was **red**. The commit happened anyway.

`tail` exited 0. In a pipeline the shell reports the **last** command's status, so `&&` saw
success and carried on — and the red verdict scrolled past in the output I was reading rather
than acting on. Golden rule 10 says *commit verified increments only*, and I broke it while
looking straight at the failure.

## The shape of the mistake

I was using the pipe to keep the output short, and the thing I shortened away was the part that
decides whether the next command should run. **Trimming output is a reading convenience;
`&&` is a control decision.** Putting them in one pipeline makes the convenience overrule the
decision.

## What to do instead

Ask the question separately from displaying the answer:

```
node scripts/verify-state.mjs 2>&1 | tail -2
node scripts/verify-state.mjs >/dev/null 2>&1 && echo GREEN || echo RED
```

Two runs is the honest cost. Or `set -o pipefail`, which is the same idea in one line — but the
explicit second run also prints a verdict I have to read, rather than one I can skim.

## Why it is worth a note

It is not a typo; it is a habit that produces a **green-looking transcript over a red gate**, and
it will recur every time output is long — which is every gate in this repository. The failure
mode is silent in exactly the direction that matters: it never blocks a good commit, only ever
permits a bad one.

[[a-check-that-gets-quieter-is-worse-than-one-that-fails]]
