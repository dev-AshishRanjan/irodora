# ADR-0023 — Four testing methods, each answering a question the others cannot

## Status

Accepted

## Date

2026-08-13

## Context

Standard unit testing is insufficient here in a specific, diagnosable way: **a unit test
for colour maths asserts that the code agrees with the test author's understanding.** If
both are wrong — a mis-transcribed matrix, an inverted `Rt` sign in CIEDE2000 — the test
passes forever and the product is quietly incorrect.

Snapshot testing is worse: it asserts the code still agrees with itself.

The product also has three properties ordinary testing does not address. Results must be
identical across three runtimes (NFR-3). Adapters must be behaviourally interchangeable
across deployment profiles ([ADR-0016](0016-deployment-profiles-local-vps-cloud.md)). And
the whole system must work as one deployment, not as a set of slices that agree with each
other's mocks.

## Decision

**Four methods, each with a distinct job. None substitutes for another.**

### 1. Golden datasets — *is this correct against reality?*

Committed input/expected pairs from published sources, each carrying its citation. ΔE00
against all 34 Sharma–Wu–Dalal pairs; Ottosson's OKLab reference values; WCAG worked
examples; published CVD confusion-line pairs; sRGB values including the near-black region
where the transfer-function cutoff lives.

> **Changing a golden value is changing our claim about physical reality. It requires an
> ADR, not a commit message.**

### 2. Property-based tests (`fast-check`) — *is this consistent everywhere?*

Round-trip within tolerance across the whole gamut; ΔE symmetry and identity; monotonicity
of lightness against luminance; output bounds; hue interpolation taking the short arc
across 0°/360°; idempotence of gamut mapping. These find the edge cases nobody enumerates
by hand, which is exactly where colour maths breaks.

### 3. Conformance suites — *are these interchangeable?*

One suite per port, which **every** adapter must pass: `BlobStore`, `Cache`, `Queue`,
`Mailer`, `Secrets`, `KeyManagement`, and the client `Repository`.

> A conformance case that cannot fail launders every adapter through it. Each suite
> includes at least one case verified to fail against a deliberately broken adapter.

### 4. End-to-end — *does the assembled system work?*

- `e2e` — per surface, real browser, including axe assertions.
- `e2e-full` — one live deployment, real API, real database, real journeys. Serialised,
  zero retries: a flaky full-stack gate is a lie.

### Plus, specific to this product

- **Cross-platform identity** — 10 000 computations in Node, browser and React Native,
  asserted bitwise identical. This is the test that proves NFR-3.
- **`cvd` gate** — recommendations keep minimum separation under simulated CVD.
- **`content` gate** — every corpus entry has complete provenance.
- **Device colour lab** (F-063) — physical measurement across a reference device matrix.
  The only thing that can substantiate an accuracy claim.

### Coverage

Colour packages ≥ 95 % lines. Elsewhere, coverage is a signal rather than a target — a
number chased for its own sake produces tests that execute code without asserting anything.

## Consequences

**Good.** Correctness is established against external reality, not internal agreement.
Property tests find what enumeration misses. Adapters are provably interchangeable, which
is what makes the VPS profile first-class. NFR-3 is a test rather than a hope. Full-stack
e2e catches the integration failures that slice tests are structurally blind to.

**Bad.** Considerably more testing infrastructure than a typical product. Golden datasets
must be sourced and cited, which is real research work. Property tests can be slow and
occasionally surface failures that take a day to understand. Cross-platform identity needs
a device in CI. The full-stack gate is the slowest thing in the pipeline.

**Neutral.** Test organisation is hybrid: unit and property tests colocated with source;
conformance, e2e-full, bench and colour-lab in `tests/*` as their own workspace packages.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Unit tests only** | Standard, fast, familiar. Cannot detect a mis-transcribed matrix, because the test and the code share the author's misunderstanding |
| **Snapshot testing the engine** | Trivial to maintain, catches unintended change. Asserts self-agreement — a wrong implementation snapshots its wrongness and defends it forever |
| **Cross-validate against a library only** | Cheap and genuinely useful, and we do it. Insufficient alone: if the library is wrong we inherit it, and we would have no basis to know |
| **Mock adapters instead of conformance suites** | Faster tests. Slice tests then agree with each other rather than with reality, and the VPS profile's correctness would be unproven |

## Revisit when

- Full-stack e2e wall time blocks the development loop, at which point it moves to a
  pre-merge rather than per-commit gate — never removed.
- A standards body publishes a reference test suite we can adopt wholesale.
