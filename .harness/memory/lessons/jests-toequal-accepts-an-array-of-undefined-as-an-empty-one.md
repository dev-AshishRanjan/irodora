---
kind: lesson
title: Jest's toEqual([]) passes for [undefined], so "nothing happened" is not what it asserts
category: engineering
confidence: 1.0
created: 2026-09-02
scope: [apps/mobile, tests]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]]
---

# `toEqual([])` passes for `[undefined]`

```ts
const a: unknown[] = [];
a.push(undefined);
expect(a).toEqual([]);   // PASSES
```

Confirmed against this repository's own jest, in a throwaway case, because it did not seem
plausible. `toEqual` ignores `undefined` — that is documented for object *properties*, and it
extends to array elements and to the length difference they create.

## Where it bit

F-129's export screen hands a written file to a sink. The test recorded what the sink received
and asserted `expect(written).toEqual([])` for *"nothing was written"*.

A mutation removed the `return` after a format refuses:

```ts
let file: ExportFile;
try { file = write(subject); }
catch (error) { setRefusal(error.message); /* return; */ }
void sink.save(file).then(setOutcome);     // file is undefined
```

The screen then handed the sink `undefined`, the recorder pushed it, and **the assertion still
passed.** TypeScript would have caught the use-before-assignment; jest runs through babel, which
strips the types, so at runtime it is simply `undefined`.

`toHaveLength(0)` catches it. So does `toStrictEqual([])`.

## Why this is worth its own note

The failure is **specific to "nothing happened" assertions**, and those are exactly the ones
already known to be weak — an empty fixture proves nothing
[[a-negative-test-needs-a-decoy-not-an-empty-fixture]]. This is that trap one level lower: the
fixture is fine, the decoy is real, the mutation is genuine, and **the matcher is what lets it
through.**

It also only bites when the array can hold `undefined` — a `filter` or `map` result cannot, so
most `toEqual([])` in this repository are sound. That is a judgement, not a check, which is why
F-133 was filed to make it one rather than asserted here.

## The rule

> For an array that something **pushes into**, assert `toHaveLength(0)`, never `toEqual([])`.
>
> `toEqual` is for comparing *values*. "Nothing was added" is a claim about *length*, and it
> deserves the matcher that measures one.

## How to check it

Mutate the code so the collection receives an `undefined`, and watch. If the suite stays green,
the matcher is the problem, not the fixture
[[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]].
