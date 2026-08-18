# ADR-0047 — Editorial identity is a roster id, and every record records its author

## Status

Accepted

## Date

2026-08-18

## Context

FR-68 and [`color-corpus-spec.md`](../content/color-corpus-spec.md) §5 both state the rule:

> **Author and reviewer must not be the same identity; enforced.**

It was not enforceable, for a simple reason nobody had noticed: **the entry schema has no
author field.** §1 records `verifiedBy` and `verifiedAt` and nothing about who wrote the entry.
A rule comparing two things cannot run when only one of them exists.

The obvious repair — add `authoredBy` as free text beside `verifiedBy` — produces a check that
looks like it works and does not:

```
authoredBy: "Ashish Ranjan"     verifiedBy: "A. Ranjan"      →  different strings, PASSES
authoredBy: "森 恵子"            verifiedBy: "Mori Keiko"      →  different strings, PASSES
```

The same person, twice, and the entry ships as reviewed. Worse, a **typo** in `verifiedBy`
satisfies the rule: any string that fails to equal the author's is treated as a second person.
The check fails *open* on exactly the input most likely to occur.

This matters more than a schema tidy-up because of what the reviewer is for. Per the content
rules the reviewer checks provenance completeness, derivation plausibility, translation quality
and classification correctness — the four things no automated gate can assess. If the identity
check can be satisfied by a typo, none of those four were checked and the corpus says they were.

## Decision

**`authoredBy` and `verifiedBy` are ids into `content/editors.json`, and both are required.**

```jsonc
"authoredBy": "ed-004",     // required at every status
"authoredAt": "2026-08-11", // required at every status
"verifiedBy": "ed-002",     // null before `verified`, required from `verified` onward
"verifiedAt": "2026-08-13"
```

```jsonc
// content/editors.json
[{ "id": "ed-001", "displayName": "…", "roles": ["author", "reviewer"], "active": true }]
```

The `content` gate then checks five things, each with its own message because each is a
different thing having gone wrong:

1. **An unknown id is a FAILURE**, not an unrecognised-therefore-different pass. This is the
   direction that matters: it is what stops a typo from satisfying the rule.
2. The two ids differ.
3. **The two ids do not name the same person** — `displayName` equality across different ids.
   This is the case free text would have passed, and it is why the mechanism exists at all.
4. The reviewer holds the `reviewer` role.
5. The reviewer is `active`.

`verifiedBy` must be **null** at `draft` and `review`, and non-null from `verified` onward. It
does not go through the `unknowns` mechanism (FR-21): the status already states why the field
is empty, and requiring an editor to write "not reviewed yet" beside `status: "draft"` would
make the reasons mechanical — at which point nobody reads any of them.

Two ids naming one person is **accepted at load** and rejected at use. Someone can legitimately
have two roster rows; the question that matters is whether *this* author and *this* reviewer
are the same human, and that is asked per record.

## Consequences

**Good.** The rule FR-68 always claimed is now actually enforced, and its most likely failure —
a typo, a transliteration, an initial — fails closed. Provenance gains an author, which the
spec was missing and which every downstream surface showing "who verified this" will also want
for "who wrote this" (FR-24). And the roster is a place to record roles and departure, so an
inactive editor cannot silently keep approving entries.

**Bad.** **Provenance is now less readable.** `"verifiedBy": "ed-002"` tells a person nothing
without a second lookup, where `"Mori Keiko"` told them something immediately. Every surface
that displays provenance must join against the roster, and every export must decide whether to
resolve ids or ship them — a real, recurring cost paid by every consumer, in exchange for a
check that runs.

**Bad, second.** The roster is now a required file with no owner process. Adding an editor is
an ordinary commit today; who may do that, and how a departure is recorded, is a governance
question this ADR does not answer and F-061 will have to.

**Bad, third — and it must not be glossed.** **This proves two distinct roster identities were
recorded. It does not prove a person read the entry.** The rule it enforces is a necessary
condition for review, not evidence of it. F-012 carries the real obligation as an attested
criterion ("a named reviewer per entry"), and gate 11 prints this limitation on every run so a
green gate is not mistaken for evidence of editorial diligence.

**Neutral.** This is an addition to `color-corpus-spec.md` §1, §5 and §8, made in F-011 and
recorded here because it adds a **required** field to a schema F-012, F-016 and F-061 build on.

**Neutral.** OQ-5 (the Japanese editorial reviewer engagement model) is unaffected and still
open. The roster is the mechanism; OQ-5 decides who goes in it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Free-text names on both fields** | No new file, immediately readable, no join on any surface. Rejected because the check then fails open on its most likely input: "A. Ranjan" ≠ "Ashish Ranjan" passes, and so does any typo. A check a typo can satisfy is not a check |
| **Normalise names before comparing** (case, whitespace, initials) | Keeps readability and catches the easy collisions. It cannot catch "森 恵子" vs "Mori Keiko", and every normalisation rule added is a new way for two genuinely different people to collide — failing in the *other* direction, which is worse |
| **Git commit authorship as the identity** | Free, already trustworthy, and impossible to typo. Rejected: the author of the commit is whoever ran `git commit`, not whoever did the editorial work, and a rebase or a squash rewrites it. It also cannot express a reviewer who approved without committing |
| **Email addresses as ids** | Naturally unique and human-readable — the best of both. They are personal data in a file we publish provenance from, and they change. `ed-001` is stable and says nothing about a person |
| **Leave `verifiedBy` free text and add `authoredBy` free text** | The smallest possible change, and it makes the spec self-consistent. It is the option that produces a rule which *reports* it is enforced while failing open — which is the specific dishonesty ADR-0007 and the whole provenance model exist to avoid |
