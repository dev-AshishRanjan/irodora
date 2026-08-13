# ADR-0004 — We implement the colour maths; `culori` and `colorjs.io` are test oracles

## Status

Accepted

## Date

2026-08-13

## Context

Excellent colour libraries exist. `culori` is fast, ESM-native, tree-shakeable and used by
Tailwind and Radix. `colorjs.io` is written by people who edit the CSS Color specification.
The obvious move is to depend on one of them.

Four constraints make it the wrong move *for this product specifically*:

1. **Platform identity (NFR-3).** The engine must produce byte-identical results in Node,
   in browsers and in React Native. That is a guarantee about a third-party library's
   behaviour across three runtimes, over years of its releases, that we cannot make and
   cannot test on their behalf.
2. **WASM portability.** Hot paths may need to become WASM. A library with its own
   dependency graph and platform assumptions does not port; a pure numeric core does.
3. **Precision as the product.** Colour correctness *is* the product. Depending on someone
   else's rounding decisions, cutoff handling and matrix precision means our central claim
   rests on a version bump we do not control. A patch release that changes the fifth
   decimal place is invisible in a normal application and is a defect here.
4. **Supply chain.** The most security-critical and most correctness-critical code in the
   product should have zero runtime dependencies.

Against this: writing colour maths yourself is a well-known way to ship subtly wrong
software. CIEDE2000 in particular has a hue discontinuity at ±180° and a rotation term
that is easy to sign-wrong, and both errors produce results that look entirely reasonable.

The resolution is not to choose between "use a library" and "write it and hope". It is to
write it and then **prove it against independent implementations and published reference
data**.

## Decision

**Implement the colour maths in-house. Use `culori` and `colorjs.io` as development-time
oracles, never as runtime dependencies.**

1. `packages/color-*` have **zero runtime dependencies**. Lint-enforced: no `node:*`, no
   DOM globals, no `process`.
2. Correctness is established by three independent means:
   - **Golden datasets** from published sources (Sharma–Wu–Dalal for ΔE00, Ottosson's
     OKLab reference values, WCAG worked examples, Bruce Lindbloom's tables).
   - **Property-based tests** — round-trip, symmetry, monotonicity, bounds, hue wrap,
     idempotence.
   - **Oracle cross-validation** — `culori` and `colorjs.io` as dev dependencies, run over
     large random samples, asserted to agree within tolerance.
3. **A disagreement with an oracle is a finding, not automatically our bug.** We determine
   which is right against the published standard before changing anything.
4. Golden values are treated as claims about physical reality: **changing one requires an
   ADR.**

## Consequences

**Good.** The engine ports to WASM without a rewrite. It runs identically on every
platform because it depends on nothing that differs between them. No supply-chain surface
on the product's most critical code. Precision is ours to control and ours to prove. Three
independent verification methods means a single-source error is caught.

**Bad.** More code to write and own — roughly the conversion graph, four ΔE metrics, two
CVD model families, gamut mapping and contrast. More opportunity to be wrong, which the
verification strategy mitigates but does not eliminate. We do not get upstream bug fixes
for free; we get upstream bug *reports* for free, from the oracle tests, which is the part
that matters.

**Neutral.** `culori` and `colorjs.io` remain in `devDependencies`. We benefit from their
correctness without shipping their code.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Depend on `culori` at runtime** | Fast, well-maintained, widely used, and would save real work. But it brings its own platform assumptions, and NFR-3 would become a promise about their cross-runtime behaviour that we cannot test or guarantee. It also blocks the WASM path |
| **Depend on `colorjs.io` at runtime** | The most specification-faithful implementation available. But it is heavier, optimised for correctness over throughput, and has the same portability and precision-control objections |
| **Fork a library and vendor it** | Gets a proven starting point. But we inherit design decisions we did not make, our fork diverges immediately, and we own the maintenance anyway — with less understanding of the code than if we had written it |
| **Write it with no oracle** | Fastest path to something that runs. Also the standard way to ship a subtly wrong ΔE00 that nobody notices for a year. The oracles cost a dev dependency and catch exactly this |

## Revisit when

- A standard body publishes a reference implementation with a compatible licence and
  cross-platform determinism guarantees.
- Maintaining the engine measurably slows feature delivery **and** the golden set has
  found no regression in over a year — at which point the risk calculus has genuinely
  changed.
