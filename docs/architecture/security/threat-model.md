# Threat Model

| | |
|---|---|
| **Status** | Baseline · reviewed each release |
| **Method** | STRIDE per trust boundary |
| **Implements** | NFR-14, NFR-15 |

Every control below maps to a test or a gate. A control that is only a paragraph in this
file is not a control.

---

## 1. Trust boundaries

```
 ① Device ─────────────────────────────────────────────────────────────
    camera · local DB · secrets · the colour engine
        │
        │ ② public internet (TLS)
        ▼
 ③ Edge — CDN · WAF · rate limiting
        │
        ▼
 ④ API — authn · authz · tenancy · validation
        │
   ┌────┴─────┬──────────────┬──────────────┐
   ▼          ▼              ▼              ▼
 ⑤ DB      ⑥ Cache      ⑦ Blob         ⑧ Worker
   RLS      queue       user images    decodes hostile input
        │
        ▼
 ⑨ Content plane — corpus · palettes · rule weights
    ← the boundary most people forget, and the one that changes
      what every user is told without touching any code
```

---

## 2. Assets, ranked by what losing them costs

| Asset | Loss means |
|---|---|
| **Content integrity** (corpus, palettes, weights) | Every user gets manipulated answers. No code change is visible. Silent, product-wide, and hard to notice |
| Wardrobe images | Photographs of people's homes and possessions |
| Personal colour profiles | Appearance-adjacent inference |
| Auth tokens and sessions | Account takeover |
| Tenant isolation | Cross-customer disclosure — existential for the Studio tier |
| Corpus provenance records | Our licensing defence |
| Audit trail | Loss of accountability, and of the ability to reconstruct an incident |

Content integrity is first deliberately. Most threat models put credentials at the top;
here, an attacker who can edit a rule weight changes what a million users are told about
what to wear, without tripping a single code-review or deploy alarm.

---

## 3. STRIDE by boundary

### ④ API

| | Threat | Control | Verified by |
|---|---|---|---|
| **S** | Forged token | OIDC signature + issuer + audience validation; short-lived access tokens; rotating refresh tokens | `sec`, e2e |
| **S** | Session fixation | Rotate session id on privilege change; bind to device id | test |
| **T** | Mass assignment | Requests parsed by schema; handlers receive the parsed type only | typecheck, test |
| **T** | Parameter-driven tenancy | `tenant_id` comes from the authenticated session, **never** from a request field | test, `sec` |
| **R** | Denied action | Append-only audit with actor, before/after (NFR-15) | test |
| **I** | IDOR | RLS at the database; 404 (never 403) for another tenant's resource | test, `sec` |
| **I** | Error leakage | Errors are a closed enum; internals never serialised to a client | test |
| **D** | Auth brute force | 10/min per IP *and* per identifier; progressive delay | test |
| **D** | Expensive queries | Cursor pagination with hard limits; query timeouts | perf |
| **E** | Client-side entitlement | Every entitlement checked server-side; client state is a hint | test |

### ⑨ Content plane — the one specific to this product

| | Threat | Control | Verified by |
|---|---|---|---|
| **T** | Corpus tampering to change recommendations | Immutable published versions; checksum verified at load; publish only via the admin application; every publish audit-logged with a diff | `content`, test |
| **T** | Rule-weight manipulation | Weights are versioned content; a change mints a new immutable version recorded in every affected envelope | test |
| **R** | Untraceable editorial change | Reviewer identity required to reach `published`; recorded | `content` |
| **I** | Unlicensed data ingested | Provenance mandatory on every entry; the `content` gate fails the build on one incomplete record | `content` |
| **E** | Editor escalating to publisher | Separate roles; publication requires a distinct reviewer from the author | test |

**Why checksums at load and not only at write.** A publish path can be secured; a database
restored from a compromised backup, or a corpus file swapped on disk in a self-hosted
deployment, cannot. Verifying at load catches both.

### ⑧ Worker — image handling

| | Threat | Control | Verified by |
|---|---|---|---|
| **D** | Decompression bomb | Hard limits: 12 MB bytes, 40 MP pixels, 5 s decode timeout, enforced *before* full decode | test |
| **E** | Decoder exploit | Decoding happens in the worker, never in the API process; container runs non-root with a read-only filesystem and no network egress | `sec`, review |
| **T** | Polyglot file | Content type verified by magic bytes, not by the supplied header or extension | test |
| **I** | EXIF leakage | All metadata stripped on ingest — GPS coordinates in a wardrobe photo are a home address | test |
| **S** | SSRF via image URL | No fetch-by-URL ingestion. Ever. Uploads only | design |

### ⑤ Database

| | Threat | Control | Verified by |
|---|---|---|---|
| **I** | Cross-tenant read | RLS with `FORCE`; `tenant_id` set per connection from the session; a missing setting errors rather than returning everything | test, `sec` |
| **T** | SQL injection | Parameterised queries via Drizzle; no string-built SQL, enforced by lint | lint, `sec` |
| **D** | Connection exhaustion | Bounded pool; statement timeout; slow-query alerting | perf |

### ① Device

| | Threat | Control | Verified by |
|---|---|---|---|
| **I** | Local data on a lost device | Tokens in Keychain/Keystore; database encrypted at rest by the platform | review |
| **T** | Tampered client | The client is never trusted: all authorisation is server-side | test |
| **I** | Image exfiltration by another app | Scoped storage; no world-readable paths | review |

### ③ Edge

| | Threat | Control | Verified by |
|---|---|---|---|
| **D** | Volumetric attack | WAF and CDN absorb; the catalog is fully cacheable so the origin is barely touched | review |
| **T** | Cache poisoning | Cache keys include corpus version and locale; `Vary` set explicitly | test |
| **S** | Host header injection | Allowlisted hosts | test |

---

## 4. Abuse

| Abuse | Control |
|---|---|
| Catalog scraping to rebuild the corpus | Per-IP limits, no bulk export endpoint, and the corpus's value is its provenance and curation, which do not scrape |
| Free-tier farming | Per-device and per-identity limits; expensive operations metered |
| Recommendation gaming | Feedback affects only the submitting user's own weights, never global ranking |
| Export abuse | 5/hour, async, quota-metered |

**Prefer making abuse pointless over detecting it.** Ordinary colour detection runs
entirely on-device, so the single most expensive operation in the product has no server
cost to attack in the first place.

---

## 5. Supply chain

- Lockfile-pinned dependencies; `pnpm` blocks lifecycle scripts by default and every
  exception in `onlyBuiltDependencies` is a reviewed decision.
- Dependency audit in CI; Critical or High blocks release.
- `gitleaks` on every push. **A finding rotates the secret** — it never earns an allowlist
  entry.
- Container images built from pinned digests, scanned, and run as non-root.
- SBOM produced per release.
- The colour engine has **zero runtime dependencies**, which removes the product's most
  security-critical code from the dependency attack surface entirely.

---

## 6. Incident response

Detection → containment → eradication → recovery → blameless postmortem. Full procedure:
[`../../operations/incident-response.md`](../../operations/incident-response.md).

**Content compromise has its own runbook**, because the response is unusual: pin every
client to the last known-good corpus version, verify checksums across the version history,
audit the diff of every publish since the suspected compromise, and only then republish.
Rolling back code does nothing for a content compromise, which is exactly why it needs to
be rehearsed separately.

---

## 7. Review cadence

Reviewed at each release and whenever a new trust boundary appears. Every control listed
here maps to a test or a gate; a control that cannot be pointed at a check is either
implemented as one or recorded as a gap with a tracked feature.
