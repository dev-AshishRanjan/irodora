# Privacy Rules

Design: [`privacy-design.md`](../../../docs/architecture/security/privacy-design.md) ·
Governance: [`data-governance.md`](../../../docs/compliance/data-governance.md).

---

## The commitment

> **Ordinary colour detection transmits no image. Ever.**

Architecture, not policy
([ADR-0026](../../../docs/adr/0026-privacy-on-device-by-default.md)). A network assertion in
e2e fails the test if any image data is transmitted during a Lens scan, so a change that
would send frames breaks the build.

---

## Never leaves the device

- Camera frames, for colour detection.
- Wardrobe images, unless the user explicitly enables sync **and** attaches a photo. Sync
  is **off by default**.
- The photo used for photo-assisted profile setup. It is processed on-device and discarded;
  what is stored is the corrected profile.

---

## Never reaches a log, a trace, or telemetry

```
raw camera frames · image bytes · image-derived intermediates
personal colour profile dimensions · precise location
email addresses (hashed ids only) · auth tokens or secrets
```

Enforced by a **type boundary**, not a deny-list: these values are carried in types that
have no serialiser, so passing one to a log or a span attribute is a type error.

A deny-list covers the fields someone remembered. The failure is always the field nobody
thought of.

A redaction test asserts unreachability from every code path that holds this data, and
fails the build when a new path makes it reachable.

---

## Record the outcome, not the input

For a colour scan: sample count, variance, confidence, illumination class, quality class,
duration, failure reason.

That set diagnoses a bad scan completely. The image would add nothing but liability — which
is why the runbook for "diagnose a bad colour reading" works without one.

---

## The personal colour profile

- **No skin colour field exists.** A migration adding one is rejected
  ([ADR-0010](../../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md)).
- **No inference of ethnicity, health, age, gender, or any protected characteristic.** Not
  as a policy — as an absence of any code that could (NFR-22).
- Ranges with confidence, never points.
- Explicit consent, never in telemetry, deleted on request.
- **ITA° is used only to stratify the bias-validation set** (NFR-23). It is never a user
  attribute and never appears in a user-facing surface.

---

## Minimise

Before adding a field, ask what it is for. If the answer is "it might be useful", do not
add it.

- Collect what a feature needs; nothing "for later".
- Hash what you only need to compare (`email_hash` alongside the encrypted address, so
  lookup does not put plaintext in an index or a query log).
- Aggregate what you only need in bulk.
- Delete on the schedule, enforced by a job — and **a retention job that has not run is an
  alert**, not a nuisance.

---

## Consent

| Control | Default |
|---|---|
| Camera access | Explicit, requested in context at the moment of use |
| Photo library access | Explicit, per pick |
| Photo-assisted profile | Explicit, per use |

Three, and the list is short because there is nothing else to consent to. Analytics, email
and a sync toggle each needed a server and an account to be about, and there is neither
(ADR-0051). A consent row for a capability the product does not have is worse than no row:
it describes a choice nobody is being offered.

**The product is fully functional with every one of these off.** A privacy control that
degrades the product into uselessness is not a control; it is a fee.

---

## Deletion means de-indexing

A row deleted from SQLite while its text remains in the FTS5 index, its bytes in a freed page,
or its id in a sync tombstone **has not been erased**.

The erasure job enumerates every store — database, blob storage, search index, cache,
tombstones, backups within the restore window — and a re-query against each is what proves
it, not the job's exit code.

---

## Language

**We do not say "end-to-end encrypted."** The reason changed with ADR-0051 and the rule did
not: it used to be that our server could decrypt synced wardrobe images. **There is no server.** <!-- retired-ok: names the sync that was removed in order to say it is gone, which is the whole point of the paragraph; rewriting the sentence to avoid the word would delete the history that explains why the rule outlived its original reason -->
The phrase is still wrong, now for a more basic reason — end-to-end encryption describes data
protected between two ends, and there is one end. Nothing leaves the device, so there is no
channel to secure and nothing to be "end to end" about.

What the encryption does cover is a lost or stolen phone: SQLCipher over the whole database,
wardrobe photographs included, since those are BLOBs inside it rather than files beside it
(ADR-0078). It is not a claim about anything leaving the device, because nothing does.

Borrowing the phrase when the server holds a usable key is one of the most common dishonest
claims in consumer software. The honest version of "we cannot see your data" is
**local-only mode**, and that is a shipped feature.
