---
name: security-review
description: Review a change for the security failures that actually happen here — tenancy, hostile images, content tampering, and claims about encryption.
---

# Skill: security-review

Threat model:
[`threat-model.md`](../../../docs/architecture/security/threat-model.md) ·
Rules: [`security.md`](../../rules/security/security.md) ·
[`privacy.md`](../../rules/security/privacy.md).

## Start with the boundary

Which trust boundary does this change touch?

```
① device  ② internet  ③ edge  ④ API  ⑤ DB  ⑥ cache  ⑦ blob  ⑧ worker  ⑨ content plane
```

**⑨ is the one people forget.** Someone who can edit the corpus or a rule weight changes
what every user is told, without touching a line of code. It is silent, product-wide, and
invisible to conventional monitoring.

## The checklist

### Input

- [ ] Every request parsed by a schema. The handler sees only the parsed type.
- [ ] Nothing trusted from a client: tenant, user, price, entitlement, role, resource id.
- [ ] Content type by **magic bytes**, not the supplied header.
- [ ] Hard limits **before** full decode: bytes, pixels, wall-clock.

### Tenancy

- [ ] `tenant_id` from the **session**, never a request field.
- [ ] RLS with `FORCE` on the table.
- [ ] Missing tenant context **raises**; it does not fall through to an unscoped query.
- [ ] **404, not 403**, for another tenant's resource.
- [ ] A negative test proves isolation — **with a decoy**. Against an empty tenant B it
      passes whether or not the policy works.

### Auth

- [ ] Token signature, issuer and audience validated.
- [ ] Session id rotates on privilege change.
- [ ] Refresh rotation with reuse detection.
- [ ] Entitlements checked **server-side**; client state is a hint.

### Data

- [ ] Parameterised queries. No string-built SQL.
- [ ] No secret in code, comment, fixture, log, or task definition.
- [ ] EXIF stripped on ingest — a wardrobe photo taken at home contains a home address.
- [ ] Images decoded **in the worker**, never in the API process.
- [ ] **No fetch-by-URL.** Uploads only. No SSRF surface.

### Content

- [ ] Publication only through the admin path.
- [ ] Checksum verified **at load**, not only at write — a restored backup or a swapped
      file on a self-hosted box never passes through the write path.
- [ ] Every publish audit-logged with actor and diff.

### Privacy

- [ ] No image, frame, or profile dimension reachable from a log, trace or telemetry sink.
- [ ] No new field inferring a protected characteristic.
- [ ] The redaction test still passes.
- [ ] **No text anywhere calls this "end-to-end encrypted."** The server can decrypt synced
      images; borrowing the phrase would be a false claim.

### Failure behaviour

- [ ] Every security decision defaults to denial.
- [ ] An error in an authorisation check is a **denial**, not a bypass.

## Fail closed

```ts
// No — a config read failure grants access.
const canAccess = !config.requireAuth || hasValidToken(req);

// Yes.
if (config.requireAuth !== false) requireValidToken(req);
```

## Then

Run the `security` gate. Update the threat model if a boundary changed. Add an effect link
if a control now depends on something new.

**A control that cannot be pointed at a test or a gate is not a control** — it is an
intention. Either implement it as one, or record the gap with a tracked feature.
