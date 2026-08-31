---
name: security-review
description: Review a change for the security failures that actually happen here — tenancy, hostile images, content tampering, and claims about encryption.
---

# Skill: security-review

Threat model:
[`threat-model.md`](../../../docs/architecture/security/threat-model.md) ·
Rules: [`security.md`](../../rules/security/security.md) ·
[`privacy.md`](../../rules/security/privacy.md).

## Start with the boundary

Which trust boundary does this change touch?

```
① device  ② internet  ③ edge  ④ API  ⑤ DB  ⑥ cache  ⑦ blob  ⑧ worker  ⑨ content plane
```

**⑨ is the one people forget.** Someone who can edit the corpus or a rule weight changes
what every user is told, without touching a line of code. It is silent, product-wide, and
invisible to conventional monitoring.

## The checklist

> **The hard part of reviewing a local-first app**: everything looks internal, so nothing
> feels like input. It still is. Work the boundaries below rather than your intuition about
> what is "ours".

### Input — every boundary, not just the obvious one

- [ ] Every one of these parsed by a `@irodora/contracts` schema, never cast:
      **a SQLite row** (an older build wrote it) · **an imported backup** (another program
      wrote it) · **the corpus bundle** (shipped ≠ verified) · **native module output**
      (camera, keystore) · **a deep link or share intent** (arrives from outside).
- [ ] `as` on data crossing any of those is the defect this checklist exists to catch.
- [ ] Content type by **magic bytes**, not the supplied extension.
- [ ] Hard limits **before** full decode: bytes, pixels, wall-clock.
- [ ] Import is **transactional** — a bad record rolls the whole import back rather than
      leaving a half-populated database.

### Storage

- [ ] Parameterised queries via Drizzle. **No string-built SQL** — a local database makes
      injection worse, not better: the attacker's input and the data share one file and
      there is no second tier to stop at.
- [ ] `PRAGMA foreign_keys = ON` on every connection. SQLite defaults it **off**, so a
      schema full of `REFERENCES` enforces nothing without it.
- [ ] Schema version checked before open; a **newer** database is refused, not guessed at.
- [ ] A failed migration leaves the previous database intact.
- [ ] Erasure **reclaims**: rows hard-deleted, image files removed, FTS index updated,
      `VACUUM` run. A soft delete is not erasure.

### The key

- [ ] SQLCipher key generated on-device, held in Keychain/Keystore via `expo-secure-store`.
- [ ] **Never** in the bundle, an environment variable, a log, a crash report or a backup
      file. The key is the whole of at-rest security — exposure is an S1.
- [ ] No crypto primitive implemented by us.

### Data

- [ ] No secret in code, comment, fixture, or log.
- [ ] EXIF stripped on ingest — a wardrobe photo taken at home contains a home address.
- [ ] Image decoding is bounded and **off the UI thread**. There is no worker process to
      sacrifice; the blast radius of a decoder bomb is the user's app.
- [ ] **No fetch-by-URL.** There is no fetch at all — if a change adds one, that is the
      review.
- [ ] Nothing written to any sink that could carry a camera frame, an image buffer, a
      skin-tone estimate or a profile dimension.

### Content

- [ ] Corpus digest verified **at load on the device**, not only at build.
- [ ] Checksum verified **at load**, not only at write — a restored backup or a swapped
      file on a self-hosted box never passes through the write path.
- [ ] Every publish audit-logged with actor and diff.

### Privacy

- [ ] No image, frame, or profile dimension reachable from a log, trace or telemetry sink.
- [ ] No new field inferring a protected characteristic.
- [ ] The redaction test still passes.
- [ ] **No text anywhere calls this "end-to-end encrypted."** There is one end (ADR-0051), so
      the phrase describes a property that does not apply rather than one we fail to meet.
      The old reason — that our server could decrypt synced images — retired with the server.

### Failure behaviour

- [ ] Every security decision defaults to denial.
- [ ] An error in an authorisation check is a **denial**, not a bypass.

## Fail closed

```ts
// No — a config read failure grants access.
const canAccess = !config.requireAuth || hasValidToken(req);

// Yes.
if (config.requireAuth !== false) requireValidToken(req);
```

## Then

Run the `security` gate. Update the threat model if a boundary changed. Add an effect link
if a control now depends on something new.

**A control that cannot be pointed at a test or a gate is not a control** — it is an
intention. Either implement it as one, or record the gap with a tracked feature.
