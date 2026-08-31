# Privacy Design

| | |
|---|---|
| **Status** | Baseline |
| **Implements** | NFR-12, NFR-13, NFR-22, FR-58 |
| **Decisions** | [ADR-0026](../../adr/0026-privacy-on-device-by-default.md) |
| **Regulatory** | [`../../compliance/data-governance.md`](../../compliance/data-governance.md) |

---

## 1. The commitment

> **Ordinary colour detection never transmits an image.**

Not "we delete it promptly." Not "we process it securely." The bytes do not leave the
device.

```
camera frame → local processing → colour value → frame discarded
```

This is architecture, not policy, and it is asserted in e2e by a network interceptor that
fails the test if any image data is transmitted during a Lens scan. A future change that
would send frames to a server breaks the build.

**Why this is achievable here and not for most camera products:** the colour engine is
deterministic maths that runs in microseconds on the device. There is no model to host, no
GPU to rent, nothing that needs a datacentre. Privacy is the *by-product* of the
architecture rather than a constraint fought against — which is why it will still be true
in three years.

---

## 2. Data inventory

| Data | Purpose | Location | Retention | Basis |
|---|---|---|---|---|
| Camera frames | Colour measurement | Device only, in memory | Discarded immediately | — |
| Colour values | The product | Device; server if signed in | Until deleted | Contract |
| Wardrobe images | Item recognition and display | Device; object storage if sync on | Until deleted | Consent |
| Personal colour profile | Compatibility scoring | Device; server if sync on | Until deleted | Consent |
| Email address | Account identity | Server, encrypted | Account lifetime | Contract |
| Session and device ids | Auth, sync | Server | Expiry + 30 days | Contract |
| Analytics events | Product improvement | Server, pseudonymous | 25 months | Legitimate interest, opt-out |
| Audit events | Accountability | Server, append-only | 7 years | Legal obligation |
| Support correspondence | Support | Helpdesk | 24 months | Legitimate interest |

**Never collected:** precise location, contacts, biometric templates, facial recognition
data, health data, ethnicity, or any inferred protected characteristic.

---

## 3. Personal colour is the sensitive part — and it is designed down

A personal colour profile is *appearance-adjacent*. Under GDPR it is not special-category
data as we model it, but treating it casually because it is technically permitted would be
the wrong instinct.

Four decisions follow:

1. **Ranges, not points.** The profile stores lightness ranges, temperature bias, chroma
   tolerance and contrast preference — never a skin colour value
   ([ADR-0010](../../adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md)). The
   schema has no such field, and a migration adding one is rejected.
2. **The photo never persists.** Photo-assisted setup (FR-27) derives ranges on-device,
   presents them for correction, and discards the image. What is stored is the corrected
   profile, not the input.
3. **No inference beyond colour.** No ethnicity, no age, no gender, no health signal is
   derived, stored or inferred. Not as a policy — as an absence of any code that could
   (NFR-22).
4. **Never in telemetry.** Profile dimensions cannot reach a log or a trace. A redaction
   test asserts this and fails the build if a new path makes them reachable.

---

## 4. Encryption, described honestly

| Layer | Mechanism |
|---|---|
| In transit | **Nothing to protect.** There is no server, no account and no sync ([ADR-0051](../../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)). The Android build does not hold `INTERNET`, and gate 16 asserts that against the shipped APK rather than against the config |
| At rest — database | **SQLCipher**, with a 256-bit key generated on the device |
| At rest — wardrobe images | **The same SQLCipher database.** The bytes are a BLOB in `garment_image`, not a file beside it ([ADR-0078](../../adr/0078-wardrobe-images-are-blobs-in-the-encrypted-database.md)) |
| The key | iOS Keychain / Android Keystore, never in the bundle, never in an environment variable, never in a log. Rotatable |

**This is not end-to-end encryption, and we do not call it that** — but the reason has
changed, and stating the current one matters more than keeping the old sentence.

The old reason was that our server could decrypt your wardrobe images. **There is no server.**
The phrase is still wrong here, and now for a more basic reason: end-to-end encryption
describes data protected in transit between two ends, and there is one end. Nothing leaves the
device, so there is no channel to secure and nothing to be "end to end" about. Borrowing the
phrase would be claiming a property that does not apply rather than one we fail to meet.

What the encryption above actually protects against is a **lost or stolen phone**, and that is
the whole of it. It does not protect against someone who has your unlocked device, and it is
not a claim about anything leaving it, because nothing does.

> **Superseded, and recorded rather than deleted.** This table used to describe TLS 1.3, HSTS,
> certificate pinning, per-tenant data keys and a KMS master key. All of it was true of the
> architecture in version 1.0 and none of it survived ADR-0051. It stood here for months after
> the server was retired because gate 0's retired-vocabulary check reads **feature criteria and
> PRD rows only** — architecture and security documents are outside its corpus, which is how a
> document could keep saying *"per-tenant data key"*, a term literally on that check's own
> retired list, with every gate green. Extending the scan is filed as F-107.

**Local-only mode (FR-55) is not a mode.** It was the stronger option in version 1.0, chosen by
people who wanted it. It is now simply what the product is, for everyone, by construction.

---

## 5. Consent and control

| Control | Default | Effect |
|---|---|---|
| Cloud sync | **Off** | Everything stays on the device |
| Analytics | Off in EU/UK; opt-out elsewhere | No product events collected |
| Image upload | Explicit, per item | Bytes stay local until you choose otherwise |
| Photo-assisted profile | Explicit | Camera used once, image discarded |
| Marketing email | Off | Double opt-in |

The app is fully functional with every one of these off. A privacy control that degrades
the product into uselessness is not a control; it is a fee.

---

## 6. Data-subject rights (FR-58)

| Right | Implementation |
|---|---|
| Access / portability | `POST /v1/me/export` → machine-readable archive of every personal record |
| Erasure | `DELETE /v1/me` → hard delete **and de-index**, including tombstones and search indexes |
| Rectification | Editable in the app; profile corrections are first-class (FR-27) |
| Restriction | Account can be suspended without deletion |
| Objection | Analytics opt-out; no profiling for advertising exists to object to |

Fulfilled within 30 days; typically minutes, since both are automated jobs.

**Erasure must reclaim, not just delete.** A row deleted from SQLite while its text
remains in a search index, its key in a cache, or its id in a sync tombstone has not been
erased. The erasure job enumerates every store and is verified by a re-query returning
nothing from each.

---

## 7. Children

Not directed at children. Minimum age 13 (16 where local law requires). No age-gated
personalisation, no advertising, no profiling.

---

## 8. Sub-processors and transfers

Every sub-processor is listed in
[`../../compliance/data-governance.md`](../../compliance/data-governance.md) with its
purpose, location and safeguard. Users are notified before a new one processes their data.

EU/UK data can be kept in-region — a direct benefit of the deployment portability in
[ADR-0016](../../adr/0016-deployment-profiles-local-vps-cloud.md). Region is a deployment
choice, not an architectural rewrite.

---

## 9. Privacy by design — what was actually decided

Not a checklist. These are the choices that had a cost and were made anyway:

- The colour engine runs on the device, so the most privacy-sensitive operation in the
  product generates no server-side data at all.
- The profile has no skin-colour field, so the false precision it would enable cannot be
  built on top of it later by someone who did not read this document.
- Sync is off by default, so the default user is invisible to us.
- EXIF is stripped on ingest, because a wardrobe photograph taken at home contains a home
  address.
- Analytics track events, never imagery — and the redaction test makes that structural
  rather than a convention.
