---
kind: lesson
title: A gate that reads the filesystem gives one answer on a workstation and another on a runner
category: engineering
confidence: 1.0
created: 2026-09-03
scope: [scripts, .harness]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]], [[a-fix-made-in-review-is-the-one-most-likely-to-ship-untested]]
---

# CI was red for four pushes and every local run was green

`.harness/plans/F-118-frame-processors-need-a-package.md` linked to a source file inside
`node_modules/.pnpm/…`. Gate 0's governed-document link check resolves every relative link with
`existsSync`.

**Gate 0 runs before the install step** — deliberately, so a broken state file fails in seconds
instead of after a five-minute install. So:

| | `node_modules` | verdict |
|---|---|---|
| a workstation that has installed | present | **pass** |
| a CI runner at gate 0 | absent | **fail** |

Same commit. Two verdicts. The one nobody saw was the true one, and it stayed invisible across
**runs 37, 38, 39 and 40** — F-119, F-120, F-121 and F-137 — because each session ran the gate
locally, saw green, and had no reason to look further.

## The rule

**A check that consults the filesystem must not consult anything git does not track.** Otherwise
its result is a fact about the machine rather than about the commit, and the two only diverge
where nobody is watching.

Concretely, for anything a governed document may point at: `node_modules`, `dist`, `.turbo`,
`.expo`, `coverage`, `build`. All are absent on a fresh checkout and all are present after a
routine local session.

## Why "ignore them" was the wrong fix

Skipping such links would restore determinism and leave the link rotting. They are **refused**,
with a message that names the reason — and the path in question also carried a pnpm content
hash (`react-native-vision-camera@_ab4365e…`) that changes whenever the lockfile does, so it was
unstable even on the machine where it resolved.

## The habit this needs

**Reproduce the runner's conditions, not just the runner's commands.** A bare checkout is one
command:

```bash
git ls-files -z | xargs -0 -I{} sh -c 'mkdir -p "$0/$(dirname "{}")" && cp "{}" "$0/{}"' /tmp/bare
cd /tmp/bare && node scripts/verify-state.mjs
```

That would have caught this in seconds, any time in four sessions.

And **when a gate fails only in CI, fixing the first error is not finishing.** Everything after
gate 0 had been skipped for four runs, so the rest of the workflow was unverified too — it had
to be run before the fix could honestly be called a fix.
