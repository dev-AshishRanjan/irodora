# ADR-0022 — OpenTelemetry throughout, and imagery can never reach a telemetry sink

## Status

**Superseded by [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).** There is no telemetry backend and no
collector. The prohibition this record carried — **never log raw imagery or biometric-adjacent
data** — is retained as a standing rule, and is now satisfied by construction: nothing leaves
the device.

## Date

2026-08-13

## Context

Two requirements meet here and one of them usually loses.

**We need real observability.** Latency budgets are committed (NFR-4). Scan failures need
diagnosis. Sync conflicts need measurement. A recommendation that took 900 ms needs a trace
that says why.

**We handle photographs of people's homes.** Wardrobe images, camera frames and
appearance-adjacent profile data must never appear in a log, a trace attribute, an error
report or an APM payload.

The default failure is mundane and extremely common: a developer debugging a decode error
logs the request body. It works, it ships, and six months later object storage holds an
observability vendor's copy of a user's bedroom. Nobody decided to do that either.

A policy — "do not log images" — does not survive a 2 a.m. incident.

## Decision

**OpenTelemetry for traces, metrics and structured logs. Redaction is structural and
tested, not conventional.**

1. **OTel across API, worker, web and mobile.** One trace per request, spans per module
   boundary, sub-spans for engine computation and database access. OTLP export, so the
   backend is a deployment choice rather than a code dependency.
2. **`pino` structured JSON logs** correlated by `trace_id` and `request_id`. Every log
   line is queryable by the same id the user was given in an error response.
3. **A deny-list is not the mechanism. A type boundary is.** Image buffers, camera frames
   and profile dimensions are carried in types that have no serialiser — passing one to a
   log or span attribute is a type error, not a runtime redaction.
4. **A redaction test asserts unreachability.** It attempts to reach a sink from every code
   path that holds imagery or profile data and fails the build if any path succeeds. When a
   new path makes them reachable, the build breaks before the deploy.
5. **Never recorded:** raw frames, image bytes, image-derived intermediates, profile
   dimensions, precise location, email addresses (hashed ids only), auth tokens.
6. **Recorded instead:** measurement *outcomes* — sample count, variance, confidence,
   illumination class, quality class, duration, failure reason. Every one of these is
   diagnostically useful, and none of them is an image.
7. **Product analytics are events, never imagery** (see
   [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md#analytics-events)).
8. **Error reporting strips request bodies by default.** An opt-in per route, reviewed.

**The insight worth keeping:** almost everything we need to debug a bad scan is derivable
from the measurement metadata rather than the image. "Confidence 0.31, variance 0.08,
illumination mixed, sample count 1120, quality poor" diagnoses the problem completely. The
image would add nothing but liability.

## Consequences

**Good.** Real diagnostic capability with the privacy commitment structurally enforced.
Vendor-neutral through OTLP, so the observability backend is swappable per deployment
profile — which the VPS profile needs, since self-hosters will not have our vendor. A
redaction failure is a build failure.

**Bad.** OTel instrumentation adds real overhead — sampled in production, but not free.
The type boundary is more ceremony than passing a `Buffer` around. Debugging an image issue
without the image is genuinely harder, and there will be incidents where that hurts;
mitigated by rich metadata and by the ability to reproduce locally with a user-supplied
file under an explicit support flow.

**Neutral.** The observability backend is a deployment concern, not an architectural one.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **A vendor SDK (Datadog, Sentry, New Relic) directly** | Better out-of-the-box ergonomics and richer default instrumentation. Vendor lock-in in every service, and self-hosters would need our account. OTLP gets most of the value while keeping the backend swappable |
| **Redaction by field deny-list** | Standard practice, easy to add. Deny-lists cover the fields someone remembered; the failure is always the field nobody thought of. A type that cannot be serialised covers all of them |
| **Log images to a short-retention private store** | Would genuinely help debugging. Creates exactly the liability this decision exists to prevent, and "short retention" has a way of becoming long retention |
| **Logs only, no tracing** | Simpler and cheaper. Cannot answer "where did those 900 ms go" across module boundaries, which is the question the latency budget makes us ask |

## Revisit when

- OTel overhead appears in the p95 latency budget.
- A support workflow needs image inspection, which would be a separate, explicitly
  consented, audited path — never the telemetry pipeline.
