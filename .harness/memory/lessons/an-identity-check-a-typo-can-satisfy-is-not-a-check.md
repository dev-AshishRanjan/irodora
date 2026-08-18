---
kind: lesson
title: An identity check that a typo can satisfy is not a check — compare ids, not names
category: convention
confidence: 1.0
created: 2026-08-18
scope: [content, packages/corpus, apps/admin]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[the-entry-schema-is-a-contract-with-every-authored-file]]
---

# An identity check that a typo can satisfy is not a check

**Any rule of the form "these two people must be different" fails open when the two are
strings.**

```
authoredBy: "Ashish Ranjan"   verifiedBy: "A. Ranjan"    →  different, PASSES
authoredBy: "森 恵子"          verifiedBy: "Mori Keiko"    →  different, PASSES
authoredBy: "ed-001"          verifiedBy: "ed-oo1"        →  different, PASSES
```

Every one of those is one person, and the third is a typo. The check reports that review
happened; nobody reviewed anything.

Note the direction. The rule's *strictness* is what makes it dangerous: because it demands
difference, **any corruption of either value satisfies it**. A rule demanding equality fails
closed on a typo and someone fixes it. This one fails open and nothing happens.

## The fix, and the part of it that is easy to leave out

Compare **ids from a roster**, and — this is the half people skip —

**an unknown id must be a FAILURE, not a third person.**

That is the whole mechanism. Resolving `"ed-oo1"` against the roster and finding nothing has to
stop the build. If an unresolvable id is treated as "well, it is certainly not the author",
switching from names to ids has bought nothing at all.

Then four checks, not one, because they are four different things having gone wrong and the
editor needs to know which:

1. an id that is not in the roster;
2. the same id twice;
3. **two different ids carrying the same display name** — the case the id scheme exists for;
4. the reviewer not holding the reviewer role, or being inactive.

## Testing it needs a decoy that is a real collision

A roster of distinct people cannot fail case 3, so a test written against one proves nothing
[[a-decoy-that-is-not-broken-proves-nothing]]. The fixture roster deliberately contains **two
ids for the same human**, and both the unit test and gate 11's mutation proof point the
reviewer at the twin. If that case ever goes green, ADR-0047's entire justification is gone.

## What it does not prove, and say so out loud

Two distinct roster identities were **recorded**. Not that either person read anything.

This is a necessary condition for review, not evidence of it — and the gap is not closable by
any check in a repository. Gate 11 prints the limitation on every run, and F-012 carries the
real obligation as an attested criterion. Letting a green gate stand in for editorial diligence
is the same class of dishonesty as a colour value with no provenance.
