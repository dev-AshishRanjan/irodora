---
kind: lesson
title: A cache key describes the package, not the world the test read
category: engineering
confidence: 0.95
created: 2026-08-25
scope: [root, packages, apps/mobile]
links: [[a-task-runner-that-walks-packages-cannot-see-a-file-outside-one]], [[a-gate-that-errors-is-failing-open]], [[a-truncated-report-reads-exactly-like-a-passing-one]], [[a-pipe-discards-the-exit-status-a-gate-just-produced]]
---

# A cache key describes the package, not the world the test read

`pnpm test` printed **31 successful, 31 total — 26 cached**. The same command with `--force`
was **red in four tests**. Both were true.

## The two ways the key was narrower than the test

**A test that reads outside its package.** `packages/store/test/key.test.ts` scans
`apps/mobile/src` for 64-hex literals, because FR-56 says the database key is never in the
bundle. Turbo keys the `test` task on the inputs of the package it runs in. So when F-018
generated `apps/mobile/src/corpus/generated/bundle.ts` — carrying 126 SHA-256 digests, which are
also 64 hex characters — the check went red and **its cached pass was replayed through two
whole features** without anyone seeing a failure.

**A test whose answer depends on the runtime.** `turbo.json` lists `.nvmrc` in
`globalDependencies`. That is the **file that requests a Node version**, not the version
running. A workstation on Node 22.16.0 against a repo pinning 24.19.0 replays caches produced
under 24 — and the tests that differ between V8 builds are exactly the bitwise ones. WCAG
contrast came back `4.500078715444717` against a pinned `...719`: two units in the last place,
and a hard failure, correctly.

## The generalisation worth carrying

> **Ask what a check READ, not what package it lives in.**

A cache key is a claim that nothing the task depends on has changed. It is only as true as the
inputs somebody declared, and the inputs somebody declares are the files they were thinking
about. Anything the test reaches for at run time — a sibling package's source, a generated
artefact, the environment, the clock, the runtime itself — is outside that claim unless it was
put inside it deliberately.

This is the sibling of
[[a-task-runner-that-walks-packages-cannot-see-a-file-outside-one]], and they are worth keeping
apart: that one is about which files a task **walks**, this one is about which files a task's
**cache** is keyed on. A task can walk exactly the right files and still be skipped.

## What made it visible, and what did not

Nothing reported it. Gate 5 was green on every run, CI mirrored the same command, and the
failure was a test that had been red since the day the corpus bundle was generated.

It surfaced because a change to `packages/store` **invalidated that package's cache** and the
suite ran for the first time in two features. That is luck, not a control: the same defect in a
package nobody edits stays hidden indefinitely.

## What not to do about it

**Do not turn the cache off.** That trades a wrong answer for a slow one, and a slow gate is a
gate somebody eventually skips. Declare the real inputs, and put the resolved runtime version
into the key — `node --version`, not the file that asks for one.

**Do not regenerate a fixture to go green.** The identity fixture exists to fail on exactly this,
and F-083 already says so in as many words: converting a discovered violation of the product's
central guarantee into a silent one is worse than the red.

## The check that makes a fix real

Watch a planted change **outside** a package turn that package's cached green red. Without
that, the fix is a configuration that parses
[[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]]. Filed as **F-093**.
