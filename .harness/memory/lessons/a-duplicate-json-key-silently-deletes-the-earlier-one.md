---
kind: lesson
title: A duplicate JSON key silently deletes the earlier one, and no tool we run says so
created: 2026-08-15
feature: F-003
severity: high
scope: [docs/design, content, packages]
links: [[a-gate-that-errors-is-failing-open]]
---

# A duplicate JSON key silently deletes the earlier one

`design-system.manifest.json` carried **two** top-level `"status"` keys: the approval
lifecycle string on line 4, and the status/icon pairing object 66 lines later.

`JSON.parse` keeps the last. So `"status": "approved"` did not exist at runtime — every
reader saw an object — and the manifest's own `gate.contrast.blockingWhenStatus: "approved"`
was comparing a string against `{ ok, warn, bad }`. **The contrast gate's blocking condition
could never be true.**

## Why nothing caught it

- It is **valid JSON**. RFC 8259 says object names "SHOULD be unique"; it does not require
  it, and no parser we use warns.
- Prettier does not reformat `docs/` in this repository, so no formatter saw the file.
- The JSON Schema in `content/schemas/` validates the *parsed* object, which by then has one
  `status`. A schema cannot see a key that was already discarded.
- Every hand-written reader used `manifest.status` and got *something* truthy.

The defect was found by writing a loader that asserted the field's **type**, not its
presence — `requireString(root['status'])` threw, and the message named the path.

## What to do

- **A checker for a hand-edited file must assert types, not just existence.** `if (x)` passes
  for an object where a string was meant. This is the same shape as
  [[a-gate-that-errors-is-failing-open]]: the check ran, produced a value, and the value was
  meaningless.
- **Duplicate keys are worth a check of their own** on any JSON a human maintains — the
  manifest, the corpus, `gates.json`. The test in
  `packages/design-tokens/test/manifest.test.ts` greps the raw source text, because by the
  time you have a parsed object the evidence is gone.
- **Two sibling keys with the same name are usually two different concepts**, and the fix is
  a rename rather than a merge. Here the pairing block became `statusPairing`, because
  `status` is what every external reference — ADR-0037, `gates.json`, F-003's acceptance
  criteria — already meant.

## The general form

Any check whose input is produced by a lossy parse is checking something other than what was
written. Ask what the parser threw away before deciding the check is sound.
