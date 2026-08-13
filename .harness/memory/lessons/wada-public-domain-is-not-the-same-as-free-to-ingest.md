---
kind: lesson
title: "Wada is public domain" is not the same statement as "this dataset is free to ingest"
category: convention
confidence: 0.85
created: 2026-08-13
scope: [content]
links: [[provenance-in-the-type-is-what-makes-honesty-structural]]
---

# "Wada is public domain" ≠ "this dataset is free to ingest"

Sanzo Wada's *Haishoku Sōkan* (配色総鑑, 1933–34) will be proposed as a corpus source,
repeatedly, because it is the canonical historical work on Japanese colour combination and
because "it's public domain" is easy to say.

## What is credible

| Claim | Confidence | Basis |
|---|---|---|
| Wada died in 1967 | High | Well documented |
| The 1933–34 originals are PD **in Japan** | Moderate–high | Term was life + 50; that elapsed end of 2017, before the 2018 extension to life + 70, which was **not retroactive** |
| **US status** | **Unresolved** | URAA restoration plausibly applies to a work under copyright in its source country on 1 Jan 1996 — which this was — giving 95 years from publication |
| The 2011 Seigensha edition is in copyright | High | A modern edition is a new work |
| Modern digitisations carry their own rights | High | Measurement, correction and selection are creative decisions |

## The distinction that matters

**Almost every accessible Wada dataset is a modern digitisation.**

The digitiser chose which printing to work from, how to correct for paper ageing, what
illuminant to assume, and which values to publish. **Those choices are the dataset.** The
underlying work being public domain says nothing about them.

## Our position

**Wada is inspiration, not ingestion**
([ADR-0007](../../../docs/adr/0007-colour-corpus-provenance-and-licensing.md)).

We study the *system* — how combinations are constructed, what relationships they encode —
and build our own from our own sources. Any future use of Wada-derived data requires written
counsel confirmation, per jurisdiction, recorded in the source register.

## Why this is worth the cost

A copied corpus is a **commodity** — anyone can copy the same list.

A provenanced corpus is expensive to build honestly, cheap to build dishonestly, **and the
difference is visible** to exactly the users whose trust matters most. That visibility is
the asset.

## The generalisation

This applies to every colour dataset on the internet. A hex value may be a fact; a curated,
selected, arranged and annotated *collection* of them is a different object under
compilation copyright and database rights — and most source sites' terms say so explicitly.
