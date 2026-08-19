# Incident response

| | |
|---|---|
| **Status** | Baseline for R2 |
| **Version** | 2.0 · 2026-08-19 |
| **Supersedes** | Version 1.0, which described paging, error budgets and a rollback of a running service — none of which exist after [ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) |

---

## What changed, and why this document still exists

A local-first app cannot have an outage. There is no service to be down, no error budget to
burn, no dashboard to watch and nobody to page at 3am. Version 1.0 of this document is void
in every particular.

It would be a mistake to conclude that incidents went away. **They got slower, more
permanent, and harder to see.**

| | A server incident | An app incident |
|---|---|---|
| Detection | Alert, within minutes | A store review, days later — **we have no telemetry** ([ARCHITECTURE §9](../architecture/ARCHITECTURE.md#9-observability--what-we-gave-up)) |
| Blast radius | Everyone, until fixed | Only users who updated — but them, until *they* update |
| Rollback | Redeploy, minutes | Store review, hours to days. OTA is faster but JS-only |
| Data loss | Restore from backup | **Irrecoverable.** There is no backup but the user's own export |

That last row is the one that matters. On a server, a bug that corrupts data is bad. On this
product, a bug that corrupts the database destroys data that exists nowhere else.

---

## Severity

| | Definition | Response |
|---|---|---|
| **S1** | Data loss or corruption, or the encryption key is exposed or lost | Halt rollout immediately. Stop-the-line: nothing else ships until it is understood |
| **S2** | The app crashes on launch, or a core journey is broken, for a identifiable group of devices | Halt rollout. Fix forward or OTA-revert within one working day |
| **S3** | A feature is broken, with a workaround; a wrong colour value ships | Fix in the next release. Correct the record if a colour value was wrong |
| **S4** | Cosmetic, or affects a rare path | Normal backlog |

**A wrong colour value is at least S3, never S4**, even though it looks cosmetic. The
product's claim is that its answers are reproducible and sourced. A wrong value shipped
under that claim is a correctness failure, and it stays visible until an update ships.

---

## The first hour

1. **Establish which builds are affected.** Version, platform, OTA update id. Without
   telemetry this comes from store reviews, direct reports, and reproducing locally on the
   device matrix.
2. **Halt the rollout** before diagnosing. A staged rollout is the only lever that works in
   minutes; use it first and think second. This is the reverse of server practice, where
   diagnosis usually precedes action, and it is correct here because exposure grows while
   you think.
3. **Decide OTA or store.** An Expo OTA update ships JS in minutes. Anything touching native
   code, permissions or the SQLCipher configuration needs a store build.
4. **If data is involved, say so before fixing.** An in-app notice telling users to export
   before updating is worth more than a fast fix that silently loses records.

---

## Data-loss incidents

Handle these differently from everything else.

- **Never ship a migration as an OTA update.** OTA carries JS, and a schema change delivered
  without a native build can meet a database it was not written for. Migrations ship in
  store builds only.
- **A failed migration must leave the previous database intact** and surface an actionable
  error. An app that opens a half-migrated database is worse than one that refuses to start
  ([ARCHITECTURE §7](../architecture/ARCHITECTURE.md#7-data)).
- **The recovery path is the user's export.** That is the whole plan, which is why FR-58 is a
  first-release feature and why the app prompts for an export before destructive actions. If
  an incident reveals people were not exporting, the finding is about the export flow, not
  about the bug.

---

## Security disclosure

See [`../../SECURITY.md`](../../SECURITY.md) for the reporting channel.

Two classes matter most here:

- **The database key leaking** into a log, a crash report or a backup file defeats SQLCipher
  entirely. Treat as S1 — encryption at rest is the whole of the at-rest guarantee.
- **A dependency advisory** reaching the shipped bundle. The `security` gate blocks Critical
  and High before merge; anything already shipped needs a release, since there is no server
  to patch.

**A finding rotates the secret; it never earns an allowlist entry.** Unchanged from version
1.0, and the only line of it worth keeping.

---

## Afterwards

A blameless write-up for every S1 and S2, recorded as a lesson in
[`.harness/memory/lessons/`](../../.harness/memory/lessons/) when it is reusable, and as a
feature in [`feature_list.json`](../../.harness/state/feature_list.json) when it needs a
guard.

The question that closes an incident is not "is it fixed" but **"what check would have
caught it, and does that check exist now?"** An incident that produces a fix and no gate has
taught us nothing, and the same class will return.
