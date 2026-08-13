# Incident Response

| | |
|---|---|
| **Status** | Baseline |
| **Related** | [`../architecture/security/threat-model.md`](../architecture/security/threat-model.md) · [`../compliance/data-governance.md`](../compliance/data-governance.md) |

---

## Severity

| | Definition | Response | Comms |
|---|---|---|---|
| **SEV1** | Data breach · complete outage · **content compromise** · auth bypass | Immediate, all hands | Status page within 30 min; regulator within 72 h if personal data |
| **SEV2** | Major feature unavailable · severe degradation · error budget burning fast | Within 1 h | Status page |
| **SEV3** | Partial degradation · a workaround exists | Next business day | In-app if user-visible |
| **SEV4** | Minor, cosmetic, low impact | Backlog | None |

**Content compromise is SEV1**, and this is the classification most likely to be got wrong.
Nothing is down, no data has leaked, and every dashboard is green — but if someone can edit
the corpus or the rule weights, they change what every user is told without touching a line
of code. It is silent, product-wide, and invisible to conventional monitoring.

---

## The loop

```
detect → triage → contain → communicate → eradicate → recover → learn
```

**Detect.** Alerts, synthetic probes, error rates, user reports, security disclosures
([`SECURITY.md`](../../SECURITY.md)).

**Triage.** Assign severity and an incident lead. The lead **coordinates and does not
debug** — an incident lead with their head in a stack trace is not leading.

**Contain.** Stop the bleeding before understanding it. Roll back, disable a feature flag,
revoke a credential, pin a content version. Understanding comes after containment; the
reverse order is how a five-minute incident becomes an hour.

**Communicate.** Status page for SEV1 and SEV2. Say what is affected, what is not, and when
the next update comes — then send that update even if there is nothing new, because silence
is read as absence.

**Eradicate.** Fix the root cause, not the symptom.

**Recover.** Restore service. Verify with the gates, not by looking at a dashboard and
feeling reassured.

**Learn.** Blameless postmortem within 5 working days for SEV1 and SEV2.

---

## Runbook — content compromise

The unusual one, because the reflex responses do not apply.

```
1. PIN every client to the last known-good corpus version.
      Set IRODORA_CONTENT_VERSION and IRODORA_RULES_VERSION explicitly.
      This is why version pinning exists (ADR-0011).

2. VERIFY checksums across the whole version history.
      Which versions differ from their recorded checksum?

3. AUDIT every publish since the suspected compromise.
      audit_event holds actor, timestamp and a before/after diff.

4. IDENTIFY the vector — credential, admin bypass, database write, backup restore.

5. REVOKE and rotate. Every editorial credential, not only the suspected one.

6. REPUBLISH from verified source with a new version label.
      NEVER edit the compromised version — old envelopes must still resolve (FR-10).

7. ASSESS user impact. Which recommendations used the compromised version?
      This is an indexed query, because envelope.rules is its own column (data-model §5).

8. NOTIFY if recommendations were materially affected.
```

**Rolling back the application does nothing here.** The code is fine; the data it reads is
not. That is precisely why this runbook exists separately and is rehearsed separately.

---

## Runbook — data breach

1. Contain: revoke credentials, isolate the affected system, preserve evidence before
   changing anything.
2. Scope: what data, whose, how much, over what period. The audit trail is the source.
3. Assess risk to individuals.
4. Notify: supervisory authority within 72 h if required; individuals without undue delay
   if high risk ([data-governance §8](../compliance/data-governance.md)).
5. Remediate and verify.
6. Postmortem, including what monitoring should have caught it sooner.

## Runbook — full outage

1. Confirm scope with synthetic probes — is it us, the provider, or DNS?
2. Check the last deploy. Roll back first, diagnose second.
3. **Confirm clients have fallen back to the local engine** (NFR-6). If they have not, the
   fallback is broken and that is a second incident.
4. Status page within 30 minutes.
5. Restore, verify with gates, then write up.

---

## Postmortem

Blameless. **The subject is the system, not the person.** If a single person's action could
cause this, the system permitted it, and that is the finding.

```
What happened          timeline, in UTC, with evidence
Impact                 users, duration, data
Root cause             the actual cause, not the trigger
Detection              how we found out, and how long it took
Response               what we did, and what did not work
What went well         name it — it is how good practice survives
Action items           each with an owner and a date
```

**Every postmortem produces at least one of:**

- a new **gate** or test that would have caught it;
- a new **effect link** with its guard
  ([ADR-0030](../adr/0030-effects-graph-is-a-committed-artifact.md));
- a **lesson** in [`.harness/memory/lessons/`](../../.harness/memory/lessons/);
- a **rule** or ADR change.

> **Replay the original miss through any new gate.** A gate added after an incident that
> would not have caught that incident is a gate that makes us feel better without making us
> safer. Prove it fails against the original condition before trusting it.

A postmortem whose only output is "be more careful" has not found the cause.
