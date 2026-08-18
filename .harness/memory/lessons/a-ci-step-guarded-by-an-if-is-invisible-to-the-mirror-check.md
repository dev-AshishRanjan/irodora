---
kind: lesson
title: A CI step guarded by an `if:` is invisible to the mirror check, so an "active" gate can never run
category: convention
confidence: 1.0
created: 2026-08-18
scope: [root]
links: [[a-gate-that-errors-is-failing-open]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[a-pipe-discards-the-exit-status-a-gate-just-produced]]
---

# A CI step guarded by an `if:` is invisible to the mirror check

**`scripts/verify-state.mjs` compares `run:` commands. It never reads `if:`. So a gate marked
`active` in `gates.json`, with a step present in `ci.yml` that is conditioned out, passes every
check we have and runs nowhere.**

## How it nearly shipped

`ci.yml` carried, by design, guarded steps for gates that were still `pending`, so each would
activate the moment its feature landed:

```yaml
- name: 'Gate 11 — content'
  if: hashFiles('content/colors') != ''
  run: pnpm test:content
```

That is a good pattern for a pending gate. It becomes a trap at the moment of activation, and
gate 11's activation is the worst possible case: **F-011 ships the gate and F-012 ships the
entries**, so `content/colors/` stays empty for the rest of R1. The step would have been
skipped on every push for months, while `gates.json` said `status: "active"` and gate 0 said
`11 active gate(s) mirrored in CI`.

Both statements would have been true. Neither would have meant the gate ran.

## Why the mirror proof does not catch it

`scripts/verify-gate-mirror.mjs` is a genuinely good check — it deletes each active gate's step
in turn and asserts gate 0 fails naming that gate. But it operates on **step presence**, which
is exactly what a conditional step has.

## The rule

**When a gate moves to `active`, remove its `if:`.** A gate that cannot run is failing open,
and an active gate is by definition one we have decided must run.

If a gate genuinely cannot run unconditionally, that is a fact about the gate, and the fix is
to make it able to — gate 11 runs against an empty corpus because it carries its own fixtures
([[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]]), not because the corpus
happens to be non-empty.

## What is still owed

Gate 11's condition was removed in F-011. **The general defect is unfixed**: gates 7, 10 and 12
still carry `if:` guards, and gate 0 still cannot see them. Recorded as **F-072** rather than
fixed under F-011's number, because it is a change to a repository-wide check rather than to
that feature's subject — but it is a real hole and it is the kind that only shows up once
somebody has already trusted a green build.
