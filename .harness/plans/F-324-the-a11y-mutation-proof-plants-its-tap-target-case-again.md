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
with no hit area. F-239's switch shipped this way.

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

No new link. The proof reads `Button.tsx`, and E-156 already names that file and the gate.

## Test plan

- **Watched failing first:** `pnpm verify:a11y:prove` on the tree as it is exits 1 with the person's
  message, and leaves no journal (F-296).
- **After the change:** the same command exits 0. All six cases are caught, including `tap-target`.
  The baseline is green first and last.
- **The plant discriminates (decoy):** the proof prints the gate's reason. The `tap-target` line must
  name the Button's reach (32 × 32), not some other control.
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
