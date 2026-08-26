# Plan: F-037 — Ethical guardrails and bias validation

| | |
|---|---|
| **Feature** | F-037 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-22, NFR-23 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/store` · `scripts/` · `@irodora/recommendation` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

Two guarantees, and they are different in kind.

**NFR-22 is structural and buildable today**: no field for a protected characteristic can be
added, and no code path infers one. F-026 built half of it; this widens it and takes it out of
SQL, where it currently stops.

**NFR-23 is a study and cannot be done here at all**: an ITA°-stratified validation set of real
people. What this feature can do is make its absence *loud* — and make the thing it would gate
refuse to claim more than it has meanwhile.

## Approach

### Criterion 1 — widen the prohibition, and watch each addition fail

`packages/store/src/prohibited.ts` already refuses `skin*`, `complexion`, `ethnic*`,
`rac(e|ial)*`, `attractive*`/`beauty*`, `body_*`/`bmi`. F-037's criterion names two more
families:

- **age** — `age`, `age_band`, `birth_*`, `date_of_birth`, `dob`
- **health** — `health*`, `medical*`, `diagnosis`, `condition`, `pregnan*`, `disability`

`age` is the one that needs care: `\bage\b` matches nothing else here, but `average`, `image`,
`storage`, `language`, `usage` all contain it. The word boundary handles those; **the test
plants every one of them as a decoy** so the rule is watched *not* firing as well as firing.

### Criterion 2 — the check leaves SQL

The existing rule only reads migration SQL and `sqlite_master`. *"No code path infers a protected
characteristic"* is a claim about **source**, and a column check cannot see a function called
`inferEthnicity` that never touches the database.

So: a repo-level script, `scripts/verify-no-inference.mjs`, scanning shipped TypeScript for
identifiers in the prohibited vocabulary — reusing the store's own `PROHIBITED_IDENTIFIERS`
rather than a second list (E-013). Wired into `lint`, which is where the other boundary checks
already live.

**The hard part is the false positives, and they decide whether the rule survives.** This
repository legitimately contains `skin` in prose, `race` inside `bracelet`-shaped words, and —
critically — `prohibited.ts` and its test are *made of* the banned vocabulary. A check that
fired on them would be deleted within a release. The exemption is **by path**, small, and each
path says why, exactly as `verify-claims.mjs` exempts `claims.json`.

### Criteria 3 and 4 — make the absence loud

Neither can be discharged here. What this feature adds instead:

1. **Both are attested, blocking release** — 4 already is; 3 joins it.
2. **The engine states the gap where it would be quoted.** `PHOTO_CEILING` already caps a
   camera estimate at 0.5 *because* NFR-23 has not run. This feature adds the same discipline
   to the guided path's own ceiling comment and to `docs/`, so the reason is in the code rather
   than only in a state file.
3. **A test asserts the ceiling is still capped** — so nobody raises it while the study is
   outstanding without a failing test asking them why.

That last one is the only genuinely new *guard* NFR-23 can have before the study exists, and it
is worth having: it turns "we have not measured this" from a note into a condition.

**Reused:** `PROHIBITED_IDENTIFIERS` and `findProhibited` (F-026), the `verify-claims.mjs`
exemption pattern, `PHOTO_CEILING` (F-027). **New:** two prohibition families, the source scan,
its proof, tests.

## Files to touch

```
packages/store/src/prohibited.ts       — the age and health families
packages/store/test/prohibited.test.ts — planted, and the false-positive decoys
scripts/verify-no-inference.mjs        — NEW. The source scan
scripts/verify-no-inference-proof.mjs  — NEW. Watched failing, watched staying green
package.json                            — wire it into `lint`
.github/workflows/…                     — the CI mirror, which gate 0 checks
apps/mobile/test/profile.test.ts        — the ceiling is capped while NFR-23 is outstanding
.harness/state/feature_list.json         — criterion 3 attested
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| The prohibition vocabulary widens | every future migration, and now every source file | `gate:test` + the new `lint` step |
| A new lint step | CI must run it, or it guards nothing on a push | **gate 0's `ci-mirror` check**, which compares `run:` lines against the gates |
| An exemption list | the check's own credibility — an over-broad exemption is how a rule stops covering anything | The proof plants a violation **inside a non-exempt path** and asserts it is caught |

## Test plan

- **Criterion 1, both directions:** `age`, `age_band`, `date_of_birth`, `health_condition`,
  `diagnosis`, `pregnancy_status` each planted as a real migration and watched failing; and
  `average`, `image`, `storage`, `language`, `usage`, `percentage` asserted **not** to fire.
- **Criterion 2:** the scan reports a planted `inferEthnicity` in a non-exempt file, and reports
  nothing on the repository as it stands. Both halves, in the proof.
- **The exemption is narrow:** the proof asserts a violation planted in a normal source file is
  caught *while* the exempt paths stay green — so widening the exemption to silence a real
  finding fails the proof.
- **NFR-23's condition:** `PHOTO_CEILING <= CONFIDENCE_MAJORITY` asserted with a comment naming
  the study, so raising it while the study is outstanding fails.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
node scripts/verify-no-inference-proof.mjs
```

**Known red and pre-existing:** `test` on `color-difference` and `color-spaces` (Node-22 ULP).

## Risks and open questions

- **Criterion 3 cannot be done and must not look done.** A held-out ITA°-stratified validation
  set is a study with human participants. Attested, blocking release, with the *shape* of the
  study named so the attestation is actionable rather than a shrug.
- **The source scan is the risky part.** A check that fires on prose gets deleted; a check with
  a generous exemption covers nothing. The proof is what keeps it honest, and it must assert
  both directions or it is theatre.
- **This feature cannot make the product safe.** It makes one class of failure structurally
  impossible and leaves the other clearly outstanding. Saying so is part of the deliverable.

## Out of scope

The validation study itself · changing the guided or photo derivations · a fairness metric
nobody has defined · scanning generated or third-party code.
