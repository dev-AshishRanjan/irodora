# Plan: F-014 — Harmony engine

| | |
|---|---|
| **Feature** | F-014 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-6, and NFR-3 which constrains every line of it — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/color-harmony` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-18 |

> **Written directly rather than through the planner subagent.** `AGENTS.md` §2 recommends it
> for non-trivial work, and it was used for F-011 and F-013. Both plans contained a factual
> error about this repository that had to be caught during implementation — F-013's asserted
> "no cycle" between `color-core` and `color-naming` when `color-core` is the facade and
> depends on it. Having just built both adjacent packages, direct authorship is the more
> reliable path here. Recorded because it is a deviation from the recommended loop, not because
> it is a licence to skip planning.

---

## Intent

Given a colour, generate the classical harmonies around it — and return only colours the
display can actually show.

To a user: pick 藍鼠 in Palette Studio and get a triad, a split-complementary, a tonal ramp,
each one a set of real swatches rather than coordinates that clip to something else on screen.

**Two families, never blended.** Geometric harmonies are computed from first principles.
Editorial ones are curated relationships from the corpus, and are valuable *precisely because
they are not derivable from geometry* — so a result must always say which kind it is.

**No colour ships here.** The corpus is empty (F-012, blocked on OQ-4/OQ-5), so the editorial
family gets its structure and its adapter and no data. Third feature running with that shape;
the pattern is now established and is applied deliberately rather than rediscovered.

---

## What exists

`packages/color-harmony/src/index.ts` is a stub: a `HarmonyKind` union and
`HARMONY_VERSION = '0.0.0'`, with `dependencies: { '@irodora/color-spaces': 'workspace:*' }`.

**The stub's union is already wrong against the acceptance list.** It has nine members and
omits `near-neutral`, `warm-cool`, `value-contrast` and `chroma-contrast`; it also carries
`editorial` as a *kind*, which conflates the two axes — `editorial` is a **family**, and an
editorial harmony still has a relationship. Corrected in increment 1.

Three facts verified in the tree:

1. **`packages/color-harmony` is inside the colour-engine ESLint zone** (`packages/color-*`),
   whose override has **no `ignores` for tests**. No `node:*` anywhere, including fixtures.
   Same constraint F-013 worked under; same answer — everything generated in-process.
2. **`gamutMapDetail` preserves OKLCh hue by construction** (ADR-0045; F-009 measured 2.6 × 10⁻⁵ °
   before byte rounding). This is what makes criterion 4 compatible with FR-6's "stated
   tolerance" instead of in tension with it — see D2.
3. **`@irodora/color-core` is the facade and depends on `color-harmony`.** So this package may
   **not** depend on `color-core`, exactly as `color-naming` may not. The query is a `Triple`.

---

## Approach

### Reused

| What | From | For |
|---|---|---|
| `xyzToOklch`, `oklchToXyz` | `@irodora/color-spaces` | every generator's coordinate space |
| `gamutMapDetail`, `isXyzInGamut` | `@irodora/color-spaces` | criterion 4, and the ΔE00 cost of mapping |
| `deltaE00` | `@irodora/color-difference` | measuring what mapping cost, and the neutral/contrast checks |
| `srgbToHex` | `@irodora/color-spaces` | nothing here — hex is F-016's projection. Listed to say it is deliberately absent |
| The `fixture-` id convention, seeded generators, no fixture files | F-013's `test/synthetic.ts` | property tests over adversarial inputs |
| The structural-adapter pattern (`PublishedLabSource`) | `packages/color-naming/src/record.ts` | the editorial family, with the same no-cycle argument |

**No colour maths is implemented here.** Rotating a hue is arithmetic on an OKLCh triple;
everything that converts is `color-spaces`, everything that measures is `color-difference`.

### New — `packages/color-harmony/src/`

```
errors.ts      HarmonyError
kinds.ts       HarmonyKind (12 relationships) + HarmonyFamily ('geometric' | 'editorial')
geometry.ts    the hue/lightness/chroma operations, in OKLCh
generate.ts    generateHarmony — the facade; applies gamut mapping to every output
editorial.ts   EditorialSource (structural), editorialHarmoniesFrom
index.ts       HARMONY_VERSION → '0.1.0'
```

---

### D1 — The twelve relationships, and what each one is allowed to change

All in OKLCh. Rotating hue in HSL produces perceptually inconsistent steps
(`color-engine.md` §9), and a 30° step from yellow is not a 30° step from blue.

| kind | changes | holds |
|---|---|---|
| `monochromatic` | L | C, h |
| `tonal` | L **and** C together | h |
| `analogous` | h by ±30° | L, C |
| `complementary` | h by 180° | L, C |
| `split` | h by 180° ± 30° | L, C |
| `triadic` | h by ±120° | L, C |
| `tetradic` | h by 90°, 180°, 270° | L, C |
| `neutral` | C → 0 | L, h |
| `near-neutral` | C → a small stated ceiling | L, h |
| `warm-cool` | h to the warm and cool anchors | L, C |
| `value-contrast` | L by a stated step | C, h |
| `chroma-contrast` | C by a stated factor | L, h |

`tonal` versus `monochromatic` is the distinction most often collapsed, and the spec lists
both: monochromatic varies lightness alone, tonal varies lightness *and* chroma together, which
is what a dyer gets from dilution rather than from a lighter dye.

**`warm-cool` needs a decision, not a default.** "Warm" and "cool" are not geometric facts —
they are a convention about where the hue circle divides. The corpus already commits to one:
`taxonomy.temperature` is `warm | cool | neutral`, and F-012 will classify entries by it. So
the anchors here must be **stated constants with an ADR**, not a guess, and they must be the
same convention the corpus uses or the product will disagree with itself. **ADR-0049.**

---

### D2 — Gamut mapping is the whole tension in this feature, and it resolves cleanly

Criterion 4 says every generated colour passes gamut mapping. FR-6 says each generator returns
colours "within the requested relationship **to a stated tolerance**". Those pull against each
other: mapping changes the colour, so it could break the relationship the generator just built.

**It does not, and the reason is ADR-0045.** `gamutMap` reduces OKLCh **chroma** and holds
**L** and **h** — measured at 2.6 × 10⁻⁵ ° of hue drift. So:

- **Hue relationships survive mapping exactly.** A complementary pair is still 180° apart after
  both ends are mapped. This is the load-bearing consequence, and it is asserted rather than
  assumed.
- **Chroma relationships do not.** `chroma-contrast` asks for a chroma ratio, and mapping is
  free to reduce one end and not the other. So the *stated tolerance* for chroma-based
  relationships is necessarily weaker than for hue-based ones, and the result must **report what
  mapping cost** rather than pretend it was free.

Every generated colour therefore carries `wasGamutMapped` and `gamutDeltaE00`. That is the same
honesty `deriveColor` applies in the corpus, and it is what lets a caller say "less vivid"
rather than silently showing a different colour.

**The tolerance is measured and recorded, never guessed.** F-009's plan guessed a bound, was
wrong, and the investigation was the useful part; F-013 repeated the lesson. Here the test
measures the worst observed deviation across thousands of seeded inputs and asserts a bound
*above* it, with the measured figure printed.

---

### D3 — Family and kind are separate axes

The stub union puts `editorial` beside `complementary`, which cannot be right: an editorial
harmony still stands in *some* relationship, and a geometric one is still geometric whatever its
kind. Conflating them makes "keep the two families distinct" (criterion 3) unexpressible.

```ts
type HarmonyFamily = 'geometric' | 'editorial';

interface Harmony {
  readonly family: HarmonyFamily;
  readonly kind: HarmonyKind;
  readonly source: Triple;              // the OKLCh the caller asked about
  readonly colors: readonly HarmonyColor[];
  /** Editorial only: which corpus palette this came from, for attribution and FR-10. */
  readonly provenance: { readonly paletteSlug: string; readonly corpusVersion: string } | null;
}
```

**`provenance` is `null` for geometric and required for editorial**, enforced at construction —
an editorial harmony with no attribution is exactly the "our curation presented as fact" failure
ADR-0007 exists to prevent, pointed at harmonies instead of colours.

---

### D4 — The editorial family has no data, and says so

Editorial harmonies come from corpus palettes (`content/palettes/`), which are empty. So F-014
ships:

- `EditorialSource` — a **structural** description of the palette shape it reads, for the same
  no-cycle reason as F-013's `PublishedLabSource`. `@irodora/color-harmony` gains **no**
  dependency on `@irodora/corpus`.
- `editorialHarmoniesFrom(source)` — the adapter.
- The compatibility guard as a test in **`packages/corpus`**, where the schema is owned.
- Tests over generated palettes, printing the real palette count (`0`).

**Not built:** any editorial harmony content. That is F-012's palettes and F-029's rules.

---

## Increments

| # | Increment | Verified by |
|---|---|---|
| 0 | This plan; `feature_list.json` gains `plan` | `state` |
| 1 | devDeps; `errors.ts`, `kinds.ts` — the corrected 12-kind union and the family axis | `typecheck`, `lint`, `test`, `build` |
| 2 | **ADR-0049** (warm/cool anchors) + the anchors as stated constants | `state`, `test` |
| 3 | `geometry.ts` — the OKLCh operations, hue wrapping, property tests | `test` |
| 4 | `generate.ts` — every generator, with gamut mapping applied to all output | `test` |
| 5 | **The relationship tolerances, measured and printed**, plus the decoy: an HSL-space rotation, watched to fail | `test` |
| 6 | `editorial.ts` + the compatibility test in `packages/corpus` | `typecheck`, `test` |
| 7 | Docs and state: `color-engine.md` §9, E-016 + note + index, `progress.md`, notes | `state` |
| 8 | Full gate run, evidence captured | all |

---

## Test plan

**Golden.** None, and saying why matters: harmony makes **no new claim about physical
reality**. It composes `xyzToOklch`, `oklchToXyz` and `gamutMap`, all of which carry cited
golden datasets under gate 5. A "golden harmony dataset" would be our own definitions
transcribed — the trap `color-golden` exists to prevent. The generators' correctness is
asserted **definitionally**, the way F-009's gamut dataset is.

**Property (`fast-check`, recorded seeds):**

- Every generated colour is **in sRGB gamut** after mapping — criterion 4, over thousands of
  sources including deliberately out-of-gamut ones.
- **Hue relationships survive gamut mapping** to a measured bound. This is the D2 claim.
- Hue arithmetic wraps correctly: 350° + 30° = 20°, never 380°.
- `complementary(complementary(c))` returns to `c`'s hue.
- `neutral` produces chroma exactly 0; `near-neutral` at or below its stated ceiling.
- `monochromatic` holds hue and chroma; `tonal` holds hue only.
- Determinism: same input, same output, twice.

**Negative — decoys, never empty fixtures:**

| # | Decoy | Must |
|---|---|---|
| 1 | **The same rotation performed in HSL** rather than OKLCh | produce a measurably different perceptual step — the measurement that justifies the whole design |
| 2 | Skipping gamut mapping | leave out-of-gamut colours in the output, caught by the gamut property |
| 3 | An editorial harmony with `provenance: null` | throw |
| 4 | A geometric harmony carrying provenance | throw |
| 5 | Hue arithmetic without wrapping | produce 380°, caught |

Decoy 1 is the important one: `color-engine.md` asserts HSL rotation is perceptually
inconsistent, and this feature is built on that assertion. **A claim the repository makes and
never measures is the class of defect the last two features each shipped one of.**

---

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:golden                # non-regression: this feature consumes gate 5's datasets
node scripts/verify-engine-purity.mjs && node scripts/verify-guards.mjs
```

**Evidence:** every gate's result; the new test count; recorded seeds; the measured relationship
tolerances; the HSL-versus-OKLCh comparison; the printed real-palette count (`0`); an explicit
**Not run** list.

---

## Risks and open questions

- **`warm-cool` is a convention, not a fact.** It needs ADR-0049 and it must match the corpus's
  `taxonomy.temperature`, or the product disagrees with itself.
- **Chroma-based relationships have a weaker tolerance than hue-based ones**, because gamut
  mapping moves chroma. Stated, measured, and reported per colour rather than hidden.
- **No `OQ-*` blocks this feature.** OQ-4/OQ-5 attach to F-012 and gate only the editorial
  *content*, not its structure.
- **The stub's `HarmonyKind` is wrong** and changing it is a (tiny) breaking change to a
  published type. Nothing consumes it yet.

## Out of scope

- **Editorial harmony content — F-012 palettes, F-029 rules.**
- **Scoring or ranking harmonies — F-031.** This generates; it does not judge.
- **Serving harmonies — F-016.** **Palette Studio — F-020.** **The Lens — F-022.**
- **Hex output.** F-016's projection.
- **Accessibility filtering of generated palettes** (CVD separation, contrast) — F-032 and the
  surfaces. A harmony is a relationship, not a recommendation.
