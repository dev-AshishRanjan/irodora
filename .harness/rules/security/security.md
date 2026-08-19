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

## Trust nothing that crosses a boundary

There is no network boundary any more ([ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)),
and the temptation that creates is the whole of this section: **when everything is "internal",
nothing feels like input.** It still is.

Never trust, without validating it through a `@irodora/contracts` schema:

| Boundary | Why it is not ours |
|---|---|
| A row read from SQLite | Written by an **older build of the app**, with different assumptions. Hostile input in exactly the way a request body was |
| An imported backup | The strongest case — another program produced it, or a person edited it by hand |
| The corpus bundle | Digest-checked, then parsed. "We shipped it" is a claim about the build, not the bytes on this device |
| Output from a native module | The camera, the filesystem, the keystore. Numbers from another runtime |
| A deep link or share intent | Attacker-controlled, arrives from outside the app entirely |

**Parse, never cast.** A column is `unknown` until a schema says otherwise. `as` on data
crossing any row above is the same defect as trusting a request body, wearing a costume that
makes it look like a type annotation.

**Prepared statements only.** String-concatenated SQL is not less dangerous because the
database is local — it is more dangerous, because the attacker's input and the data are in
the same file and there is no second tier to stop at.

---

## Authentication

**There is none, and that is the design.** No account, no session, no token, no password
primitive ([ADR-0015](../../../docs/adr/0015-auth-oidc-passkeys-no-homegrown-crypto.md),
superseded). The device's own lock screen is the authentication boundary, and it is not ours
to reimplement.

The rule ADR-0015 actually protected survives and is now easier to keep: **we implement no
crypto primitive ourselves.** At-rest encryption is SQLCipher; the key lives in the iOS
Keychain / Android Keystore through `expo-secure-store`.

**The database key is the whole of at-rest security.** A key that reaches a log, a crash
report, an environment variable or a backup file defeats SQLCipher completely. Treat any
such exposure as an S1 incident.

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
