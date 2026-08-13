---
kind: lesson
title: Provenance in the type is what makes honesty structural rather than cultural
category: convention
confidence: 1.0
created: 2026-08-13
scope: [packages/color-core, apps/web, apps/mobile]
links: [[the-color-type-reaches-every-surface]], [[wada-public-domain-is-not-the-same-as-free-to-ingest]]
---

# Provenance in the type is what makes honesty structural

The conventional approach to "do not present an estimate as a measurement" is a
**disclaimer**: show the hex, add a confidence badge, put "estimated" in the caption.

It fails in the ordinary way all convention-based guarantees fail.

## How it fails

Nobody decides to mislead anyone.

Six months in, someone builds a new surface. They have a hex and need a swatch. The
provenance is one object away and not required. It does not get shown.

Now the product displays measured-looking colour values with no indication they are
estimates — and **no test detects it**, because nothing is broken. The type system simply
permitted it.

## What we do instead

`Provenance` is a **required field of `Color`**. An unclassified colour is not
constructible.

The consequence is the whole point: **a component that accepts a `Color` necessarily has
its provenance.** There is no code path that renders a swatch while dropping how it was
obtained, because such a path cannot be written.

A developer who has never read [ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)
still cannot build the failure.

## The escape hatch, and why it is named badly on purpose

`Color.unsafeFromHex()` sets `source: 'declared'`, `confidence: 0.5`. Escape hatches get
used; this one is greppable, unpleasant to type, and reviewed at every call site.

## The general principle

> When a guarantee matters, ask what makes it **impossible to violate**, not what reminds
> people not to.

The same reasoning produced: `status.*` tokens paired with icon tokens in the manifest, so a
colour-only status cannot be constructed; and image buffers carried in types with no
serialiser, so logging one is a type error.

## The change to watch for

Making `Provenance` optional. It would compile. Most tests would pass. And the guarantee
would be gone, invisibly ([E-002](../../state/effects.json)).
