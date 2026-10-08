---
kind: lesson
title: A step that runs a gate's command under another name can hide the gate
category: convention
confidence: 0.9
created: 2026-10-08
scope: [root, scripts]
links: [[a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check]]
---

# A step that runs a gate's command under another name can hide the gate

F-231 added gate 16's own proof to the two build workflows, as a step beside the gate:
`node scripts/verify-apk.mjs --prove`, named *Gate 16 — artifact proof*. The gate-mirror proof
went red. It deletes each gate's step and expects gate 0 to notice; with gate 16's step gone, the
new step still ran a command containing `node scripts/verify-apk.mjs`, so the mirror stayed green.
The gate could have been removed from CI and nothing would have said so.

Nothing about the proof step was wrong. Its command and its name were simply close enough to the
gate's to stand in for it.

## The rule

**A step that is not a gate does not run a gate's command, and does not take a gate's name.** Give
it a package script (`pnpm verify:apk:prove`) and a name of its own (*Artifact proof*). Then the
mirror can find the gate only where the gate is.

## How it showed up

Locally, as `verify-gate-mirror-proof`'s decoy *an uninterrupted run on a clean tree still passes*
going red. That decoy runs `verify-gate-mirror --prove`, which is where the gate went missing. The
same decoy had gone red once already in this feature for an unrelated reason, a Windows file-lock
interruption that left plants in the workflows. Rerunning `verify-gate-mirror --prove` alone was
what told the two apart: the first time it passed, the second time it named the gate.
