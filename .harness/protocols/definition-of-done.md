# Protocol: Definition of Done

**Trigger:** deciding whether a feature is complete.

A feature is `done` only when **every** item below is true. If any fails, it stays
`in_progress`. There is no "done except for".

---

## Checklist

- [ ] **Acceptance met exactly.** Every item in the feature's `acceptance` in
      [`../state/feature_list.json`](../state/feature_list.json) is satisfied — **no more,
      no less.** Extra scope is as much a failure as missing scope; it is work nobody
      reviewed against a requirement.

- [ ] **Every criterion named its check** ([ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md)).
      A criterion is either **gated** — a gate or a named script proves it — or **attested**,
      declared in the feature's `attested` array with the activity that verifies it.

      **Attestation is not an escape hatch.** The bar is *"no check in this repository could
      prove it"*, not *"this would be awkward to test"*. Where part of a criterion is
      checkable, that part stays gated. The state gate holds the `criterion` text to the
      `acceptance` entry verbatim, so an attested criterion cannot be softened into
      something easier.

      A feature may be `done` with outstanding attested criteria. **A release may not** —
      gate 0 lists them on every run.

- [ ] **Gates green with evidence.** Every applicable gate in
      [`verification.md`](verification.md) passes, and the evidence — which ran, which did
      **not**, the commands, the result — is recorded in
      [`../state/progress.md`](../state/progress.md).

- [ ] **Tests added.** Unit and integration; e2e for user-facing; golden data for engine
      changes; conformance for adapter changes; property tests where a general invariant
      exists.

- [ ] **Effects traced.** [effect-link](effect-link.md) run; `effects.json` and its memory
      notes updated; **every dependent fixed or recorded**; no critical link left without a
      guard.

- [ ] **Docs current.** PRD, architecture and glossary updated if affected. New decisions
      have ADRs. **Every new `IRODORA_*` variable is in `.env.example`** — the `state` gate
      checks this.

- [ ] **Rules satisfied.** [Global rules](../rules/) and the scoped `AGENTS.md` honoured:
      types, security, boundaries, accessibility, claims language.

- [ ] **No silent debt.** No dead code. No stray `TODO` without a tracked follow-up. No
      commented-out blocks. No secrets. No `@ts-expect-error` without a reason and an issue.

- [ ] **State recorded.** `progress.md` updated; feature status set; reusable lessons
      captured via [continuous-learning](../skills/continuous-learning/SKILL.md).

- [ ] **Clean tree.** [clean-state](clean-state.md) satisfied.

---

## Additional, for colour engine changes

- [ ] Golden datasets updated **or** explicitly confirmed unchanged — and if a golden value
      changed, an ADR says why.
- [ ] Cross-platform identity test passes (Node, browser, React Native produce identical
      output).
- [ ] No new runtime dependency. No platform API. No `node:*`, `window`, `document` or
      `process`.
- [ ] The `cvd` gate passes if anything touched recommendation or separation.

## Additional, for corpus changes

- [ ] Every entry has complete provenance; the `content` gate is green.
- [ ] Author and reviewer are different identities.
- [ ] Classification is correct, and our own curation is labelled as ours.
- [ ] A new corpus version is minted; no published entry was edited in place.

## Additional, for user-facing changes

- [ ] `a11y` and `contrast` gates green.
- [ ] Both locales render correctly, at both text lengths.
- [ ] Keyboard completes the journey.
- [ ] No colour-only meaning anywhere.
- [ ] Copy passes the claims lint.

---

## Not done

| Claim | Why it fails |
|---|---|
| "It compiles and runs locally once" | No tests, no evidence, not reproducible |
| "Acceptance mostly met — close enough" | Acceptance is a contract, not a target |
| "There's a known break but it's minor" | A known break must be **recorded**, always |
| "The gate is flaky so I skipped it" | Flakiness is a defect. Fix or quarantine with a tracked feature |
| "I'll add the tests in a follow-up" | The follow-up is this feature |
| "It's done, I just need to clean up" | Clean-state is part of done |
| "Coverage is high" | Coverage measures execution, not assertion |

---

## Who decides

**Prefer the evaluator subagent.** The implementer knows what they intended and reads the
code as the intention. The evaluator reads it as the behaviour, which is the thing that
ships.
