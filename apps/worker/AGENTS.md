# AGENTS.md — `apps/worker`

> **Scoped harness. Extends [`../../AGENTS.md`](../../AGENTS.md), which still applies in
> full.** Stricter, never looser.

Background jobs: image processing, report generation, corpus builds, capsule optimisation,
retention jobs.

---

## This process handles hostile input

**Image decoding happens here and nowhere else.** Never in the API process — a decoder bomb
should cost one worker, not the platform.

- **Hard limits enforced *before* full decode**: bytes, pixel count, wall-clock time.
- **Content type by magic bytes**, not the supplied header or extension.
- **EXIF stripped on ingest.** A wardrobe photograph taken at home contains a home address
  in its GPS tags.
- **No fetch-by-URL. Ever.** Uploads only, so there is no SSRF surface.
- Runs **non-root**, read-only filesystem, **no network egress**.

## Jobs are idempotent

They will be retried. A job that creates a duplicate on retry is a data-quality bug the user
has to clean up by hand.

Every job is **bounded** — time, memory, retry count. Failures go to a dead-letter queue with
enough context to diagnose. **Nothing is silently dropped.**

## Jobs carry their tenant explicitly

A background job has no request and therefore no session. **Tenant context is a property of
the job payload**, set when the job is enqueued and applied to the connection when it runs.

A job that runs without tenant context must **fail**, not proceed unscoped.

## Long-running work has a budget

Capsule optimisation is combinatorial. It runs with a **hard time budget and returns
best-so-far on expiry** — a deterministic answer within budget is worth more than an optimal
one that never arrives, and "best found within 3 seconds, deterministically" is still
reproducible from an envelope (FR-10).

## Scaling signal

Queue depth, not CPU. The work is burst-shaped, and the worker scales to zero between
bursts.

## Never logged

Image buffers, image-derived intermediates, profile dimensions. Carried in types with no
serialiser, so passing one to a log is a type error — and the redaction test proves it stays
that way.

**Record the outcome, not the input.** Sample count, variance, confidence, illumination
class, duration, failure reason. That set diagnoses a bad job completely; the image would add
nothing but liability.

## Before you start

[`.harness/rules/api/api.md`](../../.harness/rules/api/api.md) ·
[`.harness/rules/security/security.md`](../../.harness/rules/security/security.md) ·
[`docs/architecture/security/threat-model.md`](../../docs/architecture/security/threat-model.md).
