# Plan: F-130 — FR-34 names nine occasions and the content publishes five

| | |
|---|---|
| **Feature** | F-130 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-34 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `content` + `packages/recommendation` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-02 |

---

## Intent

FR-34 names **nine** occasions — office, casual, date, formal, interview, travel, street,
minimal, Japanese-inspired. The published weights carry **five** profiles (`default`, office,
casual, formal, japanese-inspired), `OCCASIONS` in the engine lists those same five, and
**nothing anywhere reports the gap**: the requirement and the list agree with each other and
both disagree with the PRD.

Done: a new published version carrying all ten profiles (the nine plus `default`), `OCCASIONS`
listing them, and a check that stops the two drifting apart again.

## The obstacle, and it is the whole design

`parseWeightContent` **requires every occasion in `OCCASIONS`**:

> *no weights for occasion "X". Every occasion the engine can be asked for must be published, or
> selecting it would fall back to something nobody chose.*

And gate 11 parses **every** published weight file, deliberately — *"An OLD version still has to
pass. A published version is immutable and the app may pin it."*

So widening `OCCASIONS` to ten makes `2026.08.1`, `.2` and `.3` fail to parse. Three immutable
files (ADR-0046), red gate, and nothing anyone is allowed to edit.

**This is the `outfit` field's problem again**, and its answer is the precedent: `outfit: null`
means *this version predates the feature*, stated explicitly, with `outfitWeights` throwing
rather than substituting.

### The decision (ADR-0084)

- **The parser stops requiring completeness** and requires instead: every occasion named is one
  `OCCASIONS` knows, none appears twice, and **`default` is present**.
- **`ruleSetFor` already refuses** an occasion the version does not carry, naming the version —
  *"falling back to default would report a ranking under a context nobody published."* That is
  where "refused rather than silently partial" actually lives, and it is unchanged.
- **A new gate-11 check requires the NEWEST published version to carry all ten.** A partial
  publish is refused going forward; published history stays parseable and pinned.

The completeness check does not disappear — it **moves** from every version to the current one,
which is the only version a new publish can be.

## What gets written

**`content/rules/weights.2026.08.4.json`** — `2026.08.3` with five occasion profiles added and
**everything else byte-identical**, which the content gate can assert the way `2026.08.3` asserted
it of `2026.08.2`.

Five profiles × four factors = **twenty weights and twenty rationales**, written to the standard
the file already sets:

> *No weight here is supported by a study… a rationale that read like a measurement would be
> worse than none.*

Each profile has to be a **defensible re-allocation of the same four numbers**, and each rationale
has to say what the reasoning was rather than what was observed. The five are chosen to be
genuinely distinct rather than five shades of "casual":

| occasion | the argument it rests on |
|---|---|
| `date` | one person's judgement in one room; personal fit is the point and contrast carries expressiveness |
| `interview` | the most conservative profile here — being unremarkable is the goal, so lightness and contrast dominate |
| `travel` | worn for many hours across changing light; temperature does least well under mixed illuminants |
| `street` | the only profile where chroma leads: a deliberate colour is the statement |
| `minimal` | near-neutral by definition, so lightness and contrast are all that is left to judge |

## Increments

| # | Step | Verified by |
|---|---|---|
| 1 | ADR-0084 and its index row | `state` |
| 2 | `weights.2026.08.4.json`, the ledger row, the digest | `content` |
| 3 | `OCCASIONS` to ten; the parser's rule changes; its tests | `test` |
| 4 | gate 11's newest-version check, with a decoy that must fail | `content` |
| 5 | regenerate `apps/mobile/src/rules/generated/weights.ts`; the coverage row | `test`, `state` |

## Files to touch

```
docs/adr/0084-…-the-newest-version-carries-every-occasion.md   — NEW, and its index row
content/rules/weights.2026.08.4.json                            — NEW. Ten profiles
content/rules/index.json                                        — the ledger row
packages/recommendation/src/weights.ts                          — OCCASIONS, the parser's rule
packages/recommendation/test/weights.test.ts                    — the new rule, both directions
scripts/verify-content.mjs                                      — the newest-version check
apps/mobile/src/rules/generated/weights.ts                      — regenerated
docs/REQUIREMENTS-COVERAGE.md                                   — FR-34's row
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-011 / the rules-are-content link** | A new published version, and a widened `OCCASIONS` | **`gate:content`**, plus the ledger digest |
| `OCCASIONS` → every consumer | Widening a union is additive for producers and **exhaustive for consumers**: a `Record<Occasion, …>` anywhere becomes a compile error | **`gate:typecheck`** — and that is the intended behaviour, not a problem |
| `WEIGHTS_TEXT` and the generated bundle | Regenerated; `WEIGHTS_LABEL` moves to `2026.08.4` | `gate:test`, `script:generate-rules-bundle.mjs` |
| ADR-0046's immutability | **Not violated, and this is the point** — nothing edits a published file; the parser learns that history is shorter | the ADR, and gate 11 still parsing every version |

**No new effect link expected.** If widening the union turns out to break a consumer in a way the
compiler cannot see, that is a link and it will be opened.

## Test plan

- **The parser:** a version carrying ten parses; one carrying five parses (history); one with an
  **unknown** occasion is refused; one with a **duplicate** is refused; one with **no `default`**
  is refused. The last is the new requirement and needs its own case, or "we still check
  something" is the only claim.
- **`ruleSetFor` refuses** an occasion a version lacks, naming the version — the existing case,
  which now carries the weight the parser's check used to.
- **Gate 11's new check:** the newest version must carry all ten. **Its decoy is a spoiled copy
  missing one**, required to fail, alongside the real file required to pass — the pattern the
  four existing spoiled-copy cases already use.
- **The content:** twenty new weights each summing to 1 per occasion (the engine's own validator
  runs per occasion at parse), twenty rationales over the minimum length, and every profile
  distinct from `default` — a "new" occasion that is a copy of an existing one is a profile
  nobody needs.
- **Mutation, precondition first:** drop an occasion from the new file, widen the parser to
  accept an unknown, and remove the newest-version check; each must go red.
- **Not applicable:** `a11y`, `contrast` — no surface. `e2e` — gate 7, F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm build
```

## Risks and open questions

- **No `OQ-*`.**
- **Twenty rationales are editorial work by a non-editor**, like every rationale in the file
  before them. `authoredBy`/`verifiedBy` are the same roster id and `reviewIndependence` is
  `self` — ADR-0060's declared position, not an oversight, and the count of self-reviewed
  content grows by five profiles.
- **Weakening the parser's completeness check is the risk of this feature.** It is mitigated by
  moving the check rather than deleting it, and by `ruleSetFor`'s throw being the thing that
  actually protects a reader. If the gate-11 check is ever removed, the drift this feature fixes
  comes straight back — which is why its decoy is named in the criteria.
- **No screen selects an occasion yet.** Five more profiles reach no surface today, which is the
  `a-generated-value-with-no-consumer` shape — mitigated only in that FR-34's own criterion is
  about the weights being content and versioned, and the outfit builder's occasion selector is a
  separate piece of work.

## Out of scope

- **A screen for choosing an occasion.** Not filed here: `scoreColor` takes a `RuleSet` and the
  outfit builder would need a selector, which is a surface feature against FR-33 rather than
  FR-34.
- **Weather profiles for the new occasions.** The weather block is over outfit components, not
  over occasions (F-065's own argument), so it does not multiply.
