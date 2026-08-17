# Plan: F-003 — OKLCH-native design token package

| | |
|---|---|
| **Feature** | F-003 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 (WCAG 2.2 AA), NFR-9 (never colour alone) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-15 |

---

## Intent

One manifest becomes four build outputs and two blocking gates. A designer changes a token
in `design-system.manifest.json`, and CSS, TypeScript, React Native and Tailwind all move
together — web and mobile cannot drift ([ADR-0020](../../docs/adr/0020-design-tokens-are-oklch-native.md)),
and **the build fails if that change broke a declared contrast pairing in either theme, or
made a semantic pair indistinguishable to someone with colour-vision deficiency.**

To a user this is invisible until it is not: it is the reason the success and error states
stay tellable apart on a phone in daylight, and the reason a token edit made for a dark
surface cannot quietly ruin the light one.

---

## What reading the manifest first found

Three things were measured before any code was planned. Each changes the plan.

### 1. The `oklch` and `srgb` fields disagree — 37 of 38 opaque tokens

Recorded in the feature notes before this session and now **confirmed with the engine**:
converting each token's `oklch` through `oklchToXyz → xyzToSrgb` reproduces its declared
`srgb` hex for exactly one token (`light.surface.1`, which is `#FFFFFF`). The largest
disagreement is **ΔE00 6.09** (`light.status.bad`), and `dark.background` is stated
`#141312` where its own `oklch` resolves to `#090807`.

The residual does not fit any single wrong-transform hypothesis — it is not an OKLab/CIELAB
`L` confusion (`|labL/100 − manifestL|` reaches 0.116 and is not monotone), and it is not a
constant offset. **The hexes were authored independently and by eye.** So this is not one
correctable bug; it is two parallel sources of truth, and the contrast gate would silently
pick one.

The manifest already says which one wins — ADR-0020 calls `srgb` "the sRGB **fallback**" —
so the fix is structural, not a re-typing: **`srgb` stops being authored at all and becomes
engine-derived output.** This mirrors the corpus rule in F-011 ("derived values computed
from `xyz` by the engine at build time, never typed") and needs an ADR because it changes a
documented artefact's shape.

### 2. The approved manifest fails its own contrast gate — 5 pairings

With `oklch` authoritative and WCAG 2.2 AA thresholds (`@irodora/color-difference`):

| Pairing (light theme) | Ratio | Need |
|---|---|---|
| `status.ok` / `background` | 4.49 | 4.5 |
| `status.ok` / `surface.2` | 4.26 | 4.5 |
| `status.warn` / `background` | 3.92 | 4.5 |
| `status.warn` / `surface.1` | 4.04 | 4.5 |
| `status.warn` / `surface.2` | 3.72 | 4.5 |

Every dark-theme pairing passes. Reading the `srgb` field instead does not rescue it — it
produces **8** failures rather than 5, including `dark: ring / surface.3` at 4.47.

### 3. The approved manifest fails its own `cvdPairs` assertion — 5 of 18

`separationScore` at severity 1.0, `minSeparation: 60`:

| Pair | Deficiency | Dark | Light |
|---|---|---|---|
| `status.ok` / `status.warn` | protan | **50.3** | **55.7** |
| `status.ok` / `status.bad` | deutan | **52.7** | **47.8** |
| `status.warn` / `status.bad` | tritan | 67.2 | **44.4** |

This is the ordinary failure mode: three chromatic tokens spaced by hue and packed into a
0.11 band of lightness, so when hue collapses there is nothing left. The fix is the standard
one and the design system's own thesis — **carry the distinction in lightness**.

A search over `L` and chroma, holding the semantic hues (158° / 78° / 26°) and the approved
`warn > ok > bad` lightness ordering, finds a passing configuration close to the approved
one in both themes. That candidate is an input to the design review below, not a decision
this plan makes.

> The failures above are **the gate working**. They are recorded here so that the token
> changes which follow are visibly the consequence of a measurement, and not a designer's
> or an agent's preference.

---

## Approach

**Reused — everything that computes.** No colour maths is written in this package or in the
gate scripts; a second implementation of anything in `packages/color-*` is a defect by
definition (`AGENTS.md` §7).

| From | Used for |
|---|---|
| `@irodora/color-spaces` | `oklchToXyz`, `xyzToSrgb`, `srgbToLinearSrgb`, `linearSrgbToSrgb`, `xyzToOklch` — every derived value and all alpha compositing |
| `@irodora/color-difference` | `wcagContrast` (the gate) and the APCA `Lc` reported beside it |
| `@irodora/cvd-engine` | `separationScore` / `separationDetail` — the **same** definition the recommendation engine uses (E-005) |
| `@irodora/contracts` | nothing yet; tokens are not a wire type |

**New.**

- `packages/design-tokens/src/manifest.ts` — the manifest's TypeScript shape and a loader
  that validates it. The manifest is read at build time only.
- `packages/design-tokens/src/derive.ts` — `oklch → sRGB` and alpha compositing, both by
  delegation to the engine. The one place a token becomes a renderable value.
- `packages/design-tokens/src/emit/{css,ts,react-native,tailwind}.ts` — the four targets.
- `packages/design-tokens/src/status.ts` — the status/icon/text triple as a **type**, so a
  status expressible only as colour is not constructible.
- `scripts/verify-contrast.mjs` — gate 9. Reads the manifest, checks every declared pairing
  in both themes, reports APCA, checks the chroma ceiling and the `largeTextOnly`
  restriction.
- `packages/design-tokens/test/cvd-pairs.test.ts` — the `cvdPairs` assertion, run by gate 10.

**Two manifest additions, both because the gate needs to know what it is checking.**

1. **`usage`** on each colour token: `"text"` (default, 4.5) · `"largeText"` (3.0) ·
   `"nonText"` (3.0, per WCAG 1.4.11). Without it the gate has to guess a threshold, and a
   guess in a gate is worse than no gate. **The default is the strictest**, so an omission
   fails safe and any relaxation is a recorded, reviewable declaration.
2. **`compositeOver`** on each translucent token. `border.strong` appears in `cvdPairs`, and
   an `rgba()` has no separation score until it is composited. Compositing happens in
   **linear light** — blending in encoded sRGB is the same class of error as averaging in
   encoded sRGB [[averaging-non-linear-srgb-reads-too-dark]].

**Increments.** Each leaves the build green.

1. ADR: `oklch` is authoritative, `srgb` is derived. Regenerate all 38 hexes with the engine
   in the same commit; nothing else changes yet.
2. Manifest shape + loader + `derive.ts`, with tests. No emitters yet.
3. Gate 9 written, **watched fail on the 5 real failures above**, and left failing.
4. Design review of the token corrections (colour-scientist + designer), ADR, values
   changed, gate 9 green. Gate 9 activated in `gates.json` and CI.
5. `cvdPairs` assertion added to gate 10, watched fail on the 5 real failures, values
   already corrected in step 4, green.
6. The four emitters + their round-trip tests.
7. `status.ts` — the never-colour-alone type, with a compile-fail decoy.
8. Effects, docs, records.

---

## Files to touch

```
docs/adr/0043-the-oklch-field-is-authoritative-srgb-is-derived.md   — new
docs/adr/0044-<status-token-correction>.md                          — new, after review
docs/design/design-system.manifest.json      — srgb regenerated; usage + compositeOver added;
                                               status values corrected; exceptions recorded
docs/design/DESIGN-SYSTEM.md                 — the two new fields, and what the gate enforces
docs/design/ACCESSIBILITY.md                 — what the cvdPairs assertion actually asserts
packages/design-tokens/src/*                 — manifest, derive, emitters, status
packages/design-tokens/test/*                — unit, golden-output, cvd-pairs
packages/design-tokens/package.json          — deps on the three engine packages; scripts
scripts/verify-contrast.mjs                  — gate 9
package.json                                 — `test:contrast` script
.harness/verification/gates.json             — gate 9 → active, with its mutation proof
.github/workflows/ci.yml                     — the contrast step (ci-mirror enforces this)
.harness/state/effects.json + memory/effects — E-007 updated
```

---

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| **Manifest token values** | `@irodora/design-tokens` → CSS, TS, RN, Tailwind → `apps/web`, `apps/mobile`; gates 9 and 10 | **E-007**, `gate:contrast` — exists after increment 3. Both themes checked independently, because dark is not derived from light here |
| **`srgb` becomes derived** | anything that read the hex as authoritative. Today: nothing — no consumer exists | The gate recomputes and compares; a hand-edited hex fails |
| **`usage` / `compositeOver` added** | the manifest schema and its two readers | Loader validation; an unknown `usage` fails the load |
| **`cvdPairs` assertion added** | gate 10, `@irodora/cvd-engine` | **E-005** — the assertion must call `separationScore`, not re-derive a threshold |
| **`separationScore` semantics** | if F-029 moves its weights to content, this assertion's numbers move too | **E-009**, `guard: none` today. The design-system pairs become a *second* consumer of those weights — recorded, and it makes E-009's missing guard cost more |

**E-007's note is stale and will be corrected**: it names `border.focus` as "the token that
is easiest to get wrong". That token does not exist; it is `ring`.

---

## Test plan

- **Unit / property.** `derive.ts` round-trips: `oklch → sRGB → oklch` within tolerance for
  every in-gamut token, and every token is asserted in-gamut (`xyzToSrgb` does not clamp, so
  an out-of-gamut token would otherwise emit a silently clipped hex). Compositing is
  asserted against a hand-computed linear-light value, and against the encoded-sRGB blend it
  must **not** equal.
- **Golden.** No new published dataset — this feature computes nothing new. The emitters get
  committed expected outputs: four files, byte-compared, so an emitter change is visible in
  a diff rather than inferred.
- **Contrast (gate 9).** Every declared pairing, both themes, WCAG ratio against the
  threshold its `usage` selects, APCA `Lc` reported alongside. A WCAG/APCA disagreement is
  reported for design review, never used to pass a pairing.
- **CVD (gate 10).** All `cvdPairs` × {protan, deutan, tritan} at severity 1.0, both themes,
  against `minSeparation`.
- **Negative — with decoys, not empty fixtures** [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]:
  - a token nudged one `L` step below AA must make gate 9 exit 1 — and the **baseline must
    be asserted green in the same table**, because a decoy that was already failing proves
    nothing [[a-decoy-that-is-not-broken-proves-nothing]];
  - a `status` entry with its `iconToken` removed must fail to **compile**;
  - a hand-edited `srgb` hex must fail the derived-value check;
  - a `cvdPairs` entry pushed below `minSeparation` must make gate 10 exit 1;
  - the mutation must be run and its exit code recorded — **never inside a pipeline**
    [[a-pipe-discards-the-exit-status-a-gate-just-produced]].
- **E2E / a11y.** Not applicable: no rendered surface exists until F-017. The half of gate
  9's charter that scans rendered surfaces for colour-only status indicators is recorded as
  **not implemented here**, with its activation named.

---

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:golden
pnpm test:cvd
pnpm test:contrast
pnpm build
```

Evidence to capture: the pass line for each, the contrast table (every pairing, WCAG and
APCA, both themes), the separation table, and the **exit codes of every mutation** with the
baseline beside them. The evaluator runs the gates; the implementer does not certify itself.

---

## Risks and open questions

- **Changing an approved design system's values is a design decision, not a build fix.** It
  is in scope only because acceptance criteria 2 and 4 cannot be met otherwise, and the
  contrast rules are explicit that a failure is fixed by changing the colour — never by
  widening a tolerance. The change goes through the **colour-scientist** and **designer**
  reviewers and lands with an ADR carrying before/after measurements. If review rejects the
  candidate values, the feature stops at a recorded `exceptions[]` entry or an attestation
  — it does not proceed on my own taste.
- **The passing candidates clear `minSeparation` by ~1 point** (60.9 dark, 61.7 light).
  A margin that thin means the next token nudge re-breaks it. Prefer a candidate with real
  headroom even at a larger drift from the approved values, and say what the drift is.
- **The chroma ceiling as literally written outlaws the semantic tokens.** `surfaceAndText:
  0.01` versus `status.bad` at chroma 0.16. Either the ceiling means *neutral* surface and
  text tokens, or `ring` and `status.*` need recorded `exceptions[]` entries. Plan: implement
  the rule **literally** and record the exceptions — that is what the array is for, and it
  makes the count visible and reviewable rather than hiding it in a scope definition.
- **`foreground.3`'s `largeTextOnly` restriction is currently unenforceable**: the manifest
  claims the gate enforces it, but `foreground.3` appears in no `pairsWith` list, so nothing
  is checked. Measured: it clears 3:1 against every dark surface but reaches only **2.97**
  against `light.surface.3` and **2.86** against `light.swatch.well`. In scope here: the gate
  asserts a `largeTextOnly` token never appears in a normal-text pairing. Out of scope: the
  component-usage scan, which needs components (F-017).
- **`border` and `border.strong` are far from 3:1 once composited** (light theme: 1.08 and
  1.17). Neither is declared in any `pairsWith`, so neither is checked, and a decorative
  hairline beside tonal elevation is genuinely exempt. But `border.strong`'s role is
  "outlined controls", which is a UI component boundary. **Recorded as a finding for design
  review, not silently fixed** — expanding `pairsWith` here would be adding scope nobody
  reviewed against a requirement.
- **No `OQ-*` blocks this feature.**

---

## Out of scope

- Any React or Next.js consumption of the tokens — that is **F-017**, and it is blocked on
  F-016 independently.
- The rendered-surface half of gate 9's description (scanning components for colour-only
  status). No components exist. Recorded, with F-017 named as where it activates.
- Component-level enforcement that `foreground.3` is never used for small text.
- Changing `separationScore`'s weights or `minSeparation`. Tuning a threshold so a check
  passes is the anti-pattern this harness exists to prevent; the weights move in **F-029**.
- P3 output beyond the `@supports` upgrade block in the CSS emitter. The manifest declares
  no out-of-gamut token today.
