# Security Policy

## Reporting a vulnerability

Email **security@irodora.com**. Do not open a public issue.

Include: what you found, how to reproduce it, the impact you believe it has, and any
proof-of-concept. If you need to send anything sensitive, ask for a PGP key first.

| Stage | Target |
|---|---|
| Acknowledgement | 2 business days |
| Triage and severity assignment | 5 business days |
| Fix for Critical / High | 14 days |
| Fix for Medium / Low | next scheduled release |

We will keep you informed through remediation and will credit you on disclosure unless
you prefer otherwise. We do not pursue legal action against good-faith research that
respects the boundaries below.

## Scope

**In scope:** the Irodora API, web application, mobile applications, the public API,
official container images, and this repository's supply chain.

**Out of scope:** denial of service, social engineering, physical attacks, findings that
require a rooted or jailbroken device with a hostile local user, automated scanner output
without a demonstrated impact, and reports against third-party services we merely consume.

## What we consider high severity here

Beyond the usual classes, this product has two domain-specific security concerns that are
easy to underestimate:

**Colour-truth tampering.** The recommendation engine is content-driven. If an attacker
can modify the colour corpus, palette definitions, or rule weights, they change what the
product tells every user without touching any application code. Content is versioned,
integrity-checked and treated as a protected asset — see
[`docs/architecture/security/threat-model.md`](docs/architecture/security/threat-model.md).

**Image handling.** Wardrobe photographs are attacker-controlled binary input. Decoding
happens under strict size, type and time limits, in an isolated worker, never in the API
process. Raw camera frames are never uploaded for ordinary colour detection at all
([ADR-0026](docs/adr/0026-privacy-on-device-by-default.md)).

## Our commitments

- Secrets never enter the repository. `gitleaks` runs on every push; a positive finding
  fails the build and triggers rotation, not an allowlist entry.
- Dependencies are pinned by lockfile and audited in CI. A Critical or High advisory
  blocks release.
- All input is schema-validated at the boundary; nothing trusts a client-supplied type.
- Authentication uses standard OIDC and passkeys. We do not implement password
  primitives ([ADR-0015](docs/adr/0015-auth-oidc-passkeys-no-homegrown-crypto.md)).
- Every tenant boundary is enforced in the database, not only in application code
  ([ADR-0017](docs/adr/0017-multi-tenancy-and-rls-from-day-one.md)).
- Camera frames, raw imagery and biometric-adjacent data are never written to logs or
  telemetry ([ADR-0022](docs/adr/0022-observability-opentelemetry-no-raw-imagery.md)).

## Supported versions

Pre-release. Once R1 ships, the current minor release and the one before it receive
security fixes.
