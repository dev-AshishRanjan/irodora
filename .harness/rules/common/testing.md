# Testing Rules

Per [ADR-0023](../../../docs/adr/0023-testing-golden-property-conformance-e2e.md).

---

## A test asserts behaviour, not execution

```ts
// This is not a test. It executes code and asserts nothing meaningful.
it('converts', () => {
  const result = srgbToXyz([0.5, 0.5, 0.5]);
  expect(result).toBeDefined();
});

// This is a test.
it('matches the published reference for mid-grey', () => {
  const result = srgbToXyz([0.5, 0.5, 0.5]);
  expect(result[0]).toBeCloseTo(0.2034, 4);   // Lindbloom reference
  expect(result[1]).toBeCloseTo(0.2140, 4);
  expect(result[2]).toBeCloseTo(0.2330, 4);
});
```

**Prove your test can fail.** Break the implementation deliberately and confirm the test
goes red. A green assertion that cannot go red is worse than no test — it occupies the
space where a real check would go and reports success forever.

---

## Choose the right method

| Question | Method |
|---|---|
| Is this correct against reality? | **Golden dataset** from a published source |
| Is this consistent everywhere? | **Property test** (`fast-check`) |
| Are these interchangeable? | **Conformance suite** — every adapter runs it |
| Does the assembled system work? | **e2e**, and `e2e-full` for a release |

Unit tests are the floor, not the answer. **Passing unit tests ≠ working feature** — mocked
dependencies hide exactly the failures that matter.

---

## Golden datasets

- Come from a published source, and **cite it in the fixture**.
- Live in `packages/*/golden/`.
- Are treated as claims about physical reality: **changing one requires an ADR.**
- Include the awkward cases: near-black (the sRGB cutoff), the Lab ε/κ boundary, hue
  wrap-around, out-of-gamut.

## Property tests

Where a general invariant exists, assert the invariant rather than examples:

```ts
fc.assert(fc.property(arbitrarySrgb(), (c) => {
  const round = xyzToSrgb(srgbToXyz(c));
  expect(deltaE00(c, round)).toBeLessThan(0.01);
}));
```

## Conformance suites

One per port; **every** adapter must pass it.

> A conformance case that cannot fail launders every adapter through it. Each suite
> includes at least one case verified to fail against a deliberately broken adapter.

## Negative tests need a decoy

A test asserting "tenant A cannot read tenant B's data" against an **empty** tenant B passes
whether or not the policy works. **Populate tenant B with real data**, then assert nothing
comes back. Otherwise the test proves the fixture is empty.

---

## What not to do

| Anti-pattern | Why |
|---|---|
| Snapshot testing the engine | Asserts self-agreement. A wrong implementation snapshots its wrongness and defends it forever |
| Mocking the thing under test | Tests the mock |
| Over-mocking integrations | Slice tests then agree with each other, not with reality |
| Testing implementation details | Breaks on every refactor, catches nothing |
| Chasing a coverage number | Produces tests that execute code without asserting anything |
| Skipping a flaky test | Flakiness is a defect. Fix it, or quarantine it with a tracked feature |
| Adjusting the expectation to match the output | This is the failure this whole file exists to prevent |

---

## Coverage

`packages/color-*` — **≥ 95 % lines**, and the number is meaningful there because the code
is pure functions over well-defined inputs.

Elsewhere, coverage is a signal, not a target.

---

## Organisation

```
packages/x/src/foo.ts        packages/x/src/foo.test.ts     colocated unit + property
packages/x/golden/           golden datasets, with citations
tests/e2e-full/              full-stack journeys
tests/bench/                 performance benchmarks
tests/color-lab/             device measurement harness
```

## e2e

- **Real browser, real server.** Not jsdom for anything claiming to be e2e.
- **Assert axe** on every route.
- **Assert the network**: a Lens scan must transmit no image bytes (NFR-12).
- **`e2e-full` is serialised, zero retries.** A flaky full-stack gate is a lie — it reports
  a state of the world that it did not observe.
