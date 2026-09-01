---
kind: effect
id: E-047
title: A rule is a source, and scope files are written from it — so a false rule supplies plausible, unbuildable requirements
severity: high
created: 2026-09-01
scope: [.harness/rules, .harness/state, docs/architecture]
links: [[a-green-gate-says-the-code-works-not-that-it-is-where-the-record-says]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]]
---

# E-047 — a rule is a source, and scope files are written from it

**A rules file is not a description. It is a source.** Somebody planning a feature reads
`.harness/rules/security/security.md` and writes acceptance criteria from it. A false sentence
in a rule therefore does not stay in that file — it is **copied, in good faith, into the scope
of work that has not been done yet.**

## This is evidenced, not hypothesised

`security.md` said *"decoding happens only in the worker, never in the API process"* nine months
after [ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
removed both.

F-042 was planned from it. Its criterion 4 read:

> *EXIF stripped on ingest; images decoded only in the worker under hard limits*

**A criterion nobody could satisfy, in a feature that shipped.** What actually shipped decodes
on the device under a byte cap and a pixel cap read from the image header — the criterion's
intent, reached by ignoring its letter.

F-107 **corrected** that criterion rather than marking it, and the distinction is the rule for
this whole class: it did not name the worker in order to forbid it, it *asked for* it.

## The moment the vocabulary widened, the check found it

F-107 added the server-tier terms, and gate 0 immediately flagged `F-042.acceptance[3]` — a
criterion in `feature_list.json`, which had been in the scan's corpus all along, **in words the
corpus did not know**.

That is the shape of this link in one observation: *the check was looking in the right place for
the wrong words.*

## What it means for any rule change

A rule that stops being true does not merely become stale prose. It becomes **a supply of
plausible, unbuildable requirements**, and the features planned from it carry the error past
every gate — because a criterion is a string, and a well-formed string describing a system that
does not exist is precisely what the retired-surface check exists for.

## The direction is one-way

```
rules  →  criteria        somebody plans from a rule
criteria → rules          never
```

So **correcting a criterion does not correct the rule it came from.** A fix at the `to` end
leaves the source intact, to be copied again by the next person who plans from it. F-042 fixed
its own documentation and the rule stayed wrong for another five features.

## Guard, and the gap in it

`gate:state`'s retired-surface check, which since F-107 reads `docs/architecture` and `docs/adr`
and knows the server-tier vocabulary. Proven by `scripts/verify-retired-docs-proof.mjs` — nine
cases, including the superseded filter watched **both ways on the same file**, differing only in
its status line.

**The guard does not cover the source.** `.harness/rules` is not in the scan corpus — that is
[F-112](../../state/feature_list.json) — so the file at the `from` end of this link is the one
place the check still cannot see. Stated here rather than implied, because a link whose guard
misses its own source is worth knowing about before you rely on it.
