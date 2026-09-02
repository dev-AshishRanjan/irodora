# ADR-0084 — Occasion completeness is required of the newest published version, not of every one

## Status

**Accepted**

## Date

2026-09-02

## Context

**FR-34 names nine occasions.** The published weights carry five profiles, `OCCASIONS` in
`@irodora/recommendation` lists the same five, and nothing reports the gap: the engine and the
content agree with each other and both disagree with the requirement. F-130 exists to close it.

The obstacle is a rule that was right when it was written. `parseWeightContent` requires **every
occasion in `OCCASIONS`**, with a good reason:

> *no weights for occasion "X". Every occasion the engine can be asked for must be published, or
> selecting it would fall back to something nobody chose.*

And gate 11 parses **every** published weight file, also deliberately:

> *An OLD version still has to pass. A published version is immutable and the app may pin it, so
> a file nobody checks any more is a file nobody would notice going wrong.*

Those two are fine together while `OCCASIONS` never grows. **Widening it to ten makes
`weights.2026.08.1`, `.2` and `.3` fail to parse** — three files [ADR-0046](0046-published-corpus-is-an-immutable-generated-bundle.md)
forbids editing, a red gate, and no legal fix.

There is a precedent in the same file. `WeightContent.outfit` is nullable, and its comment says
exactly why:

> *`weights.2026.08.1.json` is published and immutable — making this field required would stop it
> parsing, and gate 11 would go red on a file nobody is allowed to edit. `null` means exactly one
> thing here: this version predates the feature.*

## Decision

**Completeness moves rather than disappearing.**

1. **The parser requires** that every occasion named is one `OCCASIONS` knows, that none appears
   twice, and that **`default` is present**. It no longer requires the whole set.
2. **`ruleSetFor` refuses** an occasion the version does not carry, naming the version — which it
   already did, and which is where the guarantee actually lives:
   *"falling back to default would report a ranking under a context nobody published."*
3. **Gate 11 requires the newest published version to carry every occasion in `OCCASIONS`.** A
   partial publish is refused going forward; published history stays parseable.

An occasion missing from an old version means *this version predates that occasion*, in exactly
the sense `outfit: null` already means *this version predates outfit scoring*.

## Consequences

**Good** — the requirement, the engine's list and the current content can be held together by a
check, which is what F-130 found was missing. Immutable history stays parseable and pinnable, so
the guarantee ADR-0046 makes is not quietly traded away for a schema change. And the protection
against a silent fallback is unchanged: `ruleSetFor` threw before this ADR and throws after it.

**Bad** — **the parser is weaker than it was.** A file carrying only `default` now parses, and it
is gate 11 rather than the type that says such a file may not be published. That is a check in a
script instead of a check in a parser, and a script can be edited by someone who does not know
why it exists — which is what its decoy and this ADR are for.

It also means **two places must agree**: `OCCASIONS` and the newest published file. They are held
together by one check, and if that check is removed the drift F-130 fixed returns immediately and
silently. The check's own decoy — a spoiled copy missing one occasion, required to fail — is
therefore part of the decision rather than a detail of it.

**Neutral** — widening `OCCASIONS` is additive for producers and exhaustive for consumers: any
`Record<Occasion, …>` becomes a compile error until it handles the new members. That is the
intended behaviour of the union and the reason it is closed.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep the parser strict and republish the old versions** | Simplest to reason about, and it is what a fresh repository would do. It edits three immutable published files, which is precisely the thing ADR-0046 exists to prevent — and the ledger digests would have to be rewritten to match, which is the same violation with a second step. |
| **Keep the parser strict and delete the old versions** | Also fixes the parse failure. A published version the app may pin is not ours to withdraw, and gate 11's own comment says why a file nobody checks is a file nobody notices going wrong. |
| **A `minimumOccasions` field in each file** | Self-describing, and it puts the schema's history inside the data where a reader finds it. It also lets a new file declare a small set and pass — the check would then verify a file against its own claim, which is not a constraint. |
| **Version-gate the completeness rule by `versionId`** | Keeps the parser strict for anything after `2026.08.3`. The parser would then contain a date-shaped conditional that grows an entry every time the set changes, and the reason for each would live in git rather than anywhere a reader looks. |
| **Leave `OCCASIONS` at five and record FR-34 as partially covered** | Honest, cheap, and it was the state F-130 was filed against. The requirement is R3 and the content is the deliverable — recording the gap a second time is not the same as closing it. |

## Revisit when

**When a second content set needs the same treatment.** The lexicon has one version and a
corpus publish is a bundle rather than a profile list; if either grows a closed union that
history cannot satisfy, the shape here should become a stated pattern rather than a second
one-off.

**If gate 11's newest-version check is ever proposed for removal.** It is the only thing holding
`OCCASIONS` and the published content together, and this ADR is the record of what happens
without it.
