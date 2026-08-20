---
kind: lesson
title: Prose in a state file rots, and no schema can see it — the string stays well-formed while its subject disappears
category: convention
confidence: 1.0
created: 2026-08-20
scope: [root, .harness/state, docs]
links: [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[a-ci-step-guarded-by-an-if-is-invisible-to-the-mirror-check]], [[a-decoy-written-against-old-values-quietly-stops-discriminating]]
---

# Prose in a state file rots, and no schema can see it

**A schema checks that a field is a string. It cannot check that the string still describes
something that exists.** So a machine-checked state file can be structurally perfect and
factually false at the same time, and every gate will agree it is fine.

## Where it came from

F-017 was claimed nine months after ADR-0051 retired the web surface and four features after
`apps/mobile` shipped. Its acceptance criteria — the *contract*, the thing the implementer
builds against — said:

```
Next.js 16 App Router, React 19, Tailwind v4 ... Radix primitives
Server Components by default; the colour engine loads only on routes that use it
Zero axe WCAG 2.2 A/AA violations on every route
Gates 8 (a11y) and 13 (web-perf) activate
```

There is no web surface. There is no `web-perf` gate in `gates.json`. axe needs a DOM the
product no longer has. **Implementing the feature as specified would have built the wrong
product**, and the only thing standing between that and a commit was someone reading the
criteria and noticing.

Gate 0 was green the entire time, and it was not being lax. It validates both state files
against their schemas, checks that every requirement id resolves in both directions, that every
path exists, that the ADR index matches the files, that the CI workflow mirrors the active
gates, and that 233 governed documents' relative links resolve. Every one of those passed —
because `"Next.js 16 App Router..."` is a perfectly good string in a perfectly good array.

The rot was also wider than the file that was noticed. `docs/PRD.md` had been **half** swept
after the same rehaul: FR-58 was rewritten and even says *"with no server, this is the entire
durability story"*, while FR-20 four screens above it still said *"server-rendered and
indexable"*. A half-finished sweep is more dangerous than an untouched one, because the parts
that were updated make the file look current.

## Why the usual defences do not fire

- **Schema validation** sees a string where a string belongs.
- **Link checking** only sees rot that happens to be spelled as a path.
- **Referential integrity** (does `FR-20` exist?) passes, because the id is fine — it is the
  *sentence* that is wrong.
- **Tests** never read the prose at all.
- **Code review** catches it only in the commit that makes it stale, and that commit is usually
  a large retirement where a feature list two directories away is not what anyone is looking at.

## What to do about it

1. **When a decision retires a technology, grep the state files for its vocabulary in the same
   change.** The ADR is the cheapest moment; every later moment costs someone a rediscovery.
2. **Give the state gate a vocabulary check.** Maintain a list of retired terms — route names,
   removed stores, gate ids absent from `gates.json`, retired architectural nouns — and fail on
   them, naming the feature and the phrase. A gate id that is not in `gates.json` is the easy
   case and should never have needed a human.
3. **Prefer criteria that name a check over criteria that name a technology.** *"a missing
   translation fails the build"* survives a stack change; *"Next.js 16 App Router"* does not.
   The first is still true after ADR-0051; the second became a trap.
4. **Treat a half-swept document as unswept.** If two requirements in one table disagree about
   whether a server exists, the table has not been reviewed — it has been edited.

## The general shape

Ask, of any machine-checked file: *what does the checker read, and what does it merely carry?*
Whatever it merely carries is unmaintained, and the more rigorous the checking of everything
else, the more confidently people will trust the part nobody checks.
