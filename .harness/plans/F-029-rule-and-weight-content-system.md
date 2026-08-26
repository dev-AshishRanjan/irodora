# Plan: F-029 — Rule and weight content system

| | |
|---|---|
| **Feature** | F-029 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-34, FR-67 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `content/` · `@irodora/recommendation` · `scripts/` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

The numbers that decide what the product recommends stop being a fixture in a test file and
become **published, versioned, immutable content with a rationale on every weight** — and five
occasion contexts that weight the same four factors differently.

This closes **[E-009](../state/effects.json)**, the graph's longest-standing `guard: none`:
*"weights are content, so a publish changes what every user is told with no code change… a
weight set that fails to normalise produces scores that are not comparable across contexts and
fails silently."*

## Approach

### One definition of "these weights are valid"

F-028 already owns it. `parseRuleSet` refuses weights that do not sum to 1 — that is criterion 3
("validated at publish time") **already implemented**, and re-writing it in `@irodora/corpus`
beside `parsePhraseLexicon` would be a second definition of a rule in a second language, which
is exactly the shape [E-013](../state/effects.json) exists to keep to one place.

So the content parser lives in `@irodora/recommendation` and **wraps** `parseRuleSet`: it
validates the editorial envelope — version, provenance, a rationale per weight, the occasion
set — and hands each occasion's block to the engine's own validator. The content gate loads that
package the way it already loads `@irodora/corpus`.

### The file, following the lexicon exactly

```
content/rules/weights.2026.08.1.json      the immutable weight sets
content/rules/index.json                   the ledger row that vouches for it
```

Same shape as `phrase-lexicon.2026.08.1.json`: `versionId`, `publishedAt`, a full `provenance`
block, and the payload. The digest lives in the **ledger**, never in the file it describes —
a record checked against a checksum it carries verifies itself.

### Occasions are weighting profiles, not a second mechanism

FR-34 asks for occasion contexts as *"deterministic weighting profiles"*. So an occasion **is a
named weight set** over the same four factors, and `default` is one of them. Nothing in the
engine changes: `scoreColor` already takes a `RuleSet`, and choosing an occasion is choosing
which one to pass.

That is the whole design, and it is why FR-34 costs almost nothing here: the alternative — an
occasion as a modifier applied *after* scoring — would put a second set of numbers between the
weights and the answer, and the weights would stop being the thing that decides.

### "With no code change" is the claim, and it is the one FR-67 makes

F-029's own criterion says *"with no deployment"*, and **ADR-0011 predates
[ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)**: it
describes publication "through the admin application", of which there is none. In a local-first
app new content ships in a new build, so "no deployment" cannot be literally true and pretending
otherwise would be the [[prose-in-a-state-file-rots-and-no-schema-can-see-it]] shape.

FR-67's own wording is the surviving one — ***"changing a weight changes rankings without a code
change"*** — and it is exactly checkable: two published weight sets, one unchanged engine,
different rankings. ADR-0011 gets a note recording what ADR-0051 removed and what survives.

**Reused:** `parseRuleSet` and `scoreColor` (F-028), `entryDigest`/`sha256` and the ledger
convention from the lexicon, `readJsonFile`/`readJsonDir` in `corpus-io.mjs`, the content gate's
fixture discipline.

**New:** `weights.ts` in the engine (`parseWeightContent`, `ruleSetFor`), the content file, the
ledger row, a `loadRecommendationPackage` beside `loadCorpusPackage`, a gate-11 section, and
fixtures the gate runs its own rules against on every run.

**Increments:** the parser and its tests → the content file and its ledger row → the gate
section and fixtures → E-009 resolved, docs, progress.

## Files to touch

```
packages/recommendation/src/weights.ts    — NEW. The content envelope, wrapping parseRuleSet
packages/recommendation/src/index.ts      — export it
packages/recommendation/test/weights.test.ts — NEW
content/rules/weights.2026.08.1.json      — NEW. Five occasions, a rationale per weight
content/rules/index.json                  — the ledger row
scripts/corpus-io.mjs                     — loadRecommendationPackage, beside its sibling
scripts/verify-content.mjs                — the gate section, and its fixtures
packages/testing/fixtures/…               — a valid and several invalid weight files
docs/adr/0011-…                           — what ADR-0051 removed, and what survives
.harness/state/effects.json + memory      — E-009 gains a guard and resolves
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **`content/rules` gains a second kind** | `@irodora/recommendation`, the ledger, gate 11 | **E-009 — this is what closes it.** `gate:content` parses every published weight set through the engine's own validator |
| The engine gains a **content** entry point | F-030, which will pass an occasion's rule set to `scoreColor` | `gate:typecheck` + the engine's tests |
| A **new ledger kind** | `index.json` is now read by two checks that must not disagree about it | `gate:content`, which reads the row by `kind` rather than by position |
| The weights become the **poles' home** | [E-032](../state/effects.json) — the app's duplicate becomes a literal the content has moved past | Still `guard: none`; F-099 |

## Test plan

- **Unit:** the envelope — a missing rationale, an empty rationale, an unknown occasion, a
  duplicate occasion, a missing `default`, a bad version — each **watched failing**, with the
  valid file asserted green in the same table.
- **Criterion 2 with a decoy:** a weight without a rationale is refused; **and** the same file
  with the rationale present parses, so "rationale is required" is distinguishable from "this
  file never parses".
- **Criterion 4:** two occasions with different weights produce **different rankings** over the
  same colours through an **unchanged** engine — the assertion FR-67 actually makes.
- **Criterion 1:** the published file's digest matches the ledger; a mutated byte fails.
- **Gate 11:** the section runs its rules against fixtures on every run, so the count of rules
  exercised cannot silently fall to zero.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
pnpm test:content
```

**Known red and pre-existing:** `test` on `color-difference` and `color-spaces` (Node-22 ULP,
F-083). Neither may be reported as green.

## Risks and open questions

- **The weights are editorial numbers and nobody editorial has set them.** They are Irodora's
  own first draft, and the provenance block has to say that in its own words — `sourceType:
  editorial`, `reviewIndependence: self`, the same standing gap as the corpus (ADR-0060, OQ-5).
  A rationale that reads like a measurement would be worse than no rationale.
- **ADR-0011 describes a server tier that no longer exists.** Noting it is in scope; rewriting
  the decision is not.
- **Nothing consumes the occasions yet.** F-030 does, and it is what this unblocks.

## Out of scope

Harmony rules between families (ADR-0011's `harmony_rule` — F-030/F-031 territory) · the outfit
engine · storing an envelope · a publishing UI, which ADR-0051 removed the tier for · changing
`scoreColor`.
