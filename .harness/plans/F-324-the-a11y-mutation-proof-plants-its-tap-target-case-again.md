# Plan: F-324 — The a11y mutation proof plants its tap-target case again

| | |
|---|---|
| **Feature** | F-324 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/verify-a11y-proof.mjs`. No product code, no dependency. |
| **Author** | The implementing session (a contained harness fix; no planner subagent) |
| **Date** | 2026-10-14 |

---

## Intent

CI is red at *Gate 8 — a11y mutation proof*. The person reported it on 2026-10-14:

> a tap target below the platform minimum: the source to mutate is not there any more — case UNRUNNABLE

The case anchors on `minWidth: nativeTapTarget,\n        minHeight: nativeTapTarget,` in
`packages/ui/src/Button.tsx`. F-232 increment 4 (`3802c00`) removed both lines. Since then a Button
has been drawn at its mockup's height and reaches the target through `hitSlop={hitArea(height,
height)}` (ADR-0114). The case has been unable to plant ever since, and the proof's CI step has been
red the whole time.

After this feature, the case plants the defect that matters today: the hit area is forgotten. Gate 8
must report `tap-target` for it, and the proof's CI step is green on a clean tree.

## Approach

**One case changes.** It now anchors on `hitSlop={hitArea(height, height)}`, which appears exactly
once in `Button.tsx`: in `LabelledButton`. `IconOnlyButton` uses `hitArea(size, size)`. The
replacement is the empty string, which models the real defect: a control drawn at its mockup's size
with no hit area. *(Corrected after the review, M1: this said F-239's switch shipped this way. It did
not. The switch was raised to 68 × 44, so its drawn size was the target, because the rule could not
yet read a hit area.)*

The arithmetic is `tapTargetReach`'s (E-156). With the slop gone, the reach is `height` × `minWidth`,
which is `BUTTON_HEIGHT` × `BUTTON_HEIGHT` = 32 × 32. That is under 44 (iOS) and under 48 (Android),
so gate 8 must report `tap-target`.

**Kept exactly as they are:**

- The anchor is still an exact string. If the source moves again, the case reports UNRUNNABLE and the
  proof fails. That is criterion 2, and it is the behaviour that caught this.
- The five other cases. Each anchor was checked against today's source and each is present.

**Reused:** the proof's case table, its journal (F-173, F-296) and its baseline-first-and-last
structure. Nothing new.

**Increments:**

0. Claim and plan.
1. The case is re-anchored. It is watched UNRUNNABLE on the tree as it is, then planting and
   caught after the change.
2. Close-out: effects, records.

## Mockup fidelity

Not applicable. No surface changes; the proof restores every file it plants into.

## Files to touch

```
scripts/verify-a11y-proof.mjs   — the tap-target case's anchor, replacement and comment
.harness/state/effects.json, .harness/memory/effects/the-target-is-the-hit-area-and-the-rule-adds-it-back.md (E-156's guard and note), feature_list.json, progress.md
```

## Anticipated effects

| id | from → to | guard |
|---|---|---|
| **E-156** (existing, critical) | `hitArea` → every control → `tapTargetReach` → gate 8 | Gains a guard: the a11y mutation proof plants a Button with no hit area, and gate 8 must report `tap-target` |

| **E-020** (existing, critical; added after the review, S1) | `packages/ui` → its gates and readers | Gains the proof as a dependent. Its six anchors are exact text in Button.tsx, Swatch.tsx, Surface.tsx and Text.tsx, and a moved anchor fails CI as UNRUNNABLE |

No new link.

## Test plan

- **Watched failing first:** `pnpm verify:a11y:prove` on the tree as it is exits 1 with the person's
  message, and leaves no journal (F-296).
- **After the change:** the same command exits 0. All six cases are caught, including `tap-target`.
  The baseline is green first and last.
- **The plant discriminates (decoy), BY HAND:** the proof prints only `→ tap-target` and checks that
  the gate's output contains the rule's name. So whether the finding is the Button's is checked once
  by hand: plant the anchor's removal, run `pnpm --filter @irodora/ui test:a11y`, and every
  `tap-target` line must be a Button subject at its drawn size (32 × 32), then restore. *(Corrected
  after the review, M2: this read as if the proof itself made the check.)*
- **Criterion 2 still holds:** a case whose anchor is absent still fails the proof. This is unchanged
  code, demonstrated once by hand on a scratch copy of the anchor.

## Verification

```
# Tier 1 per increment (ADR-0132): format:check, typecheck, the root lint, state
# plus the domain gate: pnpm verify:a11y:prove, and pnpm --filter @irodora/ui test:a11y
# Tier 2 once: state, typecheck, lint, format, build, security, node scripts/verify-ci.mjs --all
```

## Attestations

None. Both criteria are run by the proof itself, in CI.

## Risks and open questions

**No `OQ-*` blocks this feature.**

1. **R1: the case reaches CI only after the steps before it pass.** The person's report shows that CI
   now reaches gate 8's proof, so nothing earlier hides it.

## Out of scope

- F-271: the general check for a journal opened before an early exit.
- F-340: the Android lane's artefact proof, the person's other report. It follows as its own feature.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | `8a7990d` | Claimed at the person's report. F-340 was filed (todo) for their second report, the Android lane. **Tier 1:** format:check 0, verify-state 0. |
| 1 | `c13e6c4` | **The case re-anchored.** It was watched failing first: on the tree as it was, `pnpm verify:a11y:prove` exited 1 with the person's message and left no journal. After the change it exits 0, with six of six caught. By hand, the plant made gate 8 report `tap-target` at 32 × 32 of 44 (and at 11 × 11 and 14 × 14 for the smaller Button subjects), and Button.tsx was restored. **Tier 1:** format:check, typecheck, verify-state and lint each 0. `turbo test --filter='...[HEAD]'` was 0 and ran no task: the change is a root script. |
| 2 | `ad35563` | E-156 names the proof as a guard and a dependent, and its note has an F-324 section. **Tier 1:** format:check and verify-state 0. |
| review | this commit | **The one review (evaluator): FAIL as delivered.** It had no blocking finding: 1 significant and 4 minor. **Its Tier 2 on `ad35563`:** state, typecheck, lint, format:check, build and verify:a11y:prove each exited 0. `pnpm security` exited 1 on F-322's nine advisories. `verify-ci --all` was 36 passed, 2 failed and 0 not run: the iOS config half on win32, and gate 15, which is F-322. *Gate 8 — a11y mutation proof* was green, and no plant journal was left at any point. **Its own checks:** with the plant applied in memory, 160 findings, every one `tap-target` and every one on a labelled Button subject, while the unplanted run had none. A scratch copy anchored on the old text still exits 1 with the person's message. Each finding was fixed: |
| | | **S1, fixed.** The proof's inputs were not linked from the files they match. It reads exact text in Button.tsx, Swatch.tsx, Surface.tsx and Text.tsx, and no link from those files led to it, so the next edit there would trace nothing. E-020 (`packages/ui` →) now lists the proof, with its CI step as a guard and an F-324 section in its note. E-156's addition stays, because it records the defect the case models. |
| | | **M1, fixed.** The comment and this plan said F-239's switch shipped with no slop. The record says it was raised to 68 × 44. Both are corrected. |
| | | **M2, fixed.** The test plan read as if the proof checks that the finding is the Button's. That check is a hand plant, and the plan now says so. |
| | | **M3, fixed.** E-156's note now names the proof in its guard line. |
| | | **M4, fixed.** `progress.md` says that the CI evidence is the local mirror on win32 and that the GitHub run has not been observed. |
