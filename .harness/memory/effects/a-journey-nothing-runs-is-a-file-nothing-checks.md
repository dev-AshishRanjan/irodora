---
kind: effect
title: A journey nothing runs is a file nothing checks, so the route table becomes a contract
category: contract
confidence: 0.9
created: 2026-09-03
scope: [apps/mobile]
links: [[a-gate-must-model-what-renders-not-what-is-physically-correct]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-note-explaining-that-an-artefact-is-absent-is-an-instance-of-it]]
---

# E-055 — the route table is a contract with the journeys, because nothing else notices

**`apps/mobile/app/` (the expo-router route table) → `e2e/journeys/*.journey.json` ·
`e2e/*.yaml` · `scripts/generate-e2e-flows.mjs` · `gate:lint`**

## Why a route is a contract here and is not one anywhere else

Every other consumer of the route table is checked by something. A screen that imports a
renamed module fails `tsc`. A `router.push` to a path that no longer exists is caught by the
app not working the first time anybody opens it.

A journey is different in one specific way: **it is the only artefact in this repository that
depends on navigation and cannot be run.** F-091's criteria 2 to 4 are `attested` — this
workstation has no JDK and no emulator, and criterion 4 needs a CI run. So the feedback loop
that would catch a moved route is not slow, it is **absent**.

That is the whole reason the flow is generated rather than written
([ADR-0086](../../../docs/adr/0086-the-journey-is-a-maestro-flow-generated-from-a-spec.md)). A
step may declare the `route` it expects to be on; the declaration changes **no output at all**
and exists only so that renaming `app/atlas/[slug].tsx` fails `lint` instead of failing a run
that may be months away.

**Per step it is optional; per spec at least one is required.** Optional everywhere meant a
journey could quietly stop declaring any and lose this guard without a line turning red — the
review that found it was right that an opt-in guard is barely a guard. Requiring one anchor does
not prove a journey declares every screen it visits (nothing here can, short of running it); it
converts *silently* unguarded into *deliberately* unguarded, which is the distinction this
repository keeps paying for.

## The same shape, three sources

The route table is one of three contracts the journey silently depends on. The other two
already had links, and both gained the journey as a dependent:

| contract | link | what breaks the journey |
|---|---|---|
| `src/i18n/en.ts` | **E-016** | a renamed message key |
| `src/corpus/generated/bundle.ts` | **E-030** | an unpublished or renamed colour |
| `app/` | **E-055**, this one | a moved or renamed route file |

The first two are checked by `tsc` **for the app** and by nothing for the journey — which is
the point. `MessageKey` is derived from `en`, so the compiler is a total guard over every call
site written in TypeScript, and a JSON spec is not one.

## What the guard cannot see, and why it is not attempted

**That the screen at a route actually renders the key a step asserts.** The catalogue says the
key exists; nothing says `Atlas.tsx` uses it. Checking it means reading a `.tsx` for `t('…')`
occurrences — source analysis of exactly the kind that has now mistaken **a comment for code
five times** in this repository (F-122, F-127, F-130, F-132, F-133). A weaker check that reads
prose as code is worse than a named gap, because it looks like coverage.

**That the flow drives the app correctly.** A valid flow can be a wrong flow. That is F-091's
criterion 2, it needs a device, and `scripts/e2e-scope.mjs` now says so on every run: *covered*
means a suite exists, not that it passed.

## The ambiguity rule is asymmetric on purpose

A selector matching two elements is a flake nobody can reproduce from reading the flow, because
Maestro matches on a **substring**. So a colour selector is refused when its text appears inside
another entry's names, and a **`tap`** on a message key is refused when its text appears inside
another catalogue value — the English catalogue holds 21 exactly duplicated strings, and
`compare.title` and `home.openCompare` are both *"Compare two colours"*, on screens one journey
could reach. Tapping one of two elements performs one of two **different actions**.

**`assertVisible` is exempt, deliberately.** An assertion satisfied by either element is still
true: the claim is that the text is on screen, and it is. Extending the rule there would be pure
over-strictness — and an over-strict rule is one somebody eventually weakens, which costs more
than the rule was worth. Both halves are asserted in `scripts/e2e-flows-proof.mjs`, the refusal
*and* the exemption, so neither can rot into the other.

## Severity, and why it is `medium`

A broken journey does not break the app. It breaks the **only evidence** that browsing the
corpus works on a phone and opens no socket — and that evidence is already owed rather than
held. `medium` records that the blast radius is the proof rather than the product, without
pretending the proof does not matter.
