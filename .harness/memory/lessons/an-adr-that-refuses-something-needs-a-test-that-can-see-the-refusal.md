---
kind: lesson
title: An ADR that refuses something is prose too — give the refusal a test that can see it
category: convention
confidence: 0.9
created: 2026-09-02
scope: [root, apps/mobile]
links: [[an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# An ADR that refuses something needs a test that can see the refusal

An ADR records what we decided **to do**, and the code does that thing — so the decision is
self-evidencing: delete the implementation and something fails.

**An ADR that records what we decided NOT to do has no such anchor.** Nothing fails when the
refused thing is added later, because adding it is *building a feature*. The next person reads
a screen with a helpful new label on it and has no reason to suspect it was argued about and
declined.

## Where this came from

[ADR-0082](../../../docs/adr/0082-the-investment-signal-is-two-numbers-from-your-own-wardrobe-and-no-verdict.md)
decided the investment signal offers **no verdict** — no "good investment", no "worth it". The
reasoning is real: it is advice about somebody's money from a system that knows their wardrobe
and nothing about their circumstances, and it is unfalsifiable besides.

Every gate in this repository would have stayed green if a later feature had added
`worthIt: boolean` to the result. Typecheck is happy with a new field, the tests assert the
fields they name and ignore the rest, and the i18n suite would have been *satisfied* by a new
key that a screen renders.

## What was done instead

Two things, and the pair is the point:

**The union has no room for it.** `InvestmentSignal`'s known branch enumerates six fields.

**A test enumerates them.** Not `toMatchObject`, which passes for a superset — `Object.keys`
sorted, compared exactly:

```ts
expect(Object.keys(signal).sort()).toEqual([
  'breakEvenWears', 'comparableCount', 'currency',
  'known', 'medianMinorPerWear', 'typicalWears',
]);
```

Adding a verdict now fails a test whose name says *why*, and whoever adds it is sent to the ADR
rather than to a stale assertion. **A mutation adding `worthIt` was run, and the suite went
red** — which is the only way to know the test discriminates
[[a-decoy-that-is-not-broken-proves-nothing]].

The screen has the weaker version of the same guard: the copy asserts the sentence handing the
judgement back, and asserts four verdict-shaped phrases are absent.

## The generalisation worth keeping

> A decision to build something is checked by the thing existing. A decision **not** to build
> something is checked by nothing, unless you write the check.

The precedent is already in the repository and this is the small version of it: ADR-0031 refuses
a list of marketing claims, and `verify-claims.mjs` is what makes that refusal survive contact
with a copywriter. **The refusal that is only in the ADR is the one that gets reversed by
somebody being helpful.**

Not every refusal earns a test. The ones that do are those a reasonable person would *add on
purpose*, believing they were improving the product — which is exactly the set an ADR's
"Alternatives considered" table already names.

## How to check it

```bash
node --run test --workspace @irodora/mobile
```

Then mutate: add the refused field and confirm the suite goes red. If it stays green, the
decision is prose.
