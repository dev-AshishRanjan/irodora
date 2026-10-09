# E-185 — The engine names the checks a capture failed

**Link:** `color-sampling#QualityAssessment.failures` (with `QUALITY_CHECKS`, `QUALITY_CHECK_RULES`,
`QUALITY_INSTRUCTIONS`, `failedChecks`) → `LensReading.qualityFailures`, `lens/modes.ts`, `lens/refusal.ts`
**Guard:** `checks.test.ts` (order, class from count, instruction from the first failure, rules
from one table; decoys) · the existing quality tests unchanged · `typecheck` · `color-golden`
**Severity:** high **Feature:** F-236

---

## Why B changes when A does

27's refused card names the check that failed, its threshold and the fix. Before F-236 the engine
returned a class and one instruction, so a refusal would have had to re-derive which check failed,
with a second copy of the thresholds. Now the engine names its failures in its own fix-first order,
and the Lens reads the first one, with the threshold from the same table the comparison uses.

## What did not move

No comparison, threshold, class or instruction. The existing tests pass unchanged; that is the
evidence, and `color-golden` was run beside it.
