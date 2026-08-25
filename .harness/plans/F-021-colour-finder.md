# Plan: F-021 — Colour Finder

| | |
|---|---|
| **Feature** | F-021 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-47 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/corpus` · `content/rules` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

One field. A person types a name, a reading, a kanji, a hex, or a phrase like *"dark muted
green"*, and gets the colours that answer it — with the app saying which kind of question it
decided to answer.

**Done, to a user:** type `藍`, get 藍-something. Type `ai-nezumi`, get it. Type `#526A6B`, get
the nearest corpus entries ranked by how far they actually are. Type `dark muted green`, get
dark muted greens, and see the region that phrase resolved to.

## Approach

### Three query kinds, and the routing is a decision rather than a guess

```
1. looks like a hex        →  nearest entries by ΔE00
2. every part is a lexicon term  →  a lightness/chroma/hue region
3. otherwise               →  name search across kanji, kana, romaji, English, slug
```

**A phrase query requires every part of the query to be a known term.** One unrecognised word
and it falls to name search. That is what keeps the branch deterministic: the lexicon is the
entire vocabulary, there is no fuzzy matching and no synonym inference at run time, and *"dark
muted green"* cannot half-succeed.

### The hex branch is already built

`nameColor` from `@irodora/color-naming` (F-013) returns candidates ranked by `deltaE00`, and
its two-stage search is **provably** the answer a full scan would give — that is E-015 and the
package's own equivalence suite. `namingRecordsFrom` adapts a published bundle by shape.

Nothing about nearest-match is written in this feature. Writing it would be a second
implementation of a ranking this repository already owns.

### The lexicon, and what measurement decided

Criterion 3 asks for a **versioned lexicon in `content/rules`**, which is empty today. Two
things were measured against the 120 authored entries before anything was designed.

**The authored bands are perfectly separable, so the lexicon and the taxonomy can be one
definition rather than two:**

| Band | OKLCh range observed | Gap |
|---|---|---|
| `lightnessBand: dark` | 0.186 – 0.390 | → 0.400 |
| `lightnessBand: mid` | 0.400 – 0.716 | → 0.734 |
| `lightnessBand: light` | 0.734 – 0.962 | |
| `chromaBand: low` | 0.005 – 0.038 | → 0.040 |
| `chromaBand: mid` | 0.040 – 0.098 | → 0.102 |
| `chromaBand: high` | 0.102 – 0.134 | |

Zero nulls, zero overlap. So the boundaries are **0.40 / 0.72** and **0.04 / 0.10** — round
numbers chosen for legibility, *verified* to agree with all 120 authored bands rather than
fitted to them. A content-gate check asserts that agreement, so *"dark"* has one meaning in the
Finder and in the Atlas instead of two that drift.

**Hue is meaningless below a chroma floor, and the corpus proves it.** `charcoal` spans hue
58°–268°; `off-white` 66°–246°; `pink` 10°–340°. Their hue is noise, because their chroma is
near zero. A hue term that filtered on hue alone would return greys for *"green"*.

So **every hue term carries a chroma floor**, and a term may constrain more than one axis. That
also disposes of the classic trap: *brown* is not a hue, it is dark low-chroma orange, and the
lexicon says so.

### The versioning mechanism, and where it stops

[ADR-0011](../../docs/adr/0011-recommendation-rules-are-versioned-content.md) already describes
rule content as `id · label · published_at · immutable · checksum`. This builds exactly that,
**for the lexicon only**:

```
content/rules/phrase-lexicon.2026.08.1.json   the lexicon, with provenance and a rationale per term
content/rules/index.json                      the rule ledger: label, published date, digest
```

Two files, because **a file checked against a checksum it carries verifies itself** — the same
separation ADR-0066 makes for the corpus, for the same reason. The generated app module carries
the lexicon *text* and the *ledger's* digest as separate exports.

**F-029 is not being built.** No weights, no normalisation to 1.0, no occasion contexts, no
harmony rules. This feature builds the smallest versioning mechanism a lexicon needs; F-029
extends it to weights, and E-009 stays exactly as it is.

**Reused:** `nameColor`, `namingRecordsFrom`, `buildNamingIndex` (`@irodora/color-naming`) ·
`parseProvenance`, `requireMatch`, `rejectUnknownKeys` and the rest of `primitives.ts`
(`@irodora/corpus`) · `sha256`, `assertSha256`, the corpus bundle's load pattern
(`apps/mobile/src/corpus`) · `SearchField`, `Chip`, `Swatch`, `Surface`, `Text` (`@irodora/ui`) ·
the screen and component conformance suites.

**New:** `packages/corpus/src/lexicon.ts` — the schema and the phrase resolver, in the package
that owns content schemas and has no platform dependencies · the lexicon content and its ledger ·
`apps/mobile/src/finder.ts` — routing and search · `apps/mobile/src/screens/Finder.tsx`.

### Increments

1. `lexicon.ts` — schema, term shape, region resolution; unit tests with decoys.
2. The lexicon content + rule ledger + a register row for rule content.
3. `verify-content.mjs` — validate the lexicon, verify its digest, and assert the
   band/region agreement. Watched failing before it is trusted.
4. `generate-rules-bundle.mjs` + `--check`, wired into gate 11 beside the corpus one.
5. `apps/mobile/src/finder.ts` — routing, hex, phrase, name. Tests without rendering.
6. i18n, `Finder.tsx`, route, Home link, screen assertions.
7. ADR, effects, memory, progress.

## Files to touch

```
packages/corpus/src/lexicon.ts              — NEW: schema + phrase → region
packages/corpus/src/index.ts                — export it
packages/corpus/test/lexicon.test.ts        — NEW
content/rules/phrase-lexicon.2026.08.1.json — NEW
content/rules/index.json                    — NEW: the rule ledger
docs/content/licensing-and-provenance.md    — a register row for rule content (E-021)
scripts/generate-rules-bundle.mjs           — NEW, with --check
scripts/verify-content.mjs                  — validate + digest + band agreement
package.json                                — the --check joins gate 11
apps/mobile/src/rules/generated/lexicon.ts  — NEW, generated
apps/mobile/src/finder.ts                   — NEW: routing and search
apps/mobile/src/screens/Finder.tsx          — NEW
apps/mobile/app/find.tsx                    — NEW route
apps/mobile/src/screens/Home.tsx            — a way in
apps/mobile/src/i18n/{en,ja}.ts             — the copy
apps/mobile/test/finder.test.ts             — NEW
apps/mobile/test/screens.test.tsx           — register the screen
docs/adr/0069-…                             — NEW; plus the index row
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **`content/rules` gains content** | the rule ledger · the generated app module · the Finder | `script:generate-rules-bundle.mjs --check` in gate 11 — **new link**. E-009 is untouched: that link is about weights reaching `@irodora/recommendation`, and this is neither |
| **The lexicon's boundaries** | every authored `lightnessBand` / `chromaBand` · the Atlas's filters | `gate:content` — the **new agreement check**, which is why one definition can serve both |
| **The source register** | the new rule-content row | `gate:content` — E-021, existing |
| **The message key set** | `ja.ts` · every render site | `gate:typecheck` — E-016 |
| **New Japanese copy and lexicon terms** | the bundled font subset | `script:verify-font-coverage.mjs` — E-017, which has now fired on four consecutive features |
| **A new screen** | the conformance registry · `a11y-scope.mjs` | `gate:a11y` |

## Test plan

- **Unit / property:** term matching is longest-first and order-independent; intersecting two
  terms on the same axis narrows rather than replaces; a query with one unknown part is not a
  phrase query at any position.
- **Golden:** none new. The hex branch's ranking is `@irodora/color-naming`'s, already golden.
- **Agreement:** every authored `lightnessBand` and `chromaBand` in the corpus falls inside the
  lexicon region of the same name — asserted over all 120 entries, in the content gate.
- **Determinism:** the same query returns the same slugs in the same order, and the lexicon's
  `versionId` is reported with the result so an answer can be replayed.
- **Negative, with decoys:**
  - a near-neutral entry whose hue lies in the green arc must **not** be returned for *"green"* —
    the decoy is the whole reason hue terms carry a chroma floor, and `charcoal` at hue 128°–158°
    supplies it from real data;
  - a hex query that is not a valid hex falls to name search rather than throwing;
  - the band-agreement check is watched failing on a deliberately widened boundary, with the
    baseline green either side;
  - `--check` is watched failing on a hand-edited generated module.

## Verification

```
node scripts/verify-state.mjs
node scripts/gate.mjs typecheck && node scripts/gate.mjs build
node scripts/gate.mjs test
node scripts/gate.mjs test:a11y && node scripts/gate.mjs test:contrast
node scripts/verify-content.mjs && node scripts/verify-font-coverage.mjs
node scripts/verify-cache-scope.mjs
```

`test` is expected to stay **red in `color-spaces` and `color-difference`** on this workstation
— Node 22.16.0 against a repo pinning 24.19.0, F-083 and F-093. The evidence to capture is a run
of the packages this feature touches, and the pre-existing failures named rather than folded in.

**`e2e` is in this feature's verification list and cannot run.** F-091 carries gate 7, and this
is the fifth feature to report it.

## Risks and open questions

- **The lexicon is editorial judgement about English and Japanese colour words**, written by one
  editor with no Japanese reviewer — the same standing limitation as the corpus (ADR-0060,
  OQ-5). Every term carries a rationale, and the Japanese terms are declared unreviewed rather
  than presented as checked.
- **The boundaries agree with the seed corpus and could stop agreeing.** That is what the
  content-gate check is for: the next entry authored across a boundary fails the build and
  someone decides, rather than the two definitions drifting quietly.
- **A phrase and a name can collide.** Resolved by precedence (hex → phrase → name) plus the
  all-parts-known rule, and stated on screen: the Finder says which question it answered.
- **Scope pressure toward F-029.** The versioning mechanism is built for the lexicon only. If
  it starts growing weight semantics, that is F-029 arriving early and should be stopped.
- No `OQ-*` blocks this feature.

## Out of scope

Weights, harmony rules, occasion contexts and anything that has to sum to 1.0 (**F-029**) ·
fuzzy or phonetic matching · search over saved palettes or user data · ranking name matches by
relevance beyond a stable order · the Lens (**F-040**) · sharing a result (**F-023**).
