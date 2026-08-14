---
kind: lesson
title: A pipe discards the exit status the gate just produced
created: 2026-08-14
feature: F-005
scope: [root, scripts, .github]
links: [[a-gate-that-errors-is-failing-open]], [[mutual-assignability-does-not-catch-an-optional-field]]
---

# A pipe discards the exit status a gate just produced

```bash
pnpm security:secrets 2>&1 | tail -1 && git commit -m "..."
```

This commits **whether or not the gate passed.** A pipeline's exit status is the status of
its *last* command, and `tail` always succeeds. The gate ran, found two secrets, printed
`leaks found: 2`, exited 1 — and `&&` saw `tail`'s 0 and went ahead.

That is exactly how a red commit landed on `main` here, against golden rule 10. Nobody
decided to override "never commit red". The answer was produced correctly and thrown away
one layer out.

## Why it is easy to do

Piping to `tail`/`head`/`grep` is the natural way to keep a long gate's output readable, and
it is invisible: the summary line still says the gate failed, sitting right above the commit
that should not have happened. Reading the output and reading the *status* are different
acts, and only the second one gates anything.

## What to do instead

```bash
pnpm security:secrets >/dev/null 2>&1; echo "exit=$?"     # status, directly
pnpm security:secrets 2>&1 | tail -3; echo "${PIPESTATUS[0]}"   # if output is wanted too
set -o pipefail                                            # makes the pipeline fail
```

For anything chained to an action — a commit, a deploy, a release — **do not put a gate
inside a pipeline at all.** Run it, check `$?`, then act.

## The general shape

**A check is only as good as the weakest link between its answer and the decision it
governs.** This repository has now hit that shape three times, each one layer further out:

| Where it failed | What it looked like |
|---|---|
| The rule | a lint rule that parsed but did not enforce — [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]] |
| The check | a mirror check matching substrings, so a deleted CI step passed |
| **The plumbing** | the gate answered correctly and a pipe discarded it |

CI is not exposed to this one — GitHub Actions reads each step's own status. It is a local
workflow hazard, which makes it worse, because local is where the commit happens.
