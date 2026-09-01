# Threat Model

| | |
|---|---|
| **Status** | Baseline · reviewed each release |
| **Method** | STRIDE per trust boundary |
| **Implements** | NFR-12, NFR-13, NFR-14 |
| **Version** | 2.0 · 2026-08-19 |
| **Supersedes** | Version 1.0 — nine trust boundaries across a server tier retired by [ADR-0051](../../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) |

Every control below maps to a test or a gate. A control that is only a paragraph in this
file is not a control.

---

## 1. Trust boundaries

Version 1.0 of this document had nine numbered boundaries across a device, an edge, an API,
a database, a cache, a blob store, a worker and a content plane. **Seven of them no longer
exist** ([ADR-0051](../../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).

```
 ① The device ────────────────────────────────────────────────────────
    camera · SQLite (SQLCipher) · keystore · the colour engine · images
    Everything the product does happens here.

    ┌──────────────────────────────────────────────────────────┐
    │  ② Content plane — corpus · palettes · rule weights      │
    │     ships INSIDE the app, digest-verified at load        │
    │     ← still the boundary most people forget              │
    └──────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │  ③ Imported data — a backup file, a share intent,        │
    │     a deep link, a database written by an older build    │
    │     ← the boundary the rehaul CREATED                    │
    └──────────────────────────────────────────────────────────┘

 ── no network boundary · nothing is transmitted · NFR-12 ──
```

**Removing boundaries removed threats; it did not remove all of them, and it created one.**
The danger in a local-first app is that everything feels internal, so nothing gets treated
as input. Boundary ③ is where that assumption gets exploited.

---

## 2. Assets, ranked by what losing them costs

| Asset | Loss means |
|---|---|
| **Content integrity** (corpus, palettes, weights) | Every user gets manipulated answers. No code change is visible. Silent, product-wide, hard to notice |
| **The user's data itself** | **There is no backup but their own export.** Corruption or accidental erasure is permanent — this rose sharply when the server left |
| The database encryption key | Defeats at-rest encryption entirely; wardrobe images are photographs of people's homes |
| Wardrobe images | Photographs of people's homes and possessions |
| Personal colour profiles | Appearance-adjacent inference |
| Corpus provenance records | Our licensing defence |

Content integrity is still first. An attacker who can edit a rule weight changes what every
user is told about what to wear without tripping a single code-review or deploy alarm.

Auth tokens, sessions and tenant isolation have left the list — there are none. **The second
row is new**, and it is the honest cost of the rehaul: on a server, data loss meant restoring
a backup; here it means the data is gone.

---

## 3. STRIDE by boundary

### ② Content plane — the one specific to this product

| | Threat | Control | Verified by |
|---|---|---|---|
| **T** | Corpus tampering to change recommendations | Immutable published versions; digest verified **at load on the device**, not only at build | `content`, test |
| **T** | Rule-weight manipulation | Weights are versioned content; a change mints a new immutable version recorded in every affected envelope | `content` |
| **R** | Untraceable editorial change | Reviewer identity required to reach `published`, compared as **roster ids** rather than names ([ADR-0047](../../adr/0047-editorial-identity-is-a-roster-id-not-a-name.md)) | `content` |
| **I** | Unlicensed data ingested | Provenance mandatory on every entry; the `content` gate fails the build on one incomplete record | `content` |
| **E** | Author publishing their own entry | Author and reviewer must differ, by roster id | `content` |

**The publish path moved from an application to a pull request.** Version 1.0 put content
behind an admin app with audit logging; it now lives in this repository. That is stronger in
one way — provenance is checked on **every commit** rather than only in production — and
weaker in another: **repository write access is now product write access.** Branch protection
is a security control here, not hygiene.

**Why the digest is verified at load and not only at build.** A build can be secured; an app
bundle modified on a rooted device, or a corpus file replaced in a sideloaded build, cannot.
Verifying at load catches both, and costs nothing.

### ③ Imported data — the boundary the rehaul created

| | Threat | Control | Verified by |
|---|---|---|---|
| **T** | Malicious or corrupt backup import | Every record parsed through a `@irodora/contracts` schema; import is transactional and rolls back whole | test |
| **E** | SQL injection via imported text | Prepared statements only; no string-built SQL, enforced by lint | lint |
| **T** | Database written by a newer app version | Schema version checked before open; refuse rather than guess | test |
| **D** | Import bomb — a huge or deeply nested file | Hard limits on bytes and record count before parsing | test |
| **S** | Deep link or share intent claiming to be internal | Treated as untrusted input; no privileged action reachable from one | test |

**Parse, never cast.** A row read from SQLite is not automatically ours — it may have been
written by an older build with different assumptions. `as` on data crossing this boundary is
the same defect as trusting a request body.

### ① Device

| | Threat | Control | Verified by |
|---|---|---|---|
| **I** | Local data on a lost or stolen device | SQLCipher at rest; key in Keychain/Keystore; **the user's own export is the only recovery** | review |
| **I** | The key leaking to a log or crash report | No sink exists to leak into; the prohibition is written down anyway ([ARCHITECTURE §9](../ARCHITECTURE.md#9-observability--what-we-gave-up)) | review |
| **I** | Image exfiltration by another app | App-private scoped storage; no world-readable paths | review |
| **D** | Decoder bomb in a captured or imported image | Hard limits on pixel count and wall-clock time, off the UI thread. **There is no worker process to sacrifice** — the blast radius is the user's app | test | <!-- retired-ok: Names the retired process in order to say it is gone, which is the mitigation. -->
| **T** | Polyglot file | Content type verified by magic bytes, not by extension | test |
| **I** | EXIF leakage | All metadata stripped on ingest — GPS coordinates in a wardrobe photo are a home address | test |
| **S** | SSRF via image URL | No fetch-by-URL ingestion. Ever. There is no fetch at all | design |
| **T** | Tampered client | **Accepted.** A user who modifies their own app affects only their own data. There is nothing to escalate to | design |

That last row is the one that inverted. Version 1.0 said *"the client is never trusted: all
authorisation is server-side."* There is no server-side, and there is also nothing worth
attacking — no other user's data, no entitlement, no shared store. **Client tampering stopped
being a threat and became a non-event**, which is a genuine security improvement rather than
a gap.

---

## 4. Abuse

**Almost nothing here is still abusable, because abuse requires something shared to consume.**

| Was | Now |
|---|---|
| Catalog scraping to rebuild the corpus | The corpus ships inside the app, so anyone who installs it already has the whole thing. **The defence was never rate limiting** — it is that the corpus's value is its provenance and curation, which copying does not transfer, and that copying it is a licensing violation with a paper trail |
| Free-tier farming | No tiers, no accounts, nothing metered |
| Recommendation gaming | Feedback affects only this device's own weights. It always did; now it is structural rather than a rule |
| Export abuse | Exporting is a local file write of the user's own data |

**Prefer making abuse pointless over detecting it.** That principle drove the design before
the rehaul and the rehaul completed it: there is no shared resource to exhaust, no quota to
farm, and no ranking to poison.

The one thing worth watching is not abuse of us but abuse of the user — a malicious backup
file, covered at boundary ③.

---

## 5. Supply chain

- Lockfile-pinned dependencies; `pnpm` blocks lifecycle scripts by default and every
  exception in `onlyBuiltDependencies` is a reviewed decision.
- Dependency audit in CI; Critical or High blocks release.
- `gitleaks` on every push. **A finding rotates the secret** — it never earns an allowlist
  entry.
- **The shipped bundle is the attack surface.** There is no server to patch, so a dependency
  advisory reaching a release requires a store update — which is why the audit gate blocks
  Critical and High before merge rather than reporting them after.
- Native modules are the sharpest edge: `expo-sqlite`, SQLCipher, VisionCamera and
  `expo-secure-store` all run outside the JS sandbox and all touch the two things that
  matter most — the database key and the camera. Version pins on these are reviewed, never
  ranged.
- SBOM produced per release.
- The colour engine has **zero runtime dependencies**, which removes the product's most
  security-critical code from the dependency attack surface entirely.

---

## 6. Incident response

Detection → containment → eradication → recovery → blameless postmortem. Full procedure:
[`../../operations/incident-response.md`](../../operations/incident-response.md).

**Content compromise has its own runbook**, because the response is unusual: verify digests
across the version history, audit the diff of every publish since the suspected compromise,
and only then ship a corrected bundle. Rolling back code does nothing for a content
compromise, which is exactly why it needs to be rehearsed separately.

**And it is now slower.** Version 1.0 could pin every client to a known-good corpus version
centrally. There is no central anything: a correction reaches users as an OTA update or a
store release, and until they take it they are running the compromised content. That is the
strongest argument in this document for keeping repository write access tight.

---

## 7. Review cadence

Reviewed at each release and whenever a new trust boundary appears. Every control listed
here maps to a test or a gate; a control that cannot be pointed at a check is either
implemented as one or recorded as a gap with a tracked feature.
