---
kind: lesson
title: A mutation harness that cannot start the test runner reports every mutation caught
category: engineering
confidence: 1.0
created: 2026-09-02
scope: [root, tests]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-gate-that-errors-is-failing-open]], [[a-pipe-discards-the-exit-status-a-gate-just-produced]], [[a-decoy-written-against-old-values-quietly-stops-discriminating]]
---

# A mutation harness that cannot start the runner reports every mutation caught

The harness pattern used across F-122 to F-125 was:

```js
try {
  execSync('./node_modules/.bin/jest --config jest.config.mjs --testPathPattern x', { cwd, stdio: 'pipe' });
} catch {
  caught = true;   // the suite went red — the mutation was detected
}
```

**`execSync` spawns through `cmd.exe` on Windows, not through bash.** `./node_modules/.bin/jest`
is not a command cmd.exe can run, so every invocation exited non-zero with
`'.' is not recognized as an internal or external command` — and the harness read that as
*the suite failed*, which it calls **CAUGHT**.

Jest never ran. Not once, across **38 mutations in four features.** All 38 were reported caught.

## The tell was in the result, and I read past it

**Thirty-eight out of thirty-eight.** A perfect catch rate across four unrelated modules —
including mutations aimed at ordering, at unreachable branches, and at a helper nobody could
observe — is not a sign of a strong suite. It is the signature of a check that cannot fail.

That is the same shape as [[a-gate-that-errors-is-failing-open]] and
[[a-pipe-discards-the-exit-status-a-gate-just-produced]], and it was caught here only because a
*fifth* mutation looked wrong on its face: removing a JSX prop that no test renders was reported
CAUGHT, and nothing in the suite could have seen it.

**Suspicion came from a result that was too good for its subject, not from the number.**

## What the real numbers were

Re-run with `node node_modules/jest/bin/jest.js`, which runs everywhere:

| set | claimed | actual | what the survivors were |
|---|---|---|---|
| `browse` | 8/8 | **5/8**, 2 stale anchors | group-size ordering was untested; the `UNGROUPED` branch is unreachable |
| `cost` | 4/4 | **4/4** | — |
| `wardrobe-screen` | 5/5 | **5/5** | — |
| `investment` | 12/12 | **11/12** | a defensive array copy no caller can observe |
| `outfit` | 5/5 | **5/5** | — |
| `lens` | 4/4 | **3/4** | nothing checked the handler was passed to the screen |

Three real defects in the tests, and one real defect in a feature's coverage. **Two thirds of the
harness runs were sound, which is why nothing else looked wrong.**

## The rules that follow

1. **A harness that runs a subprocess must prove it can produce a PASS.** Run it once against the
   unmutated source and assert the command succeeds, before mutating anything. A run that only
   ever observes failure cannot tell failure from not-running.
2. **Distinguish "exited non-zero" from "tests failed."** Jest's failure output contains
   `Tests:`. If the captured output has no such line, the runner did not run — that is an error
   in the harness, not a caught mutation.
3. **On Windows, invoke the runner's JS entry point:** `node node_modules/jest/bin/jest.js`.
   `./node_modules/.bin/x` is a bash-ism, and `execSync` does not use bash.
4. **Treat a 100% catch rate as a hypothesis to test, not a result to report.**

## How to check it

Add this to the top of any mutation harness:

```js
execSync(runner, { cwd, stdio: 'pipe' });   // unmutated: MUST succeed, or the harness is broken
```

If that throws, stop. Every "CAUGHT" after it would be a lie.
