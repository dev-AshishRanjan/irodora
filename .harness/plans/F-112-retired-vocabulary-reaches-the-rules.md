# Plan: F-112 — The retired-vocabulary scan reaches the rules files

| | |
|---|---|
| **Feature** | F-112 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` — `scripts/verify-state.mjs` and `.harness/rules/` |
| **Author** | Claude Code (generator role) |
| **Date** | 2026-09-01 |

---

## Written late, and that is recorded rather than hidden

**Gate 0 caught this file's absence after the zone was widened and the six findings were
corrected.** Plan-before-code is a golden rule and the `state` gate enforces it; I claimed the
feature, set its `plan` field and went straight to the edits.

So for the zone widening and the six corrections, this document is a **description**, not a
plan — which is exactly the distinction the plan-feature skill draws, and pretending otherwise
would make the artefact that says what was intended into one that says what happened. What
follows is honest about which parts it directed: the proof case and criterion 3 were not yet
written when this was, and everything above them was.

The one thing worth taking from the slip: the feature was *fully specified in its own filing
notes* — the zones, the eleven findings, the file and line of each — and that is what made
skipping the plan feel free. A plan whose content already exists somewhere is still the place
the effects and the test approach get thought about, and neither had been.

## Intent

A rules file is read as **binding**. `docs/architecture` and `docs/adr` have been scanned for
retired vocabulary since F-107; `.harness/rules` has not, so a rule can name a surface that no
longer exists and nothing says so.

Done: the scan covers `.harness/rules`, every finding there is corrected or marked, and a rules
file that regains a retired surface turns gate 0 red rather than being caught by somebody
reading.

## Why it matters more than the documents do

**The propagation is not hypothetical.** F-107's filing notes record it: F-042's fourth
acceptance criterion — *"images decoded only in the worker under hard limits"* — was written
**from** `security.md`, so rot in a rules file had already reached a scope file once, and the
widened vocabulary caught that criterion the moment it existed.

F-107 fixed `security.md` by hand and left no guard behind it, because its own criteria named
two zones and the definition of done says exactly, no more and no less. This is the guard.

## Approach

**Reused entirely.** The vocabulary, the `retired-ok:` marker, the historical-ADR filter and the
failure reporting all exist in `verify-state.mjs`. The change is one entry in a zone list.

| # | Step | State |
|---|---|---|
| 1 | Add `.harness/rules` to the zone list, and watch it fail | **done before this plan** — six findings, in five files |
| 2 | Correct or mark each finding | **done before this plan** |
| 3 | A proof case, so the scan is watched failing on a planted instance | directed by this plan |
| 4 | `privacy-design.md` §8, which the vocabulary cannot see | directed by this plan |

### What was corrected, and what was marked

Five corrected, one marked — and the ratio is the point. A marker is for a sentence that names
the retired thing **in order to deny it**; everything else is rot to rewrite.

| Finding | Decision |
|---|---|
| `git.md:90` — commit the generated `openapi.json` | **corrected** — there is no such file; the generated artefacts that do need reviewing are the bundles, the tokens and the font subset |
| `testing.md:115` — *"Assert axe on every route"* | **corrected** — `axe` is a browser tool and there is no browser; accessibility is asserted by the conformance suite, which is what gate 8 runs |
| `privacy.md:89` — a consent table with a Cloud sync row | **corrected** — also Analytics and Marketing email, each of which needed a server and an account to be about. A consent row for a capability the product does not have describes a choice nobody is offered |
| `privacy.md:114` — *"our server could decrypt synced wardrobe images. **There is no server.**"* | **marked** — a correct sentence naming the retired thing to deny it. Rewriting it to avoid the word would delete the history that explains why the rule outlived its original reason |
| `typescript.md:63–64` — Zod generating an OpenAPI document, citing superseded ADR-0012 | **corrected** — two uses, not three, citing ADR-0051. `@irodora/contracts` already says this in its own header; this file was the copy that had not moved |

**The marker must be on the same line as the term.** The scan splits on newlines, so a marker on
the following line exempts the following line. Found by running it, not by reading the script.

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **Gate 0** | A third zone means more subjects. The risk is not a false positive — those are loud — but a zone that matches nothing because the path is wrong | the gate, run before and after; and it was watched failing on six real findings, which is the evidence the zone resolves |
| `.harness/rules/**` | Five rules files change. **None of them changes a rule** — each rewrite describes the surface that exists in place of one that does not | reading, and the scan itself for the vocabulary half |
| F-042's criterion 4 | Already corrected by F-107. Named here because it is the reason this feature exists | the same scan, over criteria |

**No effect link is warranted.** No shared contract moves.

## Test plan

- **The gate is the test**, run in three states: before the zone (green, `.harness/rules`
  invisible), after the zone and before the corrections (**red**, six findings named with file
  and line), and after (green). The middle state was observed.
- **A proof case** in `verify-retired-docs-proof.mjs`: plant a retired term into a rules file in
  memory and assert the scan names it, with the decoy being the same file unplanted. Criterion 1
  says *watched failing on a planted instance*, and a zone that silently matched nothing would
  otherwise pass every case above by having no findings at all.
- **Criterion 3 is the proof case**, restated: a rules file that regains a retired surface must
  fail gate 0. That is what the plant asserts.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-retired-docs-proof.mjs
pnpm lint && pnpm format:check
```

**Will not run:** `test`, `build`, `a11y`, `contrast`, `content`, `e2e`, `color-golden`, `cvd`,
`perf` — no source, no content and no screen changes. They are run anyway because the repository
is one workspace and a green tree is the clean-state condition, not because this touches them.

## Risks and open questions

- **No `OQ-*`.**
- **The marker is an escape hatch and it stays rare.** One use in this change, against five
  corrections. A file where the marker outnumbers the rewrites is a file nobody rewrote.
- **`privacy-design.md` §8 is invisible to the vocabulary** — *sub-processor*, *in-region* and
  *transfer* are not terms, and adding them would be adding words to a shared list to catch one
  paragraph. It is corrected here because F-107 found it, left it, and recorded it in this
  feature's own filing notes; fixing it a third session later would be the thing golden rule 5
  exists to prevent.

## Out of scope

- **Adding terms to the vocabulary.** The list is shared with the criteria scan, and a term
  added to catch one paragraph would be evaluated against every acceptance criterion in the
  repository.
- **The other rules files.** Only what the scan raises, plus the one paragraph named above.
- **Changing any rule.** Every rewrite here describes the surface that exists; none of them
  changes what is required.
