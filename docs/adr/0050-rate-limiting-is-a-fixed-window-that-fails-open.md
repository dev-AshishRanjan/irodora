# ADR-0050 — Rate limiting is a fixed window, and it fails open

## Status

**Retired with the server tier — see [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).** Kept for the
reasoning, which outlived the code: a limiter that fails open is a availability choice, and
saying so in the record is why nobody had to rediscover it.

## Date

2026-08-19

## Context

`api-contract.md` §8 specified a **sliding
window in Valkey**. F-015 ships a **fixed window**, and it ships one that **allows the request
when the cache is unreachable**. Both are deviations from a documented default, so both are
recorded here rather than left in a source comment somebody has to go and find.

Two things forced the question at implementation time.

**First, the primitive.** `CachePort` had `get`, `set` and `setIfAbsent`. A limiter needs an
atomic read-modify-write; `get` then `set` is a race two concurrent requests win together, and
the failure direction is *under-counting* — the limiter admits more than its limit, silently,
precisely under the concurrency it exists for. F-015 therefore added
`CachePort.increment(key, ttlSeconds): Promise<number>`. A **sliding log** needs more than a
counter: a stored list of timestamps per identifier, trimmed on every request. That is a second
data structure, a second conformance obligation on every adapter (E-011), and unbounded memory
per identifier under attack — which is the wrong thing to hand an attacker who is already
sending traffic faster than you would like.

**Second, the dependency.** Whatever the algorithm, the counter lives in Valkey. If Valkey is
unreachable, the limiter cannot run. There are exactly two behaviours available, and neither is
free.

## Decision

### 1. A fixed window, keyed by window index

The key is `ratelimit:<bucket>:<identifier>:<floor(now / windowMs)>`. A new window is a new
counter, so nothing sweeps and nothing has to be reset. One `increment` call per request; a
process restart loses at most one window.

**The known weakness is the boundary.** A client may spend its whole budget at the end of one
window and its whole budget again at the start of the next, so the true worst case over any
sliding interval is **twice the configured limit**. This is asserted in
`rate-limit.test.ts` — a test whose only job is to make the number a limiter *appears* to
enforce and the number it *actually* enforces impossible to confuse.

For the job §8 describes at R1 — blunting credential stuffing and runaway clients — 2× at the
boundary is a price worth paying for a primitive that cannot race. **It is not acceptable for
metering anything that costs money**, and a per-plan quota (F-057) must not be built on this
hook.

### 2. It fails open

If `increment` throws, the request is **allowed**, and a warning is logged naming the failure.

Failing closed would turn a cache blip into a total outage: every request 500ing because a
*mitigation* could not be applied. A rate limiter at R1 is a mitigation, not an authorisation
decision — nothing here is the only thing standing between a caller and data they should not
have. Meanwhile `/readyz` already reports the cache as unavailable, so an orchestrator stops
routing traffic to the process on its own.

**The consequence, stated plainly: while the cache is down, there is no rate limiting.** It is
asserted in the e2e suite so that it is a recorded property rather than a discovery made during
an incident.

This trade-off reverses the moment a limit becomes an entitlement rather than a mitigation.
A quota that a customer has paid for, or a limit that stands in for an authorisation check, must
fail **closed** — and must therefore not use this hook.

### 3. Health probes are exempt

`/healthz` and `/readyz` are never counted. A liveness probe that receives a 429 is a container
the orchestrator restarts, so the limiter would take down exactly the healthy process it exists
to protect — and under Coolify and Dokploy that restart is quick and unceremonious.

### 4. The numbers are uncalibrated, and say so

`RATE_LIMIT_PER_IP = 300/min` and `RATE_LIMIT_PER_IDENTIFIER = 10/min` are the shape §8
describes, chosen generously enough that a normal client never meets one. **No measurement
produced them.** They move into configuration when there is traffic to size them against
(F-036); until then the e2e suite exercises the *shipped* numbers rather than a convenient small
rule, so what is tested is what is enforced.

## Consequences

- `api-contract.md` §8 is amended to describe the fixed window, the 2× boundary, and the
  fail-open behaviour. A specification that describes something we do not do is worse than no
  specification, because it is the thing a reviewer checks against.
- The per-class table in §8 (per-tenant, per-plan, per-user classes) remains unimplemented:
  there is no authenticated identity until F-033 and no tenant until F-034. What ships is the
  per-IP rule applied to every route, and the per-identifier rule exercised against a decoy
  identifier so the mechanism is one that has been watched work.
- **Revisiting is cheap and is expected.** Moving to a token bucket changes `checkRateLimit` and
  nothing above it: the hook takes a decision, not an algorithm.

## Alternatives considered

**Sliding log**, as §8 specifies. Rejected for R1: unbounded per-identifier storage under
attack, a second conformance obligation on every cache adapter, and no benefit at the traffic
level R1 expects. It is the right answer once limits become entitlements.

**Token bucket.** Smooths the boundary and bounds storage at two numbers per identifier. It needs
an atomic compare-and-set or a server-side script — reachable from Valkey, not from the port as
it stands. The most likely successor, and the reason `checkRateLimit` returns a decision rather
than throwing.

**Failing closed.** Rejected. It converts a dependency blip into a full outage in exchange for
enforcing a mitigation during the window when the service is already degraded. Correct for a
paid quota, wrong for this.
