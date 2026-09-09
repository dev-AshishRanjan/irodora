# Plan: F-196 — Curated combinations, in the corpus, as ours

| | |
|---|---|
| **Feature** | F-196 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-73, NFR-20 |
| **Service** | `content` (with `packages/corpus`, `packages/contracts`, `apps/mobile`) |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

F-194 ships **generated** combinations — geometry, twelve relationships, labelled `Generated`
because *"a relationship computed from geometry and one recorded by a curator are different
claims, and F-196 adds the second"*. This is that second claim.

The reference is *A Dictionary of Color Combinations*. **We do what the book does, from our own
corpus.** We do not ingest anyone's digitisation of it — `content/AGENTS.md` §2 is absolute, and
its reasoning is that the digitiser's choices about printing, paper ageing and illuminant **are**
the dataset.

## A combination is not a palette, and the schema has to say why

The corpus already has palettes: 5–8 colours, an `anchor`, ranks and weights, meaning *these
belong to one family*. A combination is a different claim — **2 to 4 colours meant to be worn or
used together** — and giving it its own record type rather than a `category` on palettes is what
keeps the two from being confused by every consumer downstream.

```
palette      family        5–8   anchor + weights      "these belong together"
combination  pairing       2–4   lead + companions     "these go together"
```

The role vocabulary is `lead` and `companion`, which is the vocabulary F-195's slots already
think in — a lead is what you are holding.

## Criterion 2 goes in the type, not in a review

**A combination can never be `historical` or `traditional`.** Not "should not" — the parser
refuses it. `OUR_OWN_CURATION` already exists for exactly this and is already load-bearing for
entries; a combination is our editorial work by construction, so the constraint is unconditional
here rather than conditional on `sourceType`.

## Criterion 3, and what a gate can honestly enforce

*"No third-party combination dataset is ingested, and the content gate is what enforces it."*

No gate can detect ingestion in general — somebody who transcribes a table by hand leaves no
trace a scanner can see. What the gate **can** enforce, and will:

- every combination is `sourceType: editorial`, `rightsHolder: Irodora`
- every combination's `classification` is in `OUR_OWN_CURATION`
- every member slug resolves **to our own corpus**, so a combination cannot name a colour we did
  not publish
- `provenance.source` still resolves against the source register, which already refuses anything
  unregistered

**What is not guarded gets stated on every run**, the way `verify-reachability` states its
over-approximation. A gate that implies more than it checks is worse than one that says its
scope.

## Criterion 4 is false as written, and ADR-0060 is why

> *"Author and reviewer are different identities, as they are for every other corpus record."*

**All 125 existing corpus records are `reviewIndependence: "self"`, `ed-001 → ed-001.`** There is
one editor identity in this project. [ADR-0060](../../docs/adr/0060-one-editor-and-self-review-is-declared-rather-than-assumed.md)
decided this deliberately, and `content/AGENTS.md` states the enforcement runs **in both
directions**: `"self"` *requires* author and reviewer to be the same id, and **two ids naming one
person still fails**.

So satisfying the criterion as written would require fabricating a second editor — which is the
precise thing the rule exists to prevent.

**The criterion is amended** to what the repository actually requires: independence is *declared,
never defaulted*, and `self` is what an honest entry records while there is one editor. The
amendment is recorded with the feature. Getting a genuine second reviewer is a real-world action
outside this repository, and it is surfaced rather than simulated.

## Publishing a new corpus version

Adding a record type changes the bundle, and `content/versions/2026.08.1.json` is **published and
immutable** — `generate-corpus.mjs` refuses to overwrite it, correctly. So this publishes
**2026.09.1**: the same 120 entries and 5 palettes, unchanged, plus the combinations.

## Files to touch

```
packages/corpus/src/combination.ts          — new. The schema.
packages/corpus/src/version.ts              — the bundle carries combinations; root digest namespaces them
packages/corpus/src/load.ts                 — parsed and digest-verified on the device
packages/corpus/src/index.ts                — exported
packages/contracts/src/combination.ts       — new. The Zod boundary schema.
scripts/corpus-io.mjs                       — read content/combinations/
scripts/generate-corpus.mjs                 — publish them
scripts/verify-content.mjs                  — criterion 3's checks, with their scope stated
scripts/verify-content-proof.mjs            — a decoy per check
content/combinations/*.json                 — the records
content/versions/2026.09.1.json             — new published version
content/versions/index.json                 — its ledger row
apps/mobile/src/corpus/index.ts             — combinationsFor(slug)
apps/mobile/src/screens/Combinations.tsx    — curated ones, labelled curated
apps/mobile/src/i18n/{en,ja}.ts             — the curated label
.harness/verification/unused-packages.json  — @irodora/contracts' entry retires
```

## Test plan

- **Schema, with decoys:** a combination with no lead, with two leads, with one colour, with five,
  with a repeated slug, with a rank gap, and with `classification: historical` — each refused, and
  each refusal asserted separately so a parser that rejected everything would fail the positive
  case.
- **The gate's own proof:** `verify-content-proof.mjs` plants a violating record per rule and
  watches each one fire. A rule nobody has seen fail is configuration that parses.
- **Bundle integrity:** a tampered combination in a published bundle must fail the digest check,
  the same way a tampered `hex` does — the test that found the original hole.
- **Round trip:** the published bundle loads back into the same records.

## Verification

`state · typecheck · lint · format · test · content · build`.

## Risks

- **Nobody has looked at a curated combination.** Whether these read as considered or arbitrary
  is the editorial judgement, and it is the whole value of the record type. Attested.
- **The corpus is 120 historical Japanese colours.** Combinations drawn from it are constrained by
  what is in it, and that constraint should be visible rather than papered over.

## Out of scope

The screen's naming and the other entry points (F-197), CVD and profile weighting (F-198), the
hand-off onward (F-199). The number of combinations is deliberately small: this feature is the
record type and its guarantees, not a content drive.
