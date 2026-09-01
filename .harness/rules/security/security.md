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

**There is no worker to sacrifice, so the limits are the whole defence.** Version 1.0 decoded in
a worker process off the API process, and a decoder bomb cost one worker rather than the <!-- retired-ok: Describes what version 1.0 did, to explain why the limits below carry the whole defence now. -->
platform. On a device the blast radius is the user's app — there is no tier to lose instead of
them, which makes every bullet below load-bearing rather than defence in depth.

- **Hard limits enforced BEFORE full decode**: byte cap, and a pixel cap read from the image
  header. Reading the header first is the point — a decoder bomb is small on disk and enormous
  in memory, so a byte cap alone does not see it coming.
- **Content type verified by magic bytes**, not by the supplied header or extension.
- **Decoding happens off the UI thread**, and a failure surfaces as a handled error rather than
  a crash. A frozen app is the symptom a user actually experiences.
- **EXIF stripped on ingest.** A wardrobe photograph taken at home contains a home address in
  its GPS tags. ICC is **kept** — stripping it silently reinterprets a Display P3 capture as
  sRGB, which is a colour defect this product cannot afford.
- **No fetch-by-URL ingestion. Ever.** The image comes from the camera or the picker, so there
  is no SSRF surface and no way for a remote host to choose the bytes.

---

## Database

**One user, one device, one SQLCipher file.** Row-level security, `FORCE`, migration roles and <!-- retired-ok: Names the retired database controls in order to say what replaced them and why. -->
`DDL` grants were the version-1.0 answer to a question that no longer exists: separating users
inside a shared PostgreSQL instance. There is no shared instance and no second user to separate
from.

- Parameterised queries only. **No string-built SQL.** Lint-enforced.
- The database is **encrypted at rest** with a key held in the platform keystore, never in the
  bundle, never in an environment variable, never in a log
  ([ADR-0078](../../../docs/adr/0078-wardrobe-images-are-blobs-in-the-encrypted-database.md)).
- Migrations are **forward-only and reviewed for destructive operations**, and the app prompts
  for an export before anything that drops. With no server there is no backup you did not take.
- Both drivers run the same conformance suite — `node:sqlite` in CI, `expo-sqlite` on the
  device — because a migration that passes on one and fails on the other fails on a user's phone.

---

## Rate limiting and transport — neither applies

**Retired with the server tier** ([ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)),
and recorded here rather than deleted because their absence is a claim worth being able to
check. This file used to require per-IP and per-identifier limits on auth endpoints, per-tenant <!-- retired-ok: Records the retired rate-limiting rules so their absence is deliberate rather than an omission. -->
budgets, and a transport section: CSP, HSTS, nosniff, frame-ancestors, CSRF, SRI. <!-- retired-ok: Continuation of the retired-rules record above. -->
<!-- retired-ok: Records the retired rules so their absence is deliberate rather than an omission. -->

There are no endpoints to limit, no auth to brute-force, no tenants to budget, and nothing in
transit to secure. The Android build does not hold `INTERNET`, and gate 16 asserts that against
the **shipped APK** rather than against the config — which is the only version of this claim
worth making.

**What replaced them is one rule:** the product's attack surface is the device it runs on, so
the defences that matter are the local ones above — hostile input, the keystore, and the
encrypted database.

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
