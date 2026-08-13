# Archived: the original brainstorm

**Superseded. Do not build from these.**

These four documents are the origin material for Irodora — the first thought, and a first
pass at a PRD, an ADR set and an HLD, written before the product had a name.

They are kept for provenance: they record where the ideas came from, and several of their
judgements survived intact into the final documents. They are **not** current, and they
contradict the approved documentation in places where we deliberately changed direction.

## Read instead

| For | Read |
|---|---|
| The product | [`docs/PRD.md`](../../PRD.md) |
| The architecture | [`docs/architecture/ARCHITECTURE.md`](../../architecture/ARCHITECTURE.md) |
| The decisions | [`docs/adr/`](../../adr/) |
| How work is done | [`AGENTS.md`](../../../AGENTS.md) |

## What changed, and why

Recorded so nobody has to diff four documents to find out.

| Brainstorm said | We do | Because |
|---|---|---|
| Working name "IRO" | **Irodora** | IRO is undomainable and collides widely. [decision](../../../.harness/memory/decisions/brand-name-and-namespace.md) |
| "Not AI driven", as a blanket rule | A four-tier capability policy | The blanket ban was unenforceable and would have outlawed the classical CV the Lens needs — [ADR-0002](../../adr/0002-deterministic-core-tiered-capability-policy.md) |
| Confidence shown alongside a colour | Provenance is part of the `Color` type | A disclaimer is optional at every call site; a required field is not — [ADR-0005](../../adr/0005-measurement-provenance-is-a-type.md) |
| Mobile-first, web companion | **Web first**, mobile close behind | The Atlas is the public proof of the engine, and needs no install or app review |
| English, i18n later | **en + ja from day one** | Japanese typography constraints must shape the design, not break it — [ADR-0028](../../adr/0028-i18n-en-ja-from-day-one.md) |
| "Verify licensing for external datasets" | **No third-party dataset is ingested at all** | A copied corpus is a commodity; a provenanced one is the asset — [ADR-0007](../../adr/0007-colour-corpus-provenance-and-licensing.md) |
| Last-write-wins sync | Field-level logical clocks with typed merge rules | LWW destroys wear counts and concurrent field edits, silently — [ADR-0014](../../adr/0014-offline-first-sqlite-outbox-and-merge-policy.md) |
| AWS as the deployment | Container-portable; **VPS via Coolify/Dokploy is first-class** | Cost, residency, self-hosting — [ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md) |
| — | Monetisation, with accessibility never paywalled | The brainstorm had none — [ADR-0027](../../adr/0027-monetisation-tiers.md) |
| — | Ethical guardrails and ITA-stratified bias validation | NFR-22, NFR-23. A personal-colour engine unvalidated across the full skin-tone range is not shippable |
| — | Requirement ids, acceptance criteria, gates, effect links | None of it was traceable or verifiable as written |

## What survived unchanged

The best judgements in the brainstorm were the restraining ones, and they are now enforced
rather than merely stated:

- **A camera estimate is an estimate.** Now a type and a lint, not a caption.
- **Personal colour is a profile, not a skin RGB.** Now a schema with no such field.
- **Colour-vision deficiency is first-class.** Now a gate.
- **Averaging happens in linear light**, and colour is never stored as hex.
- **Recommendations are explainable and reproducible.** Now an envelope on every result.

## Deleting these

They can go at any time — everything they establish is captured above and in the approved
documents. They are kept because provenance is cheap to keep and impossible to reconstruct.
