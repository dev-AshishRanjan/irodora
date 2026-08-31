# Plan: F-102 — Two different effect links are both numbered E-032

| | |
|---|---|
| **Feature** | F-102 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` — the harness state and gate 0 |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-31 |

---

## Intent

`effects.json` holds 35 links and 34 distinct ids: two links are both `E-032`. The effect
graph is the document whose entire purpose is to be unambiguous about consequences, and an
id that resolves to two different things defeats that at the primitive level.

"Done" to a reader: every `E-###` names exactly one link; gate 0 refuses to pass a graph
where that stops being true; and nothing anybody reads as *current* still points the old id
at the wrong link.

## Approach

### Which link keeps E-032 — decided from the record, not from preference

Both candidates are load-bearing and both are cited widely, so the tiebreak had to come
from something other than convenience. It came from `git log -S`:

| link | `from` | added by | committed | severity / status |
|---|---|---|---|---|
| the **lockfile** link | `pnpm-workspace.yaml` | F-098 (`0012992`) | 2026-08-26 **09:22:54** | `critical` · `active` |
| the **hueBias** link | `score.ts#hueBias` | F-028 (`c629d5b`) | 2026-08-26 **09:46:43** | `high` · `resolved` |

The lockfile link held the id **24 minutes first**. The hueBias link is the duplicate, and
it is the one that moves. Three things agree with that reading rather than only one:

- **First allocation wins.** The later write is the mistake; renumbering the earlier one
  would make the same claim about the record twice.
- **[ADR-0077](../../docs/adr/0077-the-random-source-is-a-port-and-the-app-installs-it.md)
  cites "the same rule E-032"** meaning the lockfile rule. An ADR is a durable decision
  record; leaving it correct without editing it is strictly better than editing it.
- The moving link is **`resolved`**, so its id has no future to disturb — no gate reports
  on it, and no work is scheduled against it.

**New id: `E-038`.** Highest currently allocated is `E-037`; ids are allocated densely and
never reused.

### The check, and the one it must not become

Gate 0 section 4 already walks `effects.links`. The new check accumulates ids and fails on
any seen twice, naming **the id and both links' `from.ref`** — because "duplicate id
E-032" without the two subjects leaves the reader doing the same `git log -S` I just did.

It is deliberately **not** a schema change: JSON Schema 2020-12 can express `uniqueItems`
over whole objects but has no unique-by-property constraint, so a schema attempt would
either pass (the two links differ in every other field) or require duplicating the id set
in a way the schema cannot check. The check belongs where the graph is already read.

### Watched failing — and kept watchable afterwards

Criterion 2 asks for the check watched failing **before** it is fixed. That evidence is
available in its strongest possible form here: the defect is real and in the tree right
now, so increment 1 lands the check and runs gate 0 against the genuine duplicate. No
plant, no decoy, no fixture.

But that evidence expires the moment increment 2 lands — afterwards the repository contains
no duplicate, and the only thing attesting the check works would be a paragraph in
`progress.md`. That is precisely
[`prose-in-a-state-file-rots-and-no-schema-can-see-it`](../memory/lessons/prose-in-a-state-file-rots-and-no-schema-can-see-it.md),
and the reason every other gate-0 check here carries a proof script. So increment 3 adds
`verify-effect-id-proof.mjs` on the established pattern, with **a control that must stay
green** — a link added with a *fresh* id — because a proof where every case is red cannot
tell a working check from one that fails on everything
([`a-decoy-that-is-not-broken-proves-nothing`](../memory/lessons/a-decoy-that-is-not-broken-proves-nothing.md)).

### What moves, and what is history

Criterion 3 says every reference moves with the id. Applied literally it would rewrite
`progress.md`, which [`state/README.md`](../state/README.md) defines as **append, newest
first** — history. Rewriting a past entry to say something it did not say is falsifying the
record to satisfy a checklist, and it would destroy the only account of *how* the collision
happened.

So the line is drawn at **what a reader consults as current**:

| moves | stays |
|---|---|
| `effects.json` — the link's own id, and E-034's rationale citing "(E-032)" | `progress.md` — append-only history |
| `memory/index.md` — the row labelled **E-032** | `.harness/plans/F-029`, `F-099`, `F-104`, `F-105` — historical plans |
| the memory note's own heading | |
| live source comments in `score.ts`, `photo.ts`, `generate-rules-bundle.mjs` | |
| `feature_list.json` — F-029's `effects` array, F-099's acceptance text | |

The mapping is recorded **once, in the renumbered link's memory note**, which is where a
reader who finds `E-032` in an old entry and lands on the lockfile link will be sent. The
new progress entry states it too. That is a pointer that cannot rot, because gate 0 already
requires the note to exist and to be referenced.

**Reused:** gate 0's existing `fail`/`pass` reporting and its `effects` section; the proof
script shape from `verify-lockfile-proof.mjs` and `verify-stale-rationale-proof.mjs`
(capture original → plant → assert red → restore in `finally` → verify the restore).

**New:** one check in `verify-state.mjs`; one proof script; one CI step beside the other
gate 0 proofs.

**Increments:**

1. Add the duplicate-id check to gate 0. **Run it against the live defect and capture the
   red output.** Build stays green in the sense that matters: gate 0 is correctly reporting
   a real defect that already existed.
2. Renumber the hueBias link to `E-038` and move every live reference. Gate 0 green again.
3. Add `verify-effect-id-proof.mjs` and its CI step. Run it.

## Files to touch

```
scripts/verify-state.mjs                            — the duplicate-id check, in section 4
scripts/verify-effect-id-proof.mjs                  — NEW: proves the check can fail
.github/workflows/ci.yml                            — the proof step, beside the other gate 0 proofs
.harness/state/effects.json                         — E-032 → E-038 on the hueBias link; E-034's rationale
.harness/memory/index.md                            — the row's label
.harness/memory/effects/the-warm-cool-rule-is-written-twice-because-an-install-cannot-run.md
                                                    — heading, and the former-id note
.harness/state/feature_list.json                    — F-029 effects array, F-099 acceptance text, F-102 close-out
packages/recommendation/src/score.ts                — comment citation
apps/mobile/src/profile/photo.ts                    — comment citation
scripts/generate-rules-bundle.mjs                   — comment citation
.harness/state/progress.md                          — new entry (append)
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| An `E-###` id changes | every document citing it; the memory note pairing | `gate:state` — the effects section already fails on a missing/orphaned note, so a half-done rename is caught |
| Gate 0 gains a check | `verify-gate-mirror.mjs`; the CI job | the mirror check compares **active gates**, not proofs — a proof step is additive. Verified by running gate 0 after the CI edit |
| The proof plants into `effects.json` | every gate 0 check that reads it | restore in `finally`, then byte-compare the restore, as `verify-lockfile-proof.mjs` does |

No shared **code** contract changes: nothing imports an effect id. The comment citations in
`score.ts`, `photo.ts` and `generate-rules-bundle.mjs` are prose inside source files.

**A new link will be recorded** for the id-uniqueness property itself — `effects.json` →
gate 0 → the proof — because the graph currently has no link saying that its own primary
key is checked by anything.

## Test plan

- **Unit / property:** none — gate 0 is a script with no unit suite; its discipline here is
  the proof script.
- **Negative, with a decoy:** the proof plants a duplicate id and requires gate 0 red
  *naming that id*; the control adds a link with a **fresh** id and requires gate 0 to stay
  green. Without the control, a check that failed on any added link would pass the proof.
- **Restore assertion:** `effects.json` byte-compared to its original after the run, and
  gate 0 re-run green as the outer baseline.
- **Golden / conformance / e2e:** not applicable — no colour value, no port, no surface.

## Verification

```
node scripts/verify-state.mjs            # gate 0 — the gate this feature is about
node scripts/verify-effect-id-proof.mjs  # the new proof
node scripts/verify-gate-mirror.mjs      # the CI edit did not desync the mirror
node scripts/gate.mjs lint               # score.ts / photo.ts / generate-rules-bundle.mjs comments
node scripts/gate.mjs format
node scripts/gate.mjs typecheck
```

Evidence: the **red** gate 0 output from increment 1 quoted verbatim in `progress.md`, and
the green output after increment 2 with the link count unchanged at 35 and the id count
risen to 35.

Gates not applicable and why: `test`, `color-golden`, `cvd`, `content`, `contrast`, `a11y`,
`perf`, `security`, `build`, `artifact`, `e2e` — no colour maths, no corpus, no surface, no
dependency and no artefact changes here. F-102's `verification` list names `state` alone,
and the three extra gates above are run because source comments are edited, not because the
feature claims them.

## Risks and open questions

- **The proof mutates a state file the whole gate reads.** If interrupted mid-run, the tree
  is left with a planted link. Mitigated the way `verify-lockfile-proof.mjs` mitigates it —
  `finally` restore, verified restore, and a printed `git checkout` hint on failure.
- **Criterion 3 versus append-only history** — resolved above by decision, not by
  omission, and stated in the close-out rather than left for a reader to notice.
- No `OQ-*` bears on this.

## Out of scope

- **F-091's stale blocker.** Its note says `pnpm install` cannot run here on Node 22 /
  pnpm 9; F-105 established that is false. It is a wrong record in `feature_list.json` and
  it is *not* this feature — WIP is 1. It gets filed, not fixed.
- **The `@xmldom/xmldom` deprecation** F-105 flagged for a decision.
- Renumbering anything else, compacting the id space, or changing how ids are allocated.
- Rewriting `progress.md` or any historical plan.
