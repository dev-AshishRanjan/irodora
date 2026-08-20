# Plan: F-074 — Gate 0 catches an acceptance criterion that names a retired surface

| | |
|---|---|
| **Feature** | F-074 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `tests` — `scripts/verify-state.mjs` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

Make gate 0 read the **prose** in the state files, not only their structure. Today it proves
every requirement id resolves, every path exists and every link works — and it passed green for
nine months while F-017's contract said to build a Next.js app that
[ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
had retired.

To a reader: opening `feature_list.json` and finding a criterion there means the criterion
describes a system that exists.

## The evidence this is worth building

**Four defects of this class have been found by hand, and every one was missed at least once
by someone looking directly at the file.**

| Found | By | What it said |
|---|---|---|
| F-017's six criteria | claiming the feature | Next.js 16, Server Components, axe, `web-perf` |
| `docs/PRD.md` FR-20, FR-50 | the same sweep | "server-rendered and indexable" |
| **F-041** | the F-017 **evaluation** | "Tokens and keys in SecureStore" — there are no tokens |
| **PRD accessibility metric** | the same evaluation | "axe A/AA violations in the gate" |
| **F-018** | selecting the next feature | "The Atlas bundle contains no colour engine code" |
| **F-012** | checking why the corpus is empty | `openQuestions: [OQ-4]`, which the PRD records as **closed** |

The last two were found *after* a sweep that was specifically looking for this, and the
evaluator's two were found after I had declared the sweep complete. **A human reading carefully
missed three of six.** That is the argument.

## Approach

**Reused:** `scripts/verify-state.mjs` — its check registry, its failure formatting, and its
existing habit of naming the offending field. `gates.json` is read for the gate-id half.

**New:** one check in gate 0, plus a declared vocabulary with a reason per term.

### Where the banned vocabulary comes from, and why two mechanisms

- **Gate ids are DERIVED, never listed.** A criterion naming `web-perf` fails because
  `web-perf` is not in `gates.json`. Nothing has to be maintained: retire a gate and every
  criterion still naming it fails on the next run. This is the half that would have caught
  F-017 and F-038 with no human judgement at all.
- **Surface vocabulary is DECLARED**, because it cannot be derived — "tenant" is not a symbol
  anywhere, it is a word. Each entry cites the ADR that retired it, so the list is reviewable
  rather than a bag of strings, and the check prints the citation on a failure.

> The F-075 lesson applies and is deliberately honoured where it can be: read the source of
> truth rather than copying it. It can be honoured for gate ids and cannot for vocabulary, and
> the code says which is which.

### Increments

1. **The check, and its proof.** Add `retired-surface` to gate 0. Plant a phrase into a real
   feature, watch gate 0 go red naming the feature and the phrase, restore, watch it go green.
   → `node scripts/verify-state.mjs`
2. **Correct the survivors**, now that a check exists to keep them corrected: F-002's OpenAPI
   leg, F-038's `web-perf`, F-042's per-tenant keys, F-018's Atlas-bundle criterion, F-012's
   closed OQ-4. → `node scripts/verify-state.mjs`
3. **Record the missing dependency.** F-018 gains `blockedBy: F-012` — it cannot read a corpus
   bundle when `content/versions/index.json` is `[]`. This is not a vocabulary problem and the
   check will not catch it; it is recorded because it was found. → gate 0
4. **Close.** progress, notes, lesson.

## Files to touch

```
scripts/verify-state.mjs                      the check + its self-proof
.harness/verification/retired-surface.json    NEW — declared vocabulary, one ADR citation each
.harness/state/feature_list.json              F-002, F-012, F-018, F-038, F-042
docs/PRD.md                                   only if the check finds something there
```

## Anticipated effects

**No new effect link.** This adds a check over data that already exists; it introduces no
contract that something else depends on. The one thing it changes for others is that a
*future* retirement now has an obligation attached — retiring a gate or a surface means fixing
the criteria that name it in the same change, which is the intended cost.

Guard: the check proves itself by planting a violation, in the shape
`verify-gate-mirror.mjs` and `verify-contrast-proof.mjs` already use.

## Test plan

- **Positive:** the repository passes after the survivors are corrected. Asserted first, so the
  negatives below mean something.
- **Negative, each planted and restored:**
  - a criterion naming a gate id absent from `gates.json`;
  - a criterion naming a retired surface noun;
  - a PRD verification column naming one.
- **The decoy that keeps it honest:** a criterion that *mentions* a retired term while
  **forbidding** it must NOT fail — F-074's own criteria name `web-perf` and per-tenant keys,
  and so does ADR-0051. A check that cannot tell "we do not do this" from "we do this" would
  make its own feature unrepresentable, and would be switched off within a week.
- **Assertions to reject:** counting matches without asserting *which* (a check that fires on
  the wrong feature is not working); asserting the repository is clean without ever planting a
  violation, which cannot distinguish a working check from one that never fires.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Evidence: the planted phrase, gate 0's red output naming the feature and the phrase, and the
green run after restoring.

## Risks and open questions

**The vocabulary list is a maintenance burden and a false-positive risk.** Mitigated by the
allowlist mechanism above and by keeping the list short — every entry cites an ADR, so an entry
nobody can justify is visible as an entry with a weak citation.

**It reads prose, so it can only catch vocabulary.** F-018's missing `blockedBy: F-012` is the
same *class* of defect — state that does not describe reality — and no word-matcher finds it.
Said plainly in the check's own output so a green run is not read as "the state is true".

## Out of scope

Authoring corpus entries (F-012, blocked on OQ-5 — the roster holds one editor and the content
gate requires two distinct identities) · the Atlas (F-018) · any change to what the retired
surfaces were, which ADR-0051 decided and this only enforces.
