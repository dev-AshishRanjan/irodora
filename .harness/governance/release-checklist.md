# Release Checklist

Process: [`../../docs/operations/release-process.md`](../../docs/operations/release-process.md).

This is the human gate. Everything above it is automated; everything on it is a judgement a
machine cannot make.

---

## Every release

**Verification**

- [ ] All applicable gates green, evidence in [`../state/progress.md`](../state/progress.md)
- [ ] `e2e-full` green against one live deployment
- [ ] No gate skipped, quarantined, or "temporarily" disabled

**Data**

- [ ] Migrations are **expand/contract** and backward-compatible with the previous release
- [ ] Rollback verified: the previous image runs against the new schema
- [ ] Backup restore tested this week — **restored and queried**, not just taken

**Configuration**

- [ ] Every new `IRODORA_*` variable is in `.env.example`
- [ ] Corpus and rule versions pinned, or intentionally latest with the reason recorded
- [ ] Secrets rotated if due

**Deployment**

- [ ] **Deployed and verified on a real VPS** via Coolify or Dokploy
- [ ] Health and readiness endpoints correct on every service
- [ ] Rollback command to hand; status page ready

**Correctness and consequences**

- [ ] Effect graph updated; **no critical link without a guard**
- [ ] Golden datasets unchanged, or changed with an ADR
- [ ] Cross-platform identity test green

**Accessibility and language**

- [ ] Screen-reader pass: VoiceOver, TalkBack, NVDA
- [ ] Both locales rendered on every changed surface
- [ ] Claims lint green; no new banned construction

**Security and compliance**

- [ ] Threat model reviewed if a trust boundary changed
- [ ] Dependency audit clean of Critical and High
- [ ] Sub-processor list current if a dependency was added
- [ ] Retention jobs healthy

---

## Major releases, additionally

- [ ] **Real CVD user testing completed** (A10) — not simulated
- [ ] **Real screen-reader user testing completed**
- [ ] Device colour lab results updated if capture changed
- [ ] **Bias validation re-run** if the profile engine changed (NFR-23), with per-band
      accuracy reviewed
- [ ] Corpus source register reviewed
- [ ] Privacy design reviewed against what actually shipped

---

## Rollback triggers — decided now, not at 2 a.m.

| Trigger | Action |
|---|---|
| 5xx rate > 2 % | Roll back immediately |
| p95 above budget for 10 min | Roll back |
| **Corpus checksum mismatch** | Roll back **and** open a SEV1 |
| Any auth or tenancy failure | Roll back immediately |
| A journey fails synthetically | Roll back |

Deciding these in advance is the point. Deciding them while a graph climbs produces worse
decisions and slower ones.

---

## Three that block a release outright

**A red gate.** No exceptions, no "it's unrelated". If it is genuinely unrelated and
genuinely wrong, that is an ADR and a separate change — not a release-day judgement call.

**A known break that is unrecorded.** Record it, then decide whether to ship.

**An accuracy claim without a measurement behind it.** It is easier to remove before launch
than to retract after.
