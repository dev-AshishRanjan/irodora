---
kind: lesson
title: A product rule in a document is one the next screen forgets; a union makes the careless version unbuildable
category: engineering
confidence: 1.0
created: 2026-09-03
scope: [packages/ui, apps/mobile]
links: [[provenance-in-the-type-is-what-makes-honesty-structural]], [[a-decoy-that-is-not-broken-proves-nothing]], [[a-fix-made-in-review-is-the-one-most-likely-to-ship-untested]]
---

# Four screens said "go and do X" and gave you no way to do X

`/wardrobe/add` was a route reachable only from the Lens, after a camera reading. Three more
screens named an action that lived elsewhere and offered nothing to press.

The repository **already contained the rule**, as a comment in `Wardrobe.tsx`: *"one is 'add a
garment', the other is 'clear a filter'"*. Only the filter case got a button. A correct
statement of the rule, in prose, next to a half-implementation of it.

## The move

Not a documented convention — a **discriminated union** the caller cannot avoid:

```ts
type Resolution =
  | { readonly action: EmptyAction; readonly resolvedHere?: never }
  | { readonly resolvedHere: true; readonly action?: never };
```

Every empty state now declares whether its action is *here* or *elsewhere*. There is no third
option and no default, so "I forgot" is not reachable — the careless version does not compile.

This is [ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)'s argument
applied to a **product** rule rather than to provenance, and the general form is worth carrying:

> When a rule is about what a screen must *offer*, put it in the props. When it is about what a
> value must *carry*, put it in the type. Either way the guard is `tsc`, which cannot be
> forgotten, skipped, or talked out of it.

## No default, on purpose

`resolvedHere` could have defaulted to `true`. It does not, because **a default is a thing
people accept without reading**, and accepting it is exactly the mistake.

## Prove the refusal, and prove the acceptance

`tsc` errors on an **unused** `@ts-expect-error`, so each one is a two-way assertion: it passes
only while the careless form is still refused, and fails the moment somebody widens the type.

The decoy matters as much. A type that rejected *every* `EmptyState` would satisfy both refusal
cases and be far worse than the gap it closed, so each valid form is asserted to still compile
[[a-decoy-that-is-not-broken-proves-nothing]]. Then collapse the union and watch `typecheck`
go red on the unused directives — otherwise the proof is a claim about a claim.

## The thing the rule as stated did not cover

An empty-state button gets the **first** item in. The second one needs a control that exists
when the screen is *not* empty. Two affordances — and rendering both at once gave an empty
wardrobe two buttons with the identical accessible name *"Add a garment"*, which a screen reader
announces twice. One affordance per screen, whichever branch is showing.

**A gap somebody reports is usually narrower than the gap they have.** They said "no way to add
a garment"; the shape of it was "no way to add a *second* garment either".
