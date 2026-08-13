# Protocol: Observability

**Trigger:** any feature that adds a code path, a job, or a user-facing operation.

Two layers, answering two different questions.

---

## Runtime observability — *what did the system do?*

Per [ADR-0022](../../docs/adr/0022-observability-opentelemetry-no-raw-imagery.md).

**Instrument, when adding a code path:**

- A **span** around any operation that can be slow: engine computation, database access,
  external calls, image work.
- **Structured log** on entry to and exit from a critical path, with `trace_id` and
  `request_id`.
- A **metric** for anything with a budget in [`slo.md`](../../docs/operations/slo.md).
- **Full context on error** — what failed, with what inputs (redacted), and what the caller
  should do.

**Never — enforced by a type boundary and a redaction test:**

```
raw camera frames · image bytes · image-derived intermediates
personal colour profile dimensions · precise location
email addresses (hashed ids only) · auth tokens or secrets
```

**Record the measurement outcome instead of the measurement input.** For a colour scan:
sample count, variance, confidence, illumination class, quality class, duration, failure
reason. That set diagnoses a bad scan completely; the image would add nothing but liability.

---

## Process observability — *why should this change be accepted?*

The harness's own audit trail. Distinct from runtime telemetry, and often neglected because
it produces no dashboard.

| Artefact | Where | Purpose |
|---|---|---|
| The feature plan | [`../plans/`](../plans/) | What was intended, before it was built |
| Gate evidence | [`../state/progress.md`](../state/progress.md) | What was verified, and what was not |
| Effect links | [`../state/effects.json`](../state/effects.json) | What the change touched |
| Lessons | [`../memory/lessons/`](../memory/lessons/) | What was learned |
| ADRs | [`../../docs/adr/`](../../docs/adr/) | What was decided, and why |

Together these answer, months later, "why is this like this?" — without which every
inherited decision looks arbitrary and gets re-litigated.

---

## Instrumentation checklist

For any new operation:

- [ ] Span, named for the operation, not the function
- [ ] Attributes that aid diagnosis, none that leak
- [ ] A metric if it has a budget
- [ ] Errors carry context and a next step
- [ ] Nothing on the deny list is reachable from a sink
- [ ] The redaction test still passes

For any new user-facing action:

- [ ] A product event, if it feeds a metric in
      [PRD §8](../../docs/PRD.md#8-success-metrics)
- [ ] The event carries no imagery and no profile data

---

## Error messages are an interface

An error is read by a person or an agent trying to fix something. It must say three things:

```
What failed:   the gate `color-golden` failed: 3 of 34 CIEDE2000 pairs mismatched
Why it matters: the ΔE00 implementation disagrees with the published reference set;
                every colour comparison in the product is affected
What to do:    inspect packages/color-difference/golden/ciede2000.golden.json,
                pairs 17, 23, 31 — these bracket the ±180° hue discontinuity
```

The third line is the one usually missing, and the one that determines whether the next
person fixes the cause or works around the symptom. **A failure message that only states
the failure has done a third of its job.**

---

## What we deliberately do not do

- **No auto-instrumentation of everything.** Noise costs money and attention, and a
  dashboard nobody reads is worse than no dashboard.
- **No image logging, under any justification.** Not "temporarily", not "in staging", not
  "with short retention".
- **No vendor SDK in application code.** OTLP only, so the backend is a deployment choice —
  which the self-hosted profile requires, since self-hosters do not have our vendor
  account.
- **No metric without a named source.** Anything published in
  [PRD §8](../../docs/PRD.md#8-success-metrics) traces to an event or a gate.
