# E-220 — An occasion the content stops publishing breaks a page

**Link:** `occasionRuleSet` (`apps/mobile/src/rules.ts`) → `wear.ts#wearCombination`, `Wear.tsx`,
`content/rules` **Guard:** `occasion-rules.test` (the same verified file as `ruleSet()`; a tampered text
refused for an occasion too; a version lacking one of `07`'s occasions refuses it by name); `wear.test`
(Office and Casual pick differently for some colour) **Severity:** medium **Feature:** F-248

---

## Why B changes when A does

`07`'s occasion control names four of FR-34's published weightings — Casual, Office, Japanese-inspired,
Formal (ADR-0151 D1) — and the page ranks under whichever is chosen. `occasionRuleSet` reads it from the
same verified weights file as `ruleSet()`: one digest check against the ledger, one rationale count.

`ruleSetFor` refuses an occasion the published version lacks, by design: a silent fallback to `default`
would print rankings under a context nobody published. So a weights publish that drops one of the four
makes the page throw for that segment. The screen's list (`WEAR_OCCASIONS`) and the content move
together, or the publish is refused here first.

## What it does not guard

- **That a weighting is right.** Its rationale is the editor's; no weight here rests on a study.
- **A fifth occasion.** Adding one to the screen is a mockup question (rule 14).

Related: [[the-combination-is-the-engines-four-pieces-scored-once]].
