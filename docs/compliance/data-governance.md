# Data Governance

| | |
|---|---|
| **Status** | Baseline · reviewed each release |
| **Implements** | FR-58, NFR-13, NFR-15, NFR-22 |
| **Related** | [`../architecture/security/privacy-design.md`](../architecture/security/privacy-design.md) |

> Engineering and operational policy, not legal advice. Positions marked *pending counsel*
> require confirmation before the release that depends on them.

---

## 1. Applicable regimes

| Regime | Applies | Key obligations |
|---|---|---|
| **GDPR / UK GDPR** | EU/EEA and UK users | Lawful basis, subject rights, DPIA, breach notice ≤ 72 h, records of processing |
| **India DPDP Act 2023** | Indian users | Consent notice, purpose limitation, Consent Manager, breach notice, children's data |
| **CCPA / CPRA** | California users | Notice, opt-out of sale/share (we do neither), deletion, correction |
| **App store policies** | iOS, Android | Privacy nutrition labels, data safety declarations, permission justification |

**We do not sell or share personal data for advertising**, which removes a large class of
obligation and is a product commitment
([ADR-0027](../adr/0027-monetisation-tiers.md)), not merely a current state.

---

## 2. Lawful basis

| Processing | Basis |
|---|---|
| Account, authentication, sync | Contract |
| Wardrobe images | Consent — sync is **off by default** |
| Personal colour profile | Consent |
| Photo-assisted profile setup | Explicit consent, per use |
| Product analytics | Legitimate interest (opt-out); consent in EU/UK |
| Security and audit logs | Legal obligation, legitimate interest |
| Billing | Contract, legal obligation |

**Camera frames for colour detection are not processed by us at all.** They never leave the
device ([ADR-0026](../adr/0026-privacy-on-device-by-default.md)), so no lawful basis is
required — which is the strongest privacy position available and a direct consequence of
the architecture.

---

## 3. Special-category data

The personal colour profile is **appearance-adjacent**. As modelled — ranges and
tendencies, never a skin colour value
([ADR-0010](../adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md)) — it is not
special-category data under GDPR Art. 9.

We treat it with elevated care regardless:

- explicit consent;
- never in telemetry, enforced by a redaction test;
- deleted on request, immediately;
- **no inference of ethnicity, health, age or any protected characteristic** — not as a
  policy, but as an absence of any code or schema that could (NFR-22).

The schema has no skin colour field, and a migration that adds one is rejected. Treating
the safest design as also the most compliant one is not a coincidence.

---

## 4. Retention

| Data | Retention | Then |
|---|---|---|
| Wardrobe images | Until deleted | Hard delete + de-index |
| Wardrobe metadata | Until deleted | Hard delete |
| Personal colour profile | Until deleted | Hard delete |
| Recommendations | 24 months | Aggregated, de-identified |
| Analytics events | 25 months | Deleted |
| Sessions | Expiry + 30 days | Deleted |
| Audit events | 7 years | Deleted |
| Sync tombstones | 90 days | Deleted |
| Support correspondence | 24 months | Deleted |
| Billing records | 7 years | Retained (legal obligation) |
| Corpus versions | Indefinite | Retained — reproducibility requires it; contains no personal data |

Retention is enforced by scheduled jobs, and a job that has not run successfully is an
alert. A retention policy that depends on someone remembering is not a policy.

---

## 5. Subject rights (FR-58)

| Right | How | Target |
|---|---|---|
| Access / portability | `POST /v1/me/export` → machine-readable archive | Minutes; 30 days max |
| Erasure | `DELETE /v1/me` → hard delete + de-index | Minutes; 30 days max |
| Rectification | In-app; profile correction is first-class | Immediate |
| Restriction | Account suspension without deletion | Immediate |
| Objection | Analytics opt-out | Immediate |
| Automated decision-making | Not applicable — no profiling with legal effect. Recommendations are deterministic, explainable, and advisory | — |

**Erasure reclaims, it does not merely delete.** A row deleted from SQLite while its
text remains in a search index, its key in a cache, or its id in a sync tombstone has not
been erased. The erasure job enumerates every store — database, blob storage, search index,
cache, tombstones, backups within the restore window — and a re-query against each is what
proves it, not the job's exit code.

---

## 6. Sub-processors

Users are notified before a new sub-processor begins processing their data. The current
list is published at `irodora.com/legal/subprocessors`.

| Purpose | Provider | Location | Safeguard |
|---|---|---|---|
| *Populated as each is engaged.* | | | |

**The self-hosted profile has no sub-processors at all**
([ADR-0016](../adr/0016-deployment-profiles-local-vps-cloud.md)) — a genuine advantage for
customers with residency requirements, and a direct product benefit of the deployment
portability decision.

---

## 7. International transfers

EU/UK data can be kept in-region. Region is a deployment choice, not an architectural
change, because every infrastructure dependency sits behind a port.

Where a transfer occurs, Standard Contractual Clauses plus a transfer impact assessment
apply. *Pending counsel before the first EU launch.*

---

## 8. Breach response

| Step | Target |
|---|---|
| Detect and contain | Immediate |
| Assess scope and risk | 24 h |
| Notify supervisory authority (if required) | 72 h |
| Notify affected individuals (if high risk) | Without undue delay |
| Postmortem | 5 working days |

Full procedure: [`../operations/incident-response.md`](../operations/incident-response.md).

**Content compromise is a governance incident, not only a security one.** Someone who can
edit the corpus or rule weights changes what every user is told without touching code. It
carries its own runbook because rolling back a deployment does nothing for it.

---

## 9. Children

Not directed at children. Minimum age 13, or 16 where local law requires. No age-gated
personalisation, no advertising, no profiling. Age is self-declared at sign-up; we do not
collect date of birth.

---

## 10. Records of processing

Maintained as required by GDPR Art. 30, derived from the data inventory in
[`privacy-design.md` §2](../architecture/security/privacy-design.md#2-data-inventory).
Reviewed each release, and whenever a new data category or sub-processor appears.

## 11. Accountability

| Role | Responsibility |
|---|---|
| Data controller | Irodora (entity registered on incorporation) |
| Privacy contact | privacy@irodora.com |
| Security contact | security@irodora.com |
| DPO | *Assess on EU launch — required if scale or nature triggers Art. 37* |
