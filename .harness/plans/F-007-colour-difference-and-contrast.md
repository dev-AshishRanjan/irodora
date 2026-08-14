# Plan: F-007 — Colour difference and contrast

| | |
|---|---|
| **Feature** | F-007 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-2, FR-3 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/color-difference` · `@irodora/color-difference` |
| **Author** | Claude Code (planner role) |
| **Date** | 2026-08-14 |

---

## Intent

F-006 made two colours comparable. This makes the comparison mean something.

ΔE00 becomes the ranking authority for the whole product — every naming result, every
duplicate warning, every CVD separation score, every outfit recommendation
([E-003](../state/effects.json)). And WCAG contrast becomes the number the accessibility gate
enforces, which is a different kind of obligation: it is not "our best model of perceived
contrast", it is a specific arithmetic a procurement questionnaire will ask about.

**Done looks like:** all 34 Sharma–Wu–Dalal pairs to four decimal places, WCAG contrast
reproducing the specification's own worked examples, APCA alongside it, and every constant in
the package pinned digit-for-digit against its source.

## Approach

### Four decisions this feature turns on

**1. WCAG's luminance is not our luminance, and it must not be.** Our `srgbToXyz` Y row is
`0.21263900587151027, 0.715168678767756, 0.07219231536073371`. WCAG 2.x normatively specifies
`0.2126, 0.7152, 0.0722` — the same numbers, rounded to four decimals — and the specification's
worked examples are computed with the rounded ones. Criterion 3 says *"matches the
specification's worked examples exactly"*.

So `@irodora/color-difference` implements WCAG's arithmetic **literally**, with its own
constants, and does **not** compose it from `@irodora/color-spaces`. That is a second
definition of relative luminance in this repository, which is exactly the shape of hazard
[E-005](../state/effects.json) is about — so it is contained rather than tolerated:

- the WCAG constants live in one module, named `WCAG_*`, each a golden entry at tolerance 0;
- a golden entry records the divergence from our own Y row **as a measured number**, so nobody
  later "fixes" the rounding to match the engine and quietly changes every contrast result;
- nothing else in the repository may use the WCAG coefficients for anything but WCAG.

The two oracles disagree with each other here, which is the evidence this is real: `culori`
uses the rounded WCAG coefficients, `colorjs.io` uses XYZ's exact Y. One of them reproduces
the specification and one does not. **The specification's worked examples decide, not the
oracles** — this is the [[two-oracles-agreeing-against-you-is-evidence-about-you]] lesson
applied before it can happen rather than after.

**2. The WCAG transfer cutoff is chosen by the worked examples, not by memory.** WCAG 2.0/2.1
publish `0.03928` in the relative-luminance definition; our sRGB EOTF uses `0.04045`. The two
differ only for encoded values in a 1.2e-3-wide band, and the resulting luminance difference
is ~1e-9. Both constants will be implemented and **the worked examples will select one**,
with the losing branch recorded as a golden entry stating its measured cost. Guessing here is
how a standards-conformance claim becomes false in a way nobody can see.

**3. Every constant is a golden entry at tolerance 0.** F-006 shipped a dropped digit in an
OKLab matrix that survived six datasets, two oracles and a matrix-inverse check, because the
only checks on a transcribed constant were arithmetic ones.
[[measure-what-a-golden-set-can-detect-before-trusting-it]]. APCA has **fourteen** magic
constants and CIEDE2000 has seven; both are transcribed from a source, and both get
digit-for-digit entries before any arithmetic is asserted.

**4. The 34 pairs are checked for transcription, not just for agreement.** Each Sharma–Wu–Dalal
row is seven numbers: two Lab triples and an expected ΔE00. A typo in any of them produces a
row that our implementation and the reference disagree about — but so does a genuine bug, and
the two are indistinguishable from inside. So `culori` computes ΔE00 on each transcribed pair
independently: if the row is internally consistent under a third-party implementation, the
transcription is sound and any remaining disagreement is ours.

### Reused

- **`@irodora/color-spaces`** — `Lab`, `LCh`, `OkLab`, `xyzToLab`, `srgbToLinearSrgb`,
  `normalizeHue`, `degreesToRadians`. ΔE00 operates on Lab coordinates; the conversion to get
  there already exists and is not reimplemented.
- **`@irodora/testing`** — the golden validator, the seeded stratified sampler, and the
  IEEE-754 digest. The cross-platform identity fixture gains this package's outputs.
- **`culori` and `colorjs.io`** as dev-only oracles (ADR-0004), tagged **`lab65`** — never
  `lab` [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]].
- **`scripts/verify-engine-purity.mjs`** and the colour-engine lint zone already cover this
  package: it matches `packages/color-*`.

### New

```
packages/color-difference/src/ciede2000.ts   deltaE00 — E-003's `from` resolves to this path
packages/color-difference/src/deltae.ts      deltaE76, deltaE94, deltaEok
packages/color-difference/src/wcag.ts        WCAG relative luminance and contrast ratio
packages/color-difference/src/apca.ts        APCA Lc
packages/color-difference/src/index.ts       barrel
packages/color-difference/golden/            ciede2000 (34 pairs) · wcag · apca · deltae
packages/color-difference/test/              golden · property · oracle
```

### Increments

Each leaves every gate green and is committed on its own.

| # | Step | Verified by |
|---|---|---|
| 1 | Package scaffold, `test:golden` wiring, the constants module + digit-for-digit entries | golden |
| 2 | `ciede2000.ts` + all 34 pairs, transcription-checked against `culori` | golden (4 dp) |
| 3 | `deltae.ts` — ΔE76, ΔE94 (both weighting sets), ΔEok | golden + oracle |
| 4 | `wcag.ts` — luminance, contrast, the cutoff decided by the worked examples | golden (exact) |
| 5 | `apca.ts` — Lc, against `colorjs.io` and the published lookup values | golden + oracle |
| 6 | Property tests: symmetry, identity, bounds, hue wrap, monotonicity | test |
| 7 | Identity fixture extended; E-003 traced; ADRs; progress; close | state, golden |

## Files to touch

```
packages/color-difference/package.json    — devDeps, test:golden script
packages/color-difference/src/*.ts        — NEW, as above
packages/color-difference/golden/*.json   — NEW, four cited datasets
packages/color-difference/test/**         — NEW
packages/color-spaces/test/identity/      — the fixture covers difference outputs too
.harness/state/effects.json               — E-003's `from` now resolves; guard named
.harness/memory/effects/deltae00-is-the-ranking-authority.md — the guard it can now name
.harness/verification/gates.json          — gate 5's description gains the new datasets
docs/adr/                                 — the WCAG-luminance divergence, if it is material
```

## Anticipated effects

| Effect | What changes | Guard |
|---|---|---|
| **E-003** — ΔE00 is the ranking authority | This feature *creates* it. Every naming result (F-013), duplicate warning (F-049), CVD separation score (F-008) and recommendation ranking (F-030) derives from it. Its known failure modes — the hue discontinuity at ±180° and a sign-wrong `Rt` — produce plausible results, so a defect changes every answer with no visible error. | `gate:color-golden`, with all 34 pairs at 4 dp. The `from` ref resolves for the first time. |
| **New: a second luminance definition** | `wcag.ts` computes relative luminance from WCAG's rounded coefficients, not from `srgbToXyz`. Two definitions of the same quantity is the E-005 hazard. | A golden entry pinning the divergence as a measured number, plus the rule that nothing outside `wcag.ts` may use those coefficients. If that needs teeth, it becomes a purity-script rule. |
| **F-003 unblocks partially** | The contrast gate needs WCAG **and** APCA from here; it still needs F-008 for `cvdPairs`. | ADR-0037 already records the sequencing. |

## Test plan

- **Golden:** `ciede2000` (all 34 Sharma–Wu–Dalal pairs, 4 dp) · `wcag` (the specification's
  worked examples, exact) · `apca` (published reference values) · `deltae` (ΔE76/ΔE94/ΔEok
  anchors). Every constant in the package additionally pinned digit-for-digit at tolerance 0.
- **Property:** symmetry `ΔE(a,b) = ΔE(b,a)` for all four metrics · identity `ΔE(a,a) = 0` ·
  non-negativity · ΔE00 continuity across the ±180° hue boundary · WCAG contrast in `[1, 21]`
  and symmetric · APCA sign flips with polarity.
- **Oracle:** `culori` for ΔE76/ΔE94/ΔE00, `colorjs.io` for APCA and WCAG — with the
  expectation, stated in advance, that the two disagree on WCAG and that the specification
  decides.
- **Negative, each with a real decoy:**
  1. A **sign-flipped `Rt`** must fail the Sharma pairs — the classic CIEDE2000 error, which
     produces plausible results everywhere else.
  2. A **naive hue difference** (no ±180° wrap) must fail the pairs that straddle the boundary.
  3. **WCAG's rounded coefficients replaced by our exact Y row** must move a worked example
     off its published value — proving the distinction in decision 1 is real and not pedantry.
  4. A **dropped digit in any APCA constant** must fail its digit-for-digit entry.
- **Conformance / E2E:** none. Not user-facing, sits behind no port.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:golden && pnpm build
pnpm security:staged            # before each commit, exit status read directly
```

**Gates that will NOT run:** `e2e`, `a11y`, `contrast`, `cvd`, `content`, `perf`, `web-perf`,
`e2e-full` — none has an applicable surface. `contrast` activates with F-003, which this
feature partially unblocks but does not complete.

## Risks and open questions

- **APCA is a moving target and is not a normative standard.** ADR-0021 already decided it is
  reported, never enforced. The version implemented must be pinned by name in the code and in
  the golden set, because "APCA Lc" without a version is not a reproducible claim.
- **Transcription is the dominant risk in this feature**, not algorithm design. 34 pairs × 7
  numbers, 14 APCA constants, 7 CIEDE2000 constants. Every one gets a digit-for-digit entry or
  an independent consistency check, and preferably both.
- **A colour-science review is owed from F-006** and was not run. It applies to this feature
  too; the same maths is being extended.

## Out of scope

- **CVD simulation and separation scoring** — F-008, and it consumes ΔE00 from here.
- **The contrast gate itself** — F-003. This provides the arithmetic; the gate that reads
  `design-system.manifest.json` and fails a build is that feature's.
- **Perceptual ranking, naming, duplicate detection** — F-013, F-049. They are consumers.
- **ΔE CMC, ΔE ITP, HyAB.** Not in the acceptance list. `culori` has them; we do not need them,
  and a metric with no consumer is a maintenance cost with no test that can fail meaningfully.
