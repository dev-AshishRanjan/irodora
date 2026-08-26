# ADR-0011 — Recommendation weights and harmony rules are versioned content, not code

## Status

Accepted

## Date

2026-08-13

## Context

Recommendation quality is an editorial judgement expressed as numbers. How much should
lightness balance matter relative to personal compatibility? Is a warm-neutral pairing
worth more in a Japanese-contemporary context than a Scandinavian-minimal one?

These are questions for someone with colour and fashion expertise, and the answers will be
tuned continuously. If they live in code, every tuning is a deployment, every experiment
needs an engineer, and the person with the actual expertise cannot touch the thing they
are expert in.

There is a second problem, and it is the one that bites later. A recommendation stored six
months ago was produced by weights that have since changed. Without versioning, "why did
it suggest that?" is unanswerable — and for a product whose entire proposition is
explainability, that is a fundamental failure rather than a support inconvenience.

## Decision

**Weights and rules are content: versioned, immutable once published, and recorded in
every result's reproducibility envelope.**

```
rule_version              id · label ('2026.08.4') · published_at · immutable · checksum
recommendation_weight     rule_version_id · factor · weight · context
harmony_rule              rule_version_id · from_family · to_family · score
                          context[] · source · rationale
```

Example rule, as content:

```json
{
  "rule": "muted-indigo-to-ecru",
  "score": 0.92,
  "context": ["casual", "minimal", "japanese-contemporary"],
  "source": "editorial-v3",
  "rationale": "Low-chroma indigo against warm off-white is a documented staple of contemporary Japanese casual dress; high lightness contrast with minimal temperature conflict."
}
```

1. **Published rule versions are immutable.** A change mints a new version. Editing a
   published version is impossible, not discouraged.
2. **Every recommendation stores `envelope.rules`** (FR-10), as an indexed column, so
   "which recommendations used 2026.08.4?" is a query rather than a scan.
3. **A weight change requires no deployment** (FR-67), which is the point.
4. **Every rule carries a `rationale`.** A weight without a stated reason cannot be
   evaluated, defended or safely changed by the next person.
5. **Weights are content, so they are a trust boundary.** Publication only through the
   admin application, checksum-verified at load, every publish audit-logged with a diff
   (see [`../architecture/security/threat-model.md`](../architecture/security/threat-model.md) §9).
6. **Defaults sum to 1.0** and the constraint is validated at publish time. A weight set
   that does not normalise produces scores that are not comparable across contexts, which
   is a silent failure.

## Consequences

**Good.** Editorial expertise is applied by editorial people, at editorial speed.
Historical recommendations remain explainable indefinitely. Experiments become content
changes with an audit trail. A bad tuning is reverted by publishing the previous version,
not by a rollback.

**Bad.** Weights are now a security-relevant asset with its own protection requirements —
somebody who can edit content changes what every user is told without touching code. It
adds a content publication pipeline and a review workflow. Loading and validating rules at
startup adds a boot-time dependency, and a corrupt rule version must fail loudly rather
than falling back to defaults, because silently reverting to code defaults would produce
unexplainable results.

**Neutral.** The engine reads weights; it does not own them. `@irodora/recommendation`
takes a rule version as an input, which also makes it trivially testable with fixture
weights.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Weights as constants in code** | Simplest, type-checked, versioned by git. Every tuning becomes a deployment; the domain expert cannot act; and historical explanation requires checking out an old commit and hoping the surrounding code still runs |
| **Weights in environment variables** | No deployment needed. No versioning, no audit trail, no rationale field, and no way to know which values produced a stored result |
| **Learn weights from feedback** | Would adapt automatically. Violates [ADR-0002](0002-deterministic-core-tiered-capability-policy.md) — recommendations would stop being reproducible and explanations would become post-hoc narration |
| **Per-user weight overrides only** | Personalisation without a content system. Does not address the global tuning problem, and per-user preference weights (FR-37) already exist as a separate, additive mechanism |

## What ADR-0051 removed, and what survives — added by F-029, 2026-08-26

This decision was written on **2026-08-13**, when the product had a server tier and an admin
application. [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) removed
both. Recording that here rather than leaving the text to age, because the parts it invalidates
are specific and the rest is untouched
([[prose-in-a-state-file-rots-and-no-schema-can-see-it]]).

**Does not survive.**

- *"A weight change requires no deployment"* (§3). In a local-first app new content ships in a
  new build. **FR-67's own wording is the one that holds** — *changing a weight changes rankings
  without a **code** change* — and that is precisely what F-029 made true and what gate 11
  checks: the engine is byte-identical between two occasions and only the rule set differs.
- *"Publication only through the admin application, every publish audit-logged with a diff"*
  (§5). There is no admin application. **The pull request is the publish path**, the two-file
  diff is the audit log, and review is the control. Gate 11 prints that limitation on every run.

**Survives unchanged, and is now enforced** ([E-009](../../.harness/state/effects.json)):

- §1 immutability — the ledger digest fails on a published file that changed, proven by altering
  a single word in a rationale;
- §4 a rationale on every weight — required, non-empty, with a floor under the length;
- §6 weights sum to 1.0, validated at publish time — by the engine's own `parseRuleSet`, called
  from the gate, so there is one definition rather than two.

§2 (`envelope.rules` as an indexed column) is still owed and belongs to F-030, which is the first
feature that stores a recommendation.

## Revisit when

- The number of context-specific rule sets makes a flat weight table unmanageable and a
  hierarchy or inheritance model is needed.
- Editorial demand justifies a staging environment for rule versions — which, without a server,
  would mean a second published version and a build flag rather than an environment.
