# Plan: F-219 — The mockups introduce a class of claim the lint does not catch, and the pattern list grows to meet it

| | |
|---|---|
| **Feature** | F-219 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-21, NFR-2 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root — `.harness/verification/claims.json`, `scripts/verify-claims-proof.mjs` |
| **Author** | Claude (generator), 2026-09-14 |
| **Date** | 2026-09-14 |

---

## Intent

The mockups print constructions ADR-0031 forbids in spirit and `claims.json` does not catch in
fact. Golden rule 14 now tells every agent to build those mockups exactly, so the lint is the only
thing standing between a drawn claim and a shipped one. Done means: each construction below turns
the claims lint red in English and in Japanese, a real sentence of each is proven to trip it, and
the product's sanctioned honest phrasing is proven to stay green.

## What was measured before this plan (2026-09-14)

Every draft pattern was run over the 1,533 files the lint scans:

- **`N% match`** fires on four lines outside the policy documents — `apps/mobile/src/against-target.ts:30`,
  `apps/mobile/src/i18n/en.ts:665`, `.harness/plans/F-201-…:40`, one effects note. **All four are
  comments recording why the product refuses the phrase.** The pattern is right; those lines take
  `claims-ok:` with a reason, the marker's documented purpose.
- **`N% confidence` is DROPPED.** Its hits are `BRAND.md:112` and the i18n-copy skill — the *replacement*
  column, *"Estimated, 81% confidence, mixed lighting"* — and ADR-0005 and ADR-0044 using the same
  form. The voice guide sanctions it. Banning it would ban the honest sentence the policy exists to
  produce. **Acceptance criterion 1 is narrowed accordingly, with this reason in the notes.**
- The other four fire only in `R9-MOCKUP-FIDELITY.md`, `mockups/AGENTS.md`, `progress.md` (already
  policySource), `PRD.md` (already policySource) and R9's own feature text.

## Approach

**Reused:** the whole mechanism — `claims.json` entries, the lint's per-line case-insensitive match,
the three exemption kinds (`policySource`, `measured`, `claims-ok:`), and the proof's `sampleFor`
table, which already refuses to run if any banned id lacks a sample.

**New patterns** (each with its `why`, English and Japanese):

| id | catches | why |
|---|---|---|
| `percent-match` / `ja-percent-match` | *"97% Match"* | a percentage beside a distance reads as a probability of identity; naming returns a closest reference, never a match (FR-7) |
| `absolute-cvd-safety` / `ja-absolute-cvd-safety` | *"100% CVD-Safe"*, *"100% Distinguishable"* | separation is a score for specific colours under a model; "safe for everyone" is a claim about people |
| `verdict-harmony` / `ja-verdict-harmony` | *"Master Harmony"*, *"Perfect Harmony"* | a composite score presented as a verdict; FR-32 shows components, never a verdict in their place |
| `institution-grade` / `ja-institution-grade` | *"Museum-grade"* | borrows an institution's authority, as `professional-grade` borrows a profession's |
| `unmeasured-spectra` / `ja-unmeasured-spectra` | *"Extracting reflectance spectra"* | an RGB camera measures no spectrum; naming a quantity the pipeline never measures is a claim about the hardware |

**Exemptions:** only this plan joins `policySource`, as F-025's did. `R9-MOCKUP-FIDELITY.md` is a
living contract later R9 features will edit, and `mockups/AGENTS.md` has one quoting line, so each
quoting line takes `claims-ok:` with a reason instead — a whole-file exemption there would swallow a
real claim in a later edit. The four refusal comments take the same marker, as an aside right after
the quote. R9's feature text is **reworded** to describe the constructions rather than quote them;
`feature_list.json` is not exempted wholesale for the same reason.

**Increments:** patterns → samples and green controls → exemptions and rephrasing → lint green and
proof discriminating.

## Mockup fidelity

Not a visible change. **Governing mockup:** `all` — the lint polices the copy every mockup's
materialisation will carry.

## Files to touch

```
.harness/verification/claims.json            — ten patterns (widened after evaluation), one policySource entry
scripts/verify-claims-proof.mjs              — ten samples; three green controls; an exact [id] name check
apps/mobile/src/against-target.ts            — claims-ok: on the refusal comment
apps/mobile/src/i18n/en.ts                   — claims-ok: on the refusal comment
.harness/plans/F-201-…md, one effects note   — claims-ok: on the quoted refusal
docs/design/R9-MOCKUP-FIDELITY.md            — claims-ok: inside each quoting table row; the E2 sentence
mockups/AGENTS.md                            — rule 2, which said the lint could not see these
.harness/governance/measurement-claims.md    — the reading copy of the list, and a pointer to claims.json
.harness/skills/measurement-claims/SKILL.md  — the same
.harness/state/effects.json                  — E-089's guard, which read "NONE YET"
.harness/state/feature_list.json             — R9 text reworded; F-219 criterion 1 narrowed once, restored once
```

**Also touched as the work proceeded** (each disclosed in the revisions below): the fixtures in
`packages/testing/fixtures/claims/`; `scripts/verify-claims.mjs` (its printed scope);
`scripts/verify-mockups.mjs` (an identifier renamed for gate 15); `.gitleaks.toml` (an exact-token
entry for gate 15); `.harness/verification/gates.json` (stale counts); the records of F-221, F-233,
F-236, F-243, F-245, F-248, F-249, F-257, F-263 and F-271; `effects.json` and two effect notes;
`mockups/AGENTS.md`; three lessons and the memory index.

## Anticipated effects

- **Every future copy change** in both catalogues is now checked for five more constructions. The
  guard is the lint itself (gate 2) and its proof (CI). Existing link: E-089 (the claims lint reads
  Japanese) — extended, not replaced.
- **F-221, F-222, F-233, F-236, F-243, F-244, F-245, F-248, F-249, F-251, F-257, F-262, F-263** materialise elements whose drawn wording these
  patterns now refuse. That is the intent: the element is built, its words come from a definition.

## Test plan

- **Red:** one real sentence per new id, English and Japanese, written as copy a product might ship —
  not assembled from the regex.
- **Must stay GREEN:** *"Estimated, 81% confidence, mixed lighting"* (the voice guide's own
  sentence — the case that justifies dropping `% confidence`); *"analogous harmony"* and
  *"complementary harmony"* (FR-6's relationship names); *"a gradient"* (not "grade"); the product's
  real Japanese copy, unmutated (already a case); the clean fixture (already a case).
- **"Names the right construction":** each red case must be reported under its own id, so a
  sentence tripping a neighbouring pattern is caught — the proof already asserts this.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-claims.mjs && node scripts/verify-claims-proof.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

## Risks and open questions

- **Japanese patterns are the precision risk.** Each is run against `apps/mobile/src/i18n/ja.ts`
  before it lands; a pattern that trips real copy is narrowed, never exempted.
- No open question blocks this feature.

## Out of scope

Defining the figures OQ-9 asks about (F-222). Changing any screen.

## Revised after the first evaluation (FAIL, 2026-09-14)

- **A drawn form still passed** — mockup 10's CVD-distinction figure. The patterns were widened to the
  forms copy actually takes, in both languages, and calibrated against 51 variants that must fire and
  19 near-misses that must not.
- **Criterion 1 had been narrowed twice and only one was disclosed.** "Instruments or institutions" is
  restored; the pattern covers instrument grade as well.
- **`ja-absolute-cvd-safety` would have refused honest security copy.** Both alternatives now require a
  colour-vision term.
- **The proof's name check was a substring**, so an English case could pass on its Japanese mirror's
  hit. It matches `[id]` exactly.
- **Two whole-file exemptions were broader than the `$comment` allows.** Replaced by line markers.
- **Two documents still said the lint could not see these, and a rewording mangled F-236.** Fixed.

## Revised after the second evaluation (FAIL, 2026-09-14)

- **Three drawn safety claims were missing from the fidelity spec and from the patterns** — mockups
  07, 08 and 13 print a per-deficiency "Safe" beside a separation figure. Added to §4 E2 and caught.
- **"Calibrated against 51 variants" was not evidence**, because the set lived outside the repository.
  It now lives in `packages/testing/fixtures/claims/`: `drawn.md` (every claim construction the
  mockups draw, verbatim), `variants.md` (the forms copy takes), `near-misses.md`. The proof requires
  the lint to report every list line of the first two by number, and the third to pass whole. That is
  the bar; reach beyond it grows by adding a fixture line first.
- **Criterion 1 is restored to its original wording** except the one recorded change, and every edit
  made to it is listed in F-219's notes.
- **`ja-absolute-cvd-safety` fired on honest CVD-preview capability copy** (すべてのモードに対応).
  An absolute qualifier must now sit directly before the verb.
- **Grade language from instruments now reaches Japanese** (測色計, 計測器, 分光光度計). "Research-grade"
  and "reference-grade" are deliberately not caught — ADR-0061 uses the first honestly, and "reference"
  is a provenance source here.
- **The spec overstated what now fails the build.** Its E2 sentence names the claim rows the lint
  enforces, and the rows resolved by binding instead.
- **The confirmed journal-ordering defect is F-271**, as the effect-link protocol requires.

## Revised after the third evaluation (FAIL, 2026-09-14)

- **`drawn.md` was not complete.** Every image was re-read: 00's CVD chip, 03's third line, 07's and
  13's fit-score "Match", 08's other two rows, and 15 **verbatim** (its typo included) are added.
- **Criterion 3 means the Japanese forms of the drawn constructions**, not only a mirror per pattern.
  They are in `variants.md`, held line by line like the English.
- **Every escaped variant the evaluators reported is a line in `variants.md`, with one exception** —
  the similarity percentage (*97% similarity*, *類似度97%*), which FR-7 requires and ADR-0048 defines
  as a stated scale; those two moved to `near-misses.md`. Every honest
  phrasing they found refused is a line in `near-misses.md` — including the measure screen's
  instruction to enter values from a spectrophotometer.
- **Calibration now reads the committed fixtures**, so what is calibrated is what the proof enforces.
- **This feature added the defect F-271 records** — a fixture exit after the journal opened. Fixed at
  the root for this script: the journal opens after every early exit, immediately before the first
  plant. F-271 is `backlog` with its effect link, as the protocol requires.

## Revised after the fourth evaluation (FAIL, 2026-09-14)

- **Structure, not vocabulary.** Word lists lost to punctuation: *Separation — Safe*, *Master-Harmony*,
  *Match (97%)*. Each class is now a figure or a term within a short window of the claim word, in
  either order. Every string the evaluator probed is a fixture line — 91 escapes in `variants.md`,
  52 honest phrasings in `near-misses.md`.
- **Honest warnings must stay sayable.** *May not be fully distinguishable* and *とは限りません* are
  what the product should say about a weak pair; a negation after the claim word clears it.
- **drawn.md says which classes it holds.** Claims of other kinds (04's identical hue, 02's and 27's
  measurement) are §4 E2 rows with departures in their features, and are stated as outside the lint.
- **The limit a source lint cannot cross is stated and owned:** a figure and a label composed at
  render time. F-221 gains the criterion that runs the patterns over captured text.
- **Gate 15 was red at HEAD** — see the notes: a false positive from this session's own R9 commit.

## Revised after the fifth evaluation (FAIL, 2026-09-14)

- **Criterion 3 was not met as drawn.md stated it.** The Japanese forms of 08's and 13's verdicts
  passed the lint. Every drawn line now has its Japanese rendering in `variants.md`, one-for-one, and
  the header says where.
- **The reasons claimed more than the patterns do** — "punctuation cannot walk a line past it",
  "either order", "negated warnings cleared". A regular expression cannot be shown complete, so each
  reason now says only what the fixtures prove: what is caught, what is left alone, and that a form in
  neither file is not known either way. That is golden rule 11, applied to this feature's own words.
- Every string the evaluator found is a fixture line; negation now clears a disclaimer up to 24
  characters after "not", "n't", "never" or "no"; industrial-grade is refused again (nothing uses it).
- **Measured cost.** Timed per pattern over the 272,909 lines the lint scans: a negation lookbehind
  placed first made `institution-grade` cost 2,322 ms a pass. Placed at the end of the match, with its
  prefix bounded, it costs 147 ms; all thirty patterns 1,216 ms (436 ms for the twenty at HEAD); one
  whole lint pass 5 s. The fixtures show nothing it catches changed.
