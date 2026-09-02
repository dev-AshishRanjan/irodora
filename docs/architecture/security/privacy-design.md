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

**Every row says "device", and that is the entire inventory.**

| Data | Purpose | Location | Retention | Basis |
|---|---|---|---|---|
| Camera frames | Colour measurement | Device only, in memory | Discarded immediately | — |
| Colour values | The product | Device | Until deleted | — |
| Wardrobe images | Item recognition and display | Device, encrypted BLOBs in the database | Until deleted | — |
| Personal colour profile | Compatibility scoring | Device | Until deleted | — |

**Never collected:** precise location, contacts, biometric templates, facial recognition
data, health data, ethnicity, or any inferred protected characteristic.

**What version 1.0 listed here and this table does not.** Email address, session and device ids,
analytics events, audit events and support correspondence — five rows, every one of them stored
on a server, three with a lawful basis and a retention period. All five went with
[ADR-0051](../../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md): there is
no account to identify, no session to expire, no collector to send an event to, and no operator
to correspond with.

The `Basis` column is dashes now for the same reason. A lawful basis is something you need in
order to process someone's data; **we do not process it, because it never reaches us.** Naming a
basis anyway would imply a processing relationship that does not exist.

> **This table was wrong for months and no gate saw it**, which is worth recording beside the
> correction. F-107 widened the retired-vocabulary scan to reach this file and it flagged §4 and
> §5 — but not this table, because the scan matches a **declared vocabulary** and the word
> `server` is deliberately not in it: across this repository the sentences that survive are
> overwhelmingly the ones *denying* a server, and a term firing on those would punish the
> correction rather than the rot. This section was found by reading. **A vocabulary scan narrows
> the reading; it does not replace it.**

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

> **Superseded, and recorded rather than deleted.** This table used to describe TLS 1.3, HSTS, <!-- retired-ok: The record of what this table used to say. Deleting the words would delete the record. -->
> certificate pinning, per-tenant data keys and a KMS master key. All of it was true of the <!-- retired-ok: Continuation of the superseded-table record above. -->
> architecture in version 1.0 and none of it survived ADR-0051. It stood here for months after
> the server was retired because gate 0's retired-vocabulary check reads **feature criteria and
> PRD rows only** — architecture and security documents are outside its corpus, which is how a
> document could keep saying *"per-tenant data key"*, a term literally on that check's own <!-- retired-ok: Quotes the term as the evidence for the defect F-107 fixed. The quotation IS the point. -->
> retired list, with every gate green. **F-107 extended the scan**, and this document is now
> in its corpus.

**Local-only mode (FR-55) is not a mode.** It was the stronger option in version 1.0, chosen by
people who wanted it. It is now simply what the product is, for everyone, by construction.

---

## 5. Consent and control

**There is almost nothing to consent to, and that is the design.** Version 1.0 needed this
section because it listed the ways data could leave: sync, upload, analytics, marketing. None of
those exist after [ADR-0051](../../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md),
so every row below is about something that happens **on the device**.

| Control | Default | Effect |
|---|---|---|
| Photo-assisted profile setup | Explicit, per use | The camera is used once and the image is discarded (FR-27) |
| Camera colour capture | Explicit, per capture | Frames are processed on device; nothing is written unless you save the item |
| Wardrobe photos | Explicit, per item | Stored as encrypted blobs in the local database ([ADR-0078](../../adr/0078-wardrobe-images-are-blobs-in-the-encrypted-database.md)) |

**No analytics, no product events, no crash telemetry, no marketing email.** Not "off by
default" — absent. There is no account to attach an event to and no endpoint to send one to.

That is worth stating as a fact rather than as a setting, because **a toggle implies a mechanism
behind it**. A row reading *"Analytics — off"* tells a reader there is an analytics pipeline
they are opting out of, and there is not one to opt out of.

The app is fully functional with every one of these declined, because declining them removes a
convenience rather than the product. That was true in version 1.0 as a design commitment; it is
now true by construction (FR-55).

---

## 6. Data-subject rights (FR-58)

**Every one of these is exercised by the person, on their device, without asking us.** Version
1.0 answered them with endpoints — `POST /v1/me/export`, `DELETE /v1/me` — and a 30-day <!-- retired-ok: Names the retired endpoints in order to say there is nobody to send a request to. -->
fulfilment window. There is nobody to make the request to now, which changes what this section
has to guarantee: not that we will respond, but that **the app itself can do it**.

| Right | Implementation |
|---|---|
| Access / portability | Export from the app — every record, re-importable to a byte-identical database (FR-58) |
| Erasure | Delete on the device, immediate; there is no copy anywhere else to reach |
| Rectification | Editable in the app; profile corrections are first-class (FR-27) |
| Restriction | Stop using it, or delete it. There is no account to suspend |
| Objection | No profiling, no advertising, no analytics — nothing to object to |

**Erasure must reclaim, not just delete.** A row deleted from SQLite while its text remains in a
search index or its key in a cache has not been erased. FR-58 requires erasure to be verified by
a re-query returning nothing from each store.

**What retiring the server removed from this section, and what it added.** It removed the
fulfilment window, the automated jobs and the sync tombstones — there is no second copy to chase.
It added a harder obligation: **a right the person cannot exercise without us is not a right they
have**, so export and erasure are product features with e2e coverage rather than an operational
promise. FR-58 also states the cost plainly — with no server, a lost device is lost data — and
the app prompts for an export before any destructive action rather than implying a safety net it
does not have.

---

## 7. Children

Not directed at children. Minimum age 13 (16 where local law requires). No age-gated
personalisation, no advertising, no profiling.

---

## 8. Sub-processors and transfers

**There are none, and that is the whole section.**

A sub-processor processes personal data on our behalf, and a transfer moves it across a
border. Both need the data to leave the device, and nothing does
([ADR-0051](../../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)). There
is no server to send it to, no account to attach it to, and no analytics endpoint.

So there is no sub-processor list to keep current, no notice to give before adding one, and no
in-region question to answer — the data is in exactly one region, which is wherever the phone
is. This is the section that says so, rather than an absent section somebody has to infer the
meaning of.

**What would change it:** any feature that transmits anything. There is none planned, and the
first one would need this section rewritten and a data-governance record before it shipped,
not after.

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
