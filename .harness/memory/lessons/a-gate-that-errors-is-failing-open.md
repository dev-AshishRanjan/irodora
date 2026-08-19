---
kind: lesson
title: A gate that errors is failing open, and so is an authorisation check that throws into a catch
category: convention
confidence: 1.0
created: 2026-08-13
scope: [root]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
---

# A gate that errors is failing open

**If a check cannot run, it is not passing.**

The failure mode is a script that exits non-zero for an environmental reason — a missing
binary, a network blip, a path that moved — and a pipeline that treats "did not produce a
failure report" as "found no failures".

```yaml
# No. A crashed step reports success.
- run: pnpm test:contrast || true

# No. Same failure, dressed differently.
- run: pnpm test:contrast
  continue-on-error: true
```

An execution failure is **red**, not an absence of information.

## The same shape, elsewhere

**Authorisation.**

```ts
// A config read failure grants access.
const canAccess = !config.requireAuth || hasValidToken(req);

// A thrown check becomes a bypass.
try { requireValidToken(req); } catch { /* continue */ }
```

Every security decision defaults to denial. An error in an authorisation check is a
**denial**.

**Tenancy.** `current_setting('irodora.tenant_id')` with no value must raise. A NULL
comparison silently matches nothing — which sounds safe until the same missing setting
reaches a code path that builds its own query and returns everything.

**Content integrity.** A checksum that cannot be computed is a mismatch, not a pass.

## Why it is worth writing down

Failing open is almost never a decision anyone makes. It is what happens when the error path
is not considered, and it looks identical to success in every log and every dashboard.

## The habit

For each check, ask: **what happens if this cannot run?** If the answer is "nothing
happens", the check has an unhandled failing-open mode.
