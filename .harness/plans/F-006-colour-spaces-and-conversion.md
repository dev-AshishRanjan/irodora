# Plan: F-006 — Colour spaces and conversion

| | |
|---|---|
| **Feature** | F-006 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-1, NFR-1, NFR-3, NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/color-spaces` · `@irodora/color-spaces` (+ `@irodora/testing`) |
| **Author** | Claude Code (planner role) |
| **Date** | 2026-08-14 |

---

## Intent

This is the first line of the product. Every colour the system ever names, compares, scores
or renders passes through these functions, and nothing downstream can be more correct than
they are.

To a user it delivers nothing visible. What it delivers to the product is that **a colour has
one canonical identity** — CIE XYZ at D65 ([ADR-0003](../../docs/adr/0003-canonical-colour-representation-xyz-d65.md))
— and that every other representation is a view of it that can be entered and left without
drift. A garment measured on a phone, a corpus entry derived from a published dye record, and
a swatch on a web page become comparable because they are the same value in different clothes.

**Done looks like:** eight spaces convert in both directions; every published reference value
we can cite is asserted, not assumed; ten thousand sampled colours survive every ordered pair
of round trips inside ΔE00 0.01; the engine imports nothing; and gate 5 is active because it
has been run and watched fail, not because it was switched on.

## Approach

### The three decisions this feature turns on

**1. ΔE00 belongs to F-007, and this feature needs one.** Acceptance criterion 4 states the
round-trip tolerance in ΔE00. CIEDE2000 ships in `@irodora/color-difference` (F-007), which is
*blocked by this feature*. Implementing it here would be scope creep; implementing a second
copy in `@irodora/testing` would be a duplicate implementation of colour maths, which
[`packages/color-core/AGENTS.md`](../../packages/color-core/AGENTS.md) calls a defect by
definition.

Neither is necessary. [ADR-0004](../../docs/adr/0004-own-the-colour-engine-culori-as-test-oracle.md)
already sanctions `culori` and `colorjs.io` as **dev-only test oracles**. ΔE00 is a *tolerance
instrument* here, not a shipped result — exactly what an oracle is for. So the round-trip
assertion uses `culori`'s `differenceCiede2000`, and F-007 later ships our own, validated
against the 34 Sharma–Wu–Dalal pairs *and* against the same oracle. No new implementation, no
new ADR, no obligation left behind.

One subtlety, worth stating because it is easy to get backwards: our Lab is D65-referenced,
`culori`'s `lab` mode is D50-referenced. ΔE00 is a formula over Lab **coordinates**, not over a
reference white, so our D65 Lab triples are handed to `culori` tagged `mode: 'lab'` — telling
it "these are already Lab coordinates, do not adapt them". Tagging them `lab65` would make
`culori` adapt to D50 first and silently compare different numbers.

**2. Cross-platform identity splits into a mechanism and three executions.** Criterion 5 wants
Node, browser and React Native bitwise identical. There is no Playwright here (`apps/web` is a
stub, gate 7 activates at F-015) and no device (`apps/mobile` needs F-039, release R3).

Per [ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md) §4, the
checkable part stays gated and only the uncheckable part is attested. The checkable part is
substantial and is the thing that makes the other legs runnable later:

- a **platform-free identity runner** in `@irodora/testing` — a seeded PRNG, an IEEE-754
  float64 → 16-hex-digit serialiser built on `DataView`, and an FNV-1a 64-bit digest. No
  `node:*`, no DOM, no `process`; it runs anywhere a `<script type=module>` runs;
- a **committed digest fixture** over 10 000 samples through the whole conversion graph, so a
  single changed bit anywhere in the engine fails the gate;
- the **Node execution**, gated on every run.

The browser and React Native executions are attested, naming F-017 (Playwright) and F-039/
F-040 (device) as where they land. Recorded as `blocks: release`, listed by gate 0 every run.

**3. Golden values are cited, and each one says what kind of claim it is.** A golden dataset
assembled by running our own code and pasting the output proves only that the code agrees with
itself. Every entry in this feature's golden files therefore carries `source` and a
`derivation` field with one of three values:

| `derivation` | Meaning | Example |
|---|---|---|
| `published-value` | A number printed in the cited source | Ottosson's XYZ → OKLab table |
| `published-formula` | Computed from a formula printed in the cited source, by hand, shown in the entry | sRGB 8-bit code 3 → `3/255/12.92` |
| `definitional` | A consequence of the definition that must hold for any correct implementation | sRGB white → the D65 white point; Lab of the reference white → `(100, 0, 0)` |

A `definitional` entry is not weaker — it is the class of check that catches a transcription
error in a matrix, because the columns of the sRGB→XYZ matrix *are* the primaries.

### Reused

- **`@irodora/testing`** — the harness already names it "Golden datasets, property helpers and
  fixtures. Implemented alongside F-006." It gains the seeded sampler, the float64 bit
  serialiser, the digest and the golden-file loader. It stays **free of workspace
  dependencies**: its declared but unused `@irodora/color-core` dependency is removed, because
  F-010 will make `color-core` depend on `color-spaces` and `color-spaces` devDepends on
  `testing` — leaving it would close a cycle in the Turborepo graph the moment F-010 lands.
- **`scripts/verify-guards.mjs`** — the existing guard-proof harness. The two colour-engine
  lint boundaries it already proves (no `node:*`, no platform global) are exactly criterion 6's
  second half and need no new work.
- **`eslint.config.mjs`** colour-engine zone, unchanged. Note the F-001 lesson applies and has
  already been paid for: [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]].
- **`.github/workflows/ci.yml`** — the gate 5 step already exists, guarded by
  `hashFiles('packages/color-spaces/package.json')`. Nothing to add; the step starts doing work
  the moment a package declares `test:golden`.
- `vitest`, `turbo`, `tsconfig.base.json`, the prettier and eslint ignores for `golden/`.

### New

```
packages/color-spaces/src/types.ts         Xyz, Rgb, Lab, LCh, OkLab, OkLCh, ColorSpace, WhitePoint
packages/color-spaces/src/numeric.ts       matrix apply, hue normalisation, sign-symmetric power
packages/color-spaces/src/matrices.ts      every published matrix + its published inverse, cited
packages/color-spaces/src/transfer.ts      sRGB EOTF/OETF — the piecewise one
packages/color-spaces/src/rgb.ts           sRGB and Display-P3 ↔ XYZ, linear RGB
packages/color-spaces/src/lab.ts           XYZ ↔ CIELAB, CIELAB ↔ CIELCh
packages/color-spaces/src/oklab.ts         XYZ ↔ OKLab, OKLab ↔ OKLCh
packages/color-spaces/src/adaptation.ts    CAT16 (default), Bradford (available)
packages/color-spaces/src/convert.ts       the space-to-space router the round-trip test drives
packages/color-spaces/src/version.ts       ENGINE_VERSION

packages/color-spaces/golden/*.golden.json six cited datasets (below)
packages/color-spaces/golden/cross-platform-identity.fixture.json

packages/testing/src/prng.ts               sfc32, seeded, in-repo, zero dependencies
packages/testing/src/sampling.ts           stratified sRGB sampler — dark region over-weighted
packages/testing/src/bits.ts               float64 → exact hex, FNV-1a 64 digest
packages/testing/src/golden.ts             the golden entry shape and its loader

scripts/verify-engine-purity.mjs           criterion 6, as a check rather than a claim
```

### Why a purity script as well as the lint rules

Criterion 6 is *"zero runtime dependencies; no `node:*`, DOM or `process`"*. Lint proves the
second half. **Nothing currently proves the first half** — `no-restricted-imports` blocks
`node:fs`, but `import chroma from 'chroma-js'` inside `packages/color-spaces/src` passes every
gate we have. That is the failure mode the constraint actually exists to prevent, and it would
arrive as a devDependency promoted to a dependency in a hurry.

`verify-engine-purity.mjs` reads every `packages/color-*` and `packages/cvd-engine` manifest and
asserts `dependencies` contains nothing outside `@irodora/*`, then statically scans `src/**/*.ts`
for import specifiers that are neither relative nor `@irodora/*`. It runs inside `pnpm lint`
beside `verify-guards.mjs`, and — like every guard here — it is proven by mutation before it is
trusted: a planted `culori` import and a planted dependency entry must each make it exit 1.

### Increments

Each leaves `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green, and each is
committed on its own.

| # | Step | Verified by |
|---|---|---|
| 1 | devDeps; `test:golden` script; `@irodora/testing` freed of workspace deps; `verify-engine-purity.mjs` + its mutation proof | lint (proven to fire), build |
| 2 | `transfer.ts` — the piecewise EOTF/OETF, sign-symmetric | golden: near-black, with a pure-power decoy |
| 3 | `matrices.ts`, `rgb.ts` — sRGB and Display-P3 ↔ XYZ D65, linear RGB | golden: white, primaries, published matrices |
| 4 | `lab.ts` — XYZ ↔ Lab (exact ε, κ), Lab ↔ LCh, hue as an angle | golden: white anchor, ε/κ boundary continuity |
| 5 | `oklab.ts` — Ottosson M1/M2 and published inverses | golden: Ottosson's published table |
| 6 | `adaptation.ts` — CAT16 default, Bradford available | golden: published matrices, white→white identity |
| 7 | `convert.ts` + the round-trip, property and oracle suites | test: 56 ordered pairs × 10 000 samples |
| 8 | The identity runner and its digest fixture | golden: Node leg; browser and RN attested |
| 9 | Gate 5 activation, effect trace, ADRs, progress, close | state, and the mirror proof |

## Files to touch

```
packages/color-spaces/package.json          — devDeps (vitest, fast-check, culori, colorjs.io,
                                              @irodora/testing); add "test:golden"
packages/color-spaces/src/index.ts          — barrel; replaces the F-001 stub
packages/color-spaces/src/*.ts              — NEW, as listed above
packages/color-spaces/golden/*.json         — NEW, six cited datasets + one determinism fixture
packages/color-spaces/test/**               — NEW, unit · golden · property · oracle · identity
packages/testing/package.json               — drop the unused @irodora/color-core dependency;
                                              add vitest
packages/testing/src/*.ts                   — NEW, as listed above
scripts/verify-engine-purity.mjs            — NEW
package.json                                — "lint" also runs verify-engine-purity.mjs
.harness/verification/gates.json            — color-golden: pending → active, with activatedAt
.harness/state/feature_list.json            — F-006 in_progress → done; the attested entry
.harness/state/effects.json                 — E-001 and E-002 guards named
.harness/memory/effects/*.md                — the paired notes, updated with the real guard
docs/adr/00XX-*.md                          — see below
```

## Anticipated effects

| Effect | What changes | Guard |
|---|---|---|
| **E-001** — `srgbToXyz` is the root of every derived corpus value | This feature *creates* the function the corpus will derive from. Every `lab`, `oklch` and `hex` in `content/` is computed from `xyz` by this code at build time (F-011). A change here silently invalidates published entries, with **no import edge to see it**. | `content` gate (F-011) recomputes derived values from `xyz` and fails on disagreement. Until F-011 exists there is no corpus to invalidate — that is why this link's guard becomes real *here*, and the note must say so rather than implying cover we do not have. |
| **E-002** — the `Color` type reaches every surface | `ColorSpace` is exported from here and re-exported by `@irodora/color-core`, and `@irodora/contracts` pins the wire enum to it (ADR-0036). Adding a space to the union without adding it to the wire schema breaks that pin. | `pnpm typecheck` — the mutual-assignability assertion in `packages/contracts` fails. Already proven to fail in F-002. |
| **New: the conversion graph itself** | `convert.ts` enumerates the eight spaces. Anything added later that is not in the round-trip matrix is untested by construction. | The round-trip test derives its pair list **from the exported space union**, so a new space with no conversion fails to compile rather than being silently skipped. |

No existing link needs to be added; both E-001 and E-002 already exist and this is the first
change to touch their `from`. Their memory notes get the guard they can now name.

## Test plan

- **Unit:** each function against its cited golden entries; the boundary values of every
  piecewise function from both sides.
- **Property (`fast-check`):** round-trip within tolerance across the gamut · bounds (every
  output component within its space's valid range for in-gamut input) · hue is an angle
  (`lch → lab → lch` preserves hue mod 360; interpolation across 0°/360° takes the short arc) ·
  monotonicity (increasing `L*` monotonically increases relative luminance) · idempotence of a
  same-space conversion · adaptation from a white point to itself is the identity.
- **Golden:** six datasets, each entry citing its source and its `derivation` class:
  `srgb-transfer` (IEC 61966-2-1) · `srgb-xyz` (IEC 61966-2-1 primaries; CSS Color 4 sample
  matrices; Lindbloom) · `display-p3` (SMPTE RP 431-2 / CSS Color 4) · `xyz-lab`
  (CIE 15:2018) · `oklab` (Ottosson 2020) · `adaptation` (Li et al. 2017 for CAT16; Lindbloom
  for Bradford).
- **Oracle:** `culori` and `colorjs.io` over 10 000 samples for XYZ, Lab(D65), OKLab and P3. A
  disagreement is a **finding** to resolve against the published standard, not a tolerance to
  widen.
- **Conformance:** none — this package sits behind no port.
- **E2E:** none — not user-facing.
- **Negative, each with a real decoy** ([[a-decoy-that-is-not-broken-proves-nothing]]):
  1. A **pure-power transfer function** must fail the near-black golden entries. Asserted by
     computing both and requiring the difference to exceed the tolerance — so the golden set is
     proven able to catch the bug it exists for, rather than assumed to.
  2. A **transposed matrix** must fail the primaries golden entries.
  3. A **sign-flipped `a*`** must fail the Lab anchors.
  4. `verify-engine-purity.mjs` must exit 1 on a planted `culori` import in `src`, and on a
     planted `dependencies` entry — and its baseline must pass, so a script that always fails
     cannot masquerade as a working guard.
  5. The identity digest must change when a single output bit changes.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck
pnpm lint                      # includes verify-guards.mjs and verify-engine-purity.mjs
pnpm format:check
pnpm test
pnpm test:golden               # gate 5 — activated in this feature
pnpm build
pnpm security:staged           # before each commit; never inside a pipeline
node scripts/verify-gate-mirror.mjs
```

Evidence captured per [verification protocol](../protocols/verification.md): the run output for
each gate, the mutation proofs for every new guard, and the oracle agreement figures.

**Gates that will NOT run, and why:** `e2e`, `a11y`, `contrast`, `cvd`, `content`, `perf`,
`web-perf`, `e2e-full` — each activates with its own feature and none has an applicable surface
here.

## Risks and open questions

- **Matrix precision provenance.** CSS Color 4 publishes 16-digit matrices; Lindbloom publishes
  8-digit ones; both are derived from the same IEC primaries. They disagree in the 8th digit,
  which is far inside ΔE00 0.01 but not inside "bitwise". The engine uses **one** set — the
  full-precision CSS Color 4 values, because "matrices at full published precision" is the
  written rule — and the Lindbloom values appear in the golden set as a cross-check at the
  precision *they* are published to. If they disagree beyond that, it is a finding.
- **Out-of-gamut behaviour.** Nothing here clamps: `xyzToSrgb` may return components outside
  `[0,1]`, and that is required for the round trips to be lossless. Gamut mapping is F-009. The
  transfer function must therefore be **sign-symmetric** — `sign(x)·f(|x|)` — or every round
  trip through a negative component silently loses information.
- **`colorjs.io` API surface.** Version 0.7 is the current release; if its import shape differs
  from what the oracle test expects, the oracle leg is adjusted, never dropped.
- **No open questions block this feature.** OQ-4 and OQ-5 belong to F-012.

## Out of scope

- **Hex parsing and formatting.** Not in the acceptance list. `Color.unsafeFromHex` is F-010's,
  and putting a string boundary here first would fix its shape before the type that owns it
  exists.
- **Gamut mapping** (F-009), **colour difference and contrast** (F-007), **CVD** (F-008), the
  **`Color` value type and provenance** (F-010). This package returns bare coordinate triples;
  it does not know what provenance is, and it must not.
- **A white-point catalogue.** D65 and D50 are published here because the adaptation tests need
  two; `adapt` takes arbitrary white points, so nothing is blocked by the absence of the rest.
- **Performance work.** No caching, no lookup tables, no approximated `pow`. Gate 12 activates
  at F-038 and an optimisation before a budget is a guess.
