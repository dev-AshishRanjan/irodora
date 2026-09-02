# Requirements Coverage

Every requirement in [`PRD.md`](PRD.md) maps to at least one feature in
[`.harness/state/feature_list.json`](../.harness/state/feature_list.json) and to the
gate(s) that prove it.

**This matrix is machine-checked.** The `state` gate fails if a requirement exists in the
PRD but appears nowhere here, if a feature claims a requirement that does not exist, or if
a requirement is claimed by no feature. Coverage cannot silently rot.

| Legend | |
|---|---|
| `state` | harness integrity — always |
| `golden` | `color-golden` — engine vs reference datasets |
| `cvd` | CVD separation regression |
| `content` | corpus provenance completeness |
| `a11y` / `contrast` | platform accessibility APIs and token/surface contrast |
| `perf` | on-device latency budgets |
| `e2e` | journeys against the running app |
| `sec` | secret scan, dependency audit |
| `artifact` | the BUILT APK — permissions, version and signer read out of the file that ships |
| `review` | human sign-off recorded against the feature — used only where no automated check can decide |

> **Half of this table is derived.** The **feature** and **release** columns are computed
> from `feature_list.json`, because they drift: the release column alone was wrong in 38 PRD
> rows after the roadmap changed. The **label** and **gate** columns are written by hand,
> because they express intent — which gate *proves* a requirement is a judgement, and
> deriving it from each feature's full gate list yields noise like `format` under "engine
> accuracy".
>
> Requirements withdrawn by [ADR-0051](adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
> are **absent by construction**: they are no longer declared in the PRD, so nothing needs to
> cover them. Their record is [PRD §12](PRD.md#12-withdrawn-requirements).

---

## Functional requirements

| Req | Feature(s) | Gate(s) | R |
|---|---|---|---|
| FR-1 Colour conversion | F-006 | golden, test | R1 |
| FR-2 Colour difference | F-007 | golden, test | R1 |
| FR-3 Contrast | F-007 | golden, contrast | R1 |
| FR-4 CVD simulation | F-008 | golden, cvd | R1 |
| FR-5 CVD separation score | F-008 | cvd, test | R1 |
| FR-6 Harmony generation | F-014 | test, golden | R1 |
| FR-7 Colour naming | F-013 | test, golden | R1 |
| FR-8 Gamut mapping | F-009 | golden, test | R1 |
| FR-9 Provenance on every colour | F-010 | typecheck, test | R1 |
| FR-10 Reproducibility envelope | F-010 | test | R1 |
| FR-11 Explanation objects | F-028, F-031 | test, e2e | R3 |
| FR-12 Offline engine | F-039, F-040 | e2e | R2 |
| FR-13 Live pick | F-040 | e2e, perf | R2 |
| FR-14 Garment scan | F-040 | e2e | R2 |
| FR-15 Precision pick | F-040 | test, e2e | R2 |
| FR-16 Calibrated scan | F-053 | golden, review | R5 |
| FR-17 Lighting assessment | F-040 | test, e2e | R2 |
| FR-18 Capture quality | F-040, F-069 | test, e2e | R2 |
| FR-19 Pattern extraction | F-064 | test, golden | R5 |
| FR-20 Colour Atlas | F-012, F-018 | e2e, a11y | R1 |
| FR-21 Colour record fields | F-011, F-012, F-018 | content, test | R1 |
| FR-22 Contemporary palettes | F-012 | content, review | R1 |
| FR-23 Colour classification | F-011 | content, test | R1 |
| FR-24 Provenance display | F-011, F-018 | content, e2e | R1 |
| FR-25 Corpus versioning | F-011 | content, test | R1 |
| FR-26 Guided profile setup | F-026 | e2e, test | R3 |
| FR-27 Photo-assisted profile | F-027 | test, review | R3 |
| FR-28 Professional profile entry | F-055, F-129 | test | R5 |
| FR-29 Compatibility scoring | F-028 | test, perf | R3 |
| FR-30 Profile is multidimensional | F-026 | typecheck, test | R3 |
| FR-31 What goes with this | F-030 | test, perf, e2e | R3 |
| FR-32 Outfit scoring | F-031 | test, e2e | R3 |
| FR-33 Outfit builder | F-045 | e2e, a11y | R4 |
| FR-34 Occasion weighting | F-029, F-065, F-130 | test, content | R3 |
| FR-35 CVD outfit mode | F-032 | cvd, e2e | R3 |
| FR-36 Outfit scanner | F-054 | test, e2e | R5 |
| FR-37 Preference feedback | F-046 | test | R4 |
| FR-38 Alternatives and swaps | F-030 | test, e2e | R3 |
| FR-39 Wardrobe item model | F-042 | test, typecheck | R4 |
| FR-40 Add garment | F-043 | e2e, perf | R4 |
| FR-41 Browse and filter | F-042, F-122, F-131 | test, a11y, contrast | R4 |
| FR-42 Coverage score | F-048 | test, perf | R4 |
| FR-43 Gap analysis | F-048 | test | R4 |
| FR-44 Duplicate detection | F-049 | test | R4 |
| FR-45 Capsule optimisation | F-050 | test, perf | R4 |
| FR-46 Cost-per-wear | F-051 | test | R5 |
| FR-47 Colour finder | F-021 | test, e2e | R2 |
| FR-48 Colour compare | F-019 | e2e, a11y | R2 |
| FR-49 Palette Studio | F-020 | e2e, a11y | R2 |
| FR-50 Shareable cards | F-023 | e2e, contrast | R2 |
| FR-51 Exports | F-056, F-129 | test, a11y | R5 |
| FR-52 Shopping check | F-052, F-123 | test, e2e | R5 |
| FR-55 Local-only mode | F-039 | e2e | R2 |
| FR-56 Offline storage | F-041 | test, e2e | R2 |
| FR-58 Export and deletion | F-035 | test, e2e, review | R2 |
| FR-61 Pro workspace | F-055 | e2e, a11y | R5 |
| FR-65 PDF reports | F-056, F-129 | test, review | R5 |
| FR-67 Rules as content | F-029 | test | R3 |
| FR-68 Editorial review workflow | F-011 | content, e2e | R1 |

## Non-functional requirements

| Req | Feature(s) | Gate(s) | R |
|---|---|---|---|
| NFR-1 Engine accuracy | F-006 | golden | R1 |
| NFR-2 Measured capture accuracy | F-053, F-063 | review | R5 |
| NFR-3 Determinism | F-006, F-073, F-083 | golden, test | R1 |
| NFR-4 Latency | F-038 | perf | R3 |
| NFR-7 Scale | F-041 | perf, review | R2 |
| NFR-8 WCAG 2.2 AA | F-003, F-017, F-067, F-068, F-069, F-070 | a11y | R0 |
| NFR-9 Never colour alone | F-003, F-017, F-067 | contrast, a11y | R0 |
| NFR-10 CVD usability | F-008 | cvd, e2e | R1 |
| NFR-11 en/ja i18n | F-017 | test, e2e | R2 |
| NFR-12 On-device privacy | F-040, F-080 | e2e, artifact | R2 |
| NFR-13 Data protection | F-042 | test, sec | R4 |
| NFR-14 Security baseline | F-004, F-080 | sec, test, artifact | R0 |
| NFR-17 Offline capability | F-039, F-041 | e2e | R2 |
| NFR-19 Testability | F-004, F-006, F-071, F-080 | test, state | R0 |
| NFR-20 Content provenance | F-011 | content | R1 |
| NFR-21 Claims discipline | F-025 | lint | R1 |
| NFR-22 Ethical guardrails | F-037 | test, typecheck | R3 |
| NFR-23 Bias testing | F-027, F-037 | test, review | R3 |
| NFR-24 Boundary enforcement | F-001, F-002, F-072, F-073 | lint | R0 |

---

## Requirements with only `review` coverage

Three requirements cannot be fully decided by a machine, and pretending otherwise would be
worse than admitting it. Each carries a **named human sign-off recorded against the
feature**, and each has an automated check covering the part that *can* be automated:

| Req | What a machine cannot decide | What is automated anyway |
|---|---|---|
| FR-22 Contemporary palettes | Whether a curated palette is *good* | Schema, role completeness, provenance |
| NFR-2 Capture accuracy | Whether the device matrix is representative | The ΔE arithmetic and the results table format |
| NFR-23 Bias testing | Whether the validation set is genuinely representative | Per-band coverage minimums and the accuracy computation |

There were four. **NFR-6 (availability) left with the server** — "whether degradation is
graceful to a user" is not a question a local-first app asks, because there is nothing to
degrade from.

A `review` entry is a commitment that a person looked, recorded what they checked, and
signed. It is not a placeholder for "we did not automate this yet" — where automation is
possible it is required.
