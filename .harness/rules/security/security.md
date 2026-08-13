# Security Rules

Threat model:
[`threat-model.md`](../../../docs/architecture/security/threat-model.md).

---

## Validate at the boundary

Every request is parsed by a schema. The handler receives the parsed type. **No handler
ever sees an unvalidated shape.**

This covers HTTP bodies, query strings, path params, headers you act on, webhook payloads,
job payloads, and anything read from `content/`.

---

## Trust nothing from a client

Never trust a client-supplied: tenant id · user id · price · entitlement · role ·
timestamp used for ordering · resource id without an authorisation check.

**`tenant_id` comes from the authenticated session, never from a request field.** A missing
tenant context **raises**; it does not fall through to an unscoped query. Failing open on a
tenancy boundary is the worst available default.

**404, not 403, for another tenant's resource.** A 403 confirms the id exists.

---

## Authentication

- OIDC and passkeys. **We implement no password primitive**
  ([ADR-0015](../../../docs/adr/0015-auth-oidc-passkeys-no-homegrown-crypto.md)).
- Short-lived access tokens. Refresh tokens rotate on use, **with reuse detection** — a
  replayed refresh token revokes the whole family.
- Session id rotates on privilege change.
- Cookies: `httpOnly`, `Secure`, `SameSite`.
- Revocation propagates within 60 s.

---

## Secrets

- Never in code, a comment, a test fixture, a log, or a container environment where
  `DescribeTaskDefinition` can read it.
- `gitleaks` runs on every push. **A finding rotates the secret** — it never earns an
  allowlist entry.
- Rotation uses a **two-key window**: add, deploy, verify, remove. Replacing in place
  invalidates every live session at the moment of deploy.

---

## Images are hostile input

- **Decoding happens only in the worker.** Never in the API process — a decoder bomb should
  cost one worker, not the platform.
- Hard limits enforced **before** full decode: bytes, pixel count, wall-clock time.
- **Content type verified by magic bytes**, not by the supplied header or extension.
- **EXIF stripped on ingest.** A wardrobe photograph taken at home contains a home address
  in its GPS tags.
- **No fetch-by-URL ingestion. Ever.** Uploads only, so there is no SSRF surface.
- The worker runs non-root, read-only filesystem, no network egress.

---

## Database

- Parameterised queries only. **No string-built SQL.** Lint-enforced.
- RLS with `FORCE` on every table holding user data. `FORCE` matters: without it the table
  owner bypasses the policy, and the migration role is usually the owner.
- Least-privilege roles. The application role has no `DDL` grant in production.
- Migrations reviewed for destructive operations. Expand/contract for anything that drops.

---

## Rate limiting

Auth endpoints: **per IP and per identifier**. Per-IP alone is defeated by a botnet;
per-identifier alone is defeated by trying many identifiers.

Per-tenant limits as well as per-user, so one user cannot exhaust an organisation's budget.

---

## Web

CSP with no `unsafe-inline` · HSTS · `X-Content-Type-Options: nosniff` · frame-ancestors
denied · CSRF protection on cookie-authenticated mutations · Subresource Integrity on any
third-party script (of which there should be none).

---

## Dependencies

- Lockfile-pinned. Lifecycle scripts blocked by default; every exception in
  `onlyBuiltDependencies` is a reviewed decision.
- Audit in CI. Critical or High blocks release.
- **`packages/color-*` have zero runtime dependencies**, which removes the product's most
  correctness-critical code from the dependency attack surface entirely.

---

## Content integrity

Content is a trust boundary — see
[`../content/content-provenance.md`](../content/content-provenance.md). Checksums verified
at load, publication restricted to the admin application, every publish audit-logged. A
checksum mismatch is a **SEV1**.

---

## Fail closed

Every security decision defaults to denial:

```ts
// No — a config read failure grants access.
const canAccess = !config.requireAuth || hasValidToken(req);

// Yes.
if (config.requireAuth !== false) requireValidToken(req);
```

An error in an authorisation check is a denial, not a bypass. **A gate that errors is
failing open** — and so is an authorisation check that throws into a permissive catch.
