---
kind: lesson
title: A red gate at step nine hides every gate after it, and a workstation that cannot run them hides it from the other side
category: process
confidence: 1.0
created: 2026-08-26
scope: [root]
links: [[a-gate-that-errors-is-failing-open]] [[a-truncated-report-reads-exactly-like-a-passing-one]] [[a-failing-gate-is-usually-already-filed]]
---

# A red gate at step nine hides every gate after it

**A build that fails early is not a build that reported one problem. It is a build that
reported one problem and declined to look for any others.**

CI here is one job, in gates.json order, stopping at the first failure. That is deliberate and
[ADR-0024](../../../docs/adr/0024-ci-cd-github-actions-trunk-based.md) is why. The cost is
stated in `ci.yml` itself — a failing typecheck means the secret scan does not run on that push
— but the version of the cost that actually bit was longer-lived:

`pnpm install --frozen-lockfile` failed on three consecutive pushes (F-098). Every one of the
seventeen steps after it was **skipped**, not passed. Behind it, gate 15 had been red since
F-021 — `verify-no-key-material.mjs` reporting a published rules digest as a possible SQLCipher
key (F-096). Four features shipped over the top of it.

## Why it stayed invisible from both directions

- **From CI**: the run stopped before the gate. GitHub renders skipped steps in grey, and a
  grey step reads like a step that had nothing to do.
- **From the workstation**: `gitleaks` was not installed, so gate 15 was honestly recorded as
  *"partly run"* in `progress.md` — and the half that WAS runnable, the key scan, was never
  executed either, because `pnpm security` runs the secret scan first and stops on it.

Neither report was dishonest. Both said less than they appeared to.

## What to do about it

**When you repair the step that was stopping the build, run the whole remaining sequence before
you say the build is fixed.** The failure you were handed is evidence about one step. It is
evidence about nothing that never ran.

In this repository that means: fix the red step, then walk `gates.json` in order to the end,
locally, on the pinned toolchain — and say in the report which gates you ran and which you did
not, per golden rule 11. Repairing install alone would have moved the red from step 9 to step 25
and looked, from the commit message, exactly like a fix.

**A blind spot has a duration.** When you find one, work out when it opened — `git log` on the
file the gate reads is usually enough — and put that number in the record. "Red since F-021,
four features" is a fact somebody can act on. "This was already broken" is not.

## The environment half

A gate that cannot run on the workstation is a gate whose failures are only ever discovered by
CI. That is survivable when CI reaches it. It is not survivable when CI is stopping earlier,
because then nothing anywhere is executing the check.

Node 24.19.0 was installed here the whole time, under nvm, while `pnpm install` was being
reported as impossible on Node 22. Before recording a tool as unavailable, check whether the
pinned version is already on the machine under a version manager — `.nvmrc` names it.
