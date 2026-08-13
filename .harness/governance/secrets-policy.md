# Secrets Policy

---

## Never in the repository

Not in code. Not in a comment. Not in a test fixture. Not in a doc. Not in a commit message.
Not "temporarily".

`gitleaks` runs on every push, configured by
[`.gitleaks.toml`](../../.gitleaks.toml).

> **A finding rotates the secret. It never earns an allowlist entry.**
>
> Once a secret is in git history it is compromised, regardless of whether the commit was
> pushed, and regardless of how quickly it was removed. Removing it from history does not
> un-compromise it — it only makes it harder to find later.

---

## Where they live

| Profile | Store |
|---|---|
| Local | `.env`, gitignored. `.env.example` holds placeholder shapes only |
| VPS (Coolify / Dokploy) | The platform's environment editor |
| Cloud | AWS Secrets Manager, injected as task-definition **secrets** |
| CI | GitHub environment secrets, with required reviewers on production |

**Never a plaintext environment variable in an ECS task definition**, where anyone with
`ecs:DescribeTaskDefinition` can read it.

---

## Rotation: two-key window

Never replace in place — that invalidates every live session at the moment of deploy.

```
1. Add the new key alongside the old. Both accepted.
2. Deploy. Verify the new key is in use.
3. Remove the old key. Deploy.
```

Applies to session signing keys, API keys, and encryption keys.

| Secret | Cadence |
|---|---|
| Session signing | 90 days |
| Database credentials | 180 days |
| Blob storage keys | 180 days |
| OIDC client secret | 365 days |
| KMS data keys | Per policy, automated |
| **Anything exposed** | **Immediately** |

---

## Generating

```bash
openssl rand -base64 32
```

Minimum 32 bytes of CSPRNG output. No passwords, no phrases, no "irodora-prod-2026".

---

## If one leaks

1. **Rotate immediately.** Before investigating, before writing anything up.
2. Assess what it could reach and for how long.
3. Check the audit trail for use.
4. Notify per [`../../docs/compliance/data-governance.md`](../../docs/compliance/data-governance.md)
   if user data was reachable.
5. Postmortem, and **add the check that would have caught it** —
   [`../../docs/operations/incident-response.md`](../../docs/operations/incident-response.md).

Step 1 comes first. A rotated secret makes the investigation calmer; an unrotated one makes
it an active incident for as long as the investigation takes.

---

## `.env.example`

Documents the shape of every variable, never a real value. Placeholders use the documented
forms (`replace-me`, `your-…-here`), which are the only high-entropy-looking strings the
scanner allows.

Every new `IRODORA_*` variable goes in it. **The `state` gate checks this** — a variable the
config loader reads but the example does not document is a deployment that fails at boot in
a way nobody predicted.
