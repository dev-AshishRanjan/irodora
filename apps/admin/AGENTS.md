# AGENTS.md — `apps/admin`

> **Scoped harness. Extends [`../../AGENTS.md`](../../AGENTS.md), which still applies in
> full.** Stricter, never looser.

The internal content management application. Corpus entries, palettes, translations, rule
weights, sources and licences.

---

## This application is a trust boundary

**Whoever can write here changes what every user is told, without touching a line of code.**

It is silent, product-wide, and invisible to conventional monitoring — nothing is down, no
data has leaked, and every dashboard is green. That is why content compromise is a **SEV1**
with its own runbook
([incident-response](../../docs/operations/incident-response.md)), and why rolling back a
deployment does nothing for it.

Treat this application as more security-sensitive than the public API, not less.

## Non-negotiable

- **No corpus change is possible outside this application in production.** Direct database
  writes are not an operational shortcut; they are the vector.
- **Every publish is audit-logged** with actor, timestamp and a before/after diff.
- **Published entries are immutable.** A correction publishes a new version. Old
  reproducibility envelopes must still resolve (FR-10).
- **Author and reviewer must be different identities.** Enforced, not conventional.
- **An entry cannot reach `published`** without complete provenance and a recorded reviewer.
- **Weights sum to 1.0**, validated at publish time. A set that does not normalise produces
  scores that are not comparable across contexts, and fails silently.

## Roles

`owner` · `admin` · `editor` · `member` · `viewer`.

**Editor and publisher are separate.** An editor who can also publish removes the review
step that the whole workflow exists for.

Role changes take effect immediately and are audit-logged.

## Checksums are verified at load, not only at write

A publish path can be secured. A database restored from a compromised backup, or a corpus
file swapped on disk in a self-hosted deployment, **never passes through the write path**.

Verifying at load catches both. A mismatch is a SEV1 with no threshold and no grace period —
there is no benign explanation for immutable content differing from its recorded checksum.

## The UI still meets every product standard

This is an internal tool, and internal tools are where accessibility and claims discipline
quietly lapse. They do not here.

WCAG 2.2 AA · colour never the only channel · every swatch named with its value · both
themes · the claims lint applies to editorial copy exactly as it does to user-facing copy.

An editor writing a colour description **is** writing user-facing copy.

## Before you start

[`content/AGENTS.md`](../../content/AGENTS.md) ·
[`.harness/rules/content/content-provenance.md`](../../.harness/rules/content/content-provenance.md) ·
[`.harness/governance/content-licensing.md`](../../.harness/governance/content-licensing.md) ·
[`.harness/rules/frontend/frontend.md`](../../.harness/rules/frontend/frontend.md).
