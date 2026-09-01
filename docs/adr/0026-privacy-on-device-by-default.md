# ADR-0026 — Ordinary colour detection transmits no image, ever

## Status

Accepted

## Date

2026-08-13

## Context

Every camera-based product faces this choice, and most of them get it wrong in the same
direction: send the image to a server, process it there, return a result. It centralises
the logic, allows model updates without an app release, and is simply easier.

It also means a company holds photographs of the inside of people's homes.

Three things make the other choice available to us in a way it is not available to most:

1. **The engine is deterministic maths, not a model.** Conversion, sampling, rejection and
   averaging run in microseconds. There is no model to host, no GPU to rent, nothing that
   needs a datacentre.
2. **NFR-17 requires offline operation anyway.** A server-side scan cannot work in airplane
   mode, and the fitting room with no signal is a primary use case, not an edge case.
3. **NFR-4 sets a 50 ms perceived budget for live pick.** A network round trip per frame is
   not merely undesirable; it is impossible.

So the privacy-preserving choice is also the faster, cheaper, more reliable one. That
alignment is what makes it durable — a privacy commitment that fights the architecture gets
eroded by the first performance review.

## Decision

**Camera frames never leave the device for ordinary colour detection. This is architecture,
enforced by a test — not policy.**

```
camera frame → local processing → colour value → frame discarded
```

1. **The full sampling pipeline runs on-device** — region selection, spatial sampling,
   outlier rejection, linear-light averaging, conversion, corpus matching, harmony,
   compatibility.
2. **The frame is discarded**, not cached, not queued, not written to a temporary file.
3. **A network assertion in e2e** fails the test if any image data is transmitted during a
   Lens scan. A future change that would send frames breaks the build.
4. **A wardrobe photograph is stored only when the user explicitly attaches one** to an
   item, and it is stored on the device, as an encrypted BLOB in the database
   ([ADR-0078](0078-wardrobe-images-are-blobs-in-the-encrypted-database.md)).
   *Amended by ADR-0051:* this item read *"images are uploaded … only if cloud sync is on — <!-- retired-ok: Quotes the superseded wording of this decision item. -->
   which is off by default"*. There is no upload and no sync, so there is no toggle either.
   <!-- retired-ok: Records what this decision originally said, which is the point of amending rather than deleting. -->
5. **EXIF is stripped on ingest.** A wardrobe photograph taken at home contains a home
   address in its GPS tags.
6. **Local-only mode** (FR-55) delivers the full core product with no account and no
   network. This is the honest version of "we cannot see your data", and it is a shipped
   mode rather than a marketing line.
7. **We do not describe this as end-to-end encryption**
   ([privacy-design §4](../architecture/security/privacy-design.md)), and the reason has
   changed. It now protects against a **lost or stolen phone**, and that is the whole of it.
   *Amended by ADR-0051:* the original reason was that *"the server can decrypt synced
   wardrobe images, because thumbnailing and restore require it"*, under envelope encryption
   against a leaked bucket. There is no server and no bucket. The phrase is still wrong here,
   for a more basic reason — end-to-end describes data protected between two ends, and there
   is one end.
   <!-- retired-ok: Records the superseded reason so the change of reasoning is legible, not just the change of wording. -->

## Consequences

**Good.** The most privacy-sensitive operation in the product generates no server-side data
at all. Scan latency is bounded by local compute, not by a network. It works offline. Our
hosting cost does not scale with scans, which is a genuine business advantage as usage
grows. The largest attack surface in a camera product is one most users never touch.

**Bad.** Engine improvements need an app release rather than a server deploy — mitigated by
OTA updates for JS-only changes on mobile. We cannot debug a bad scan by looking at the
image, which will genuinely hurt during some incidents; mitigated by rich measurement
metadata ([ADR-0022](0022-observability-opentelemetry-no-raw-imagery.md)) and by an
explicit, consented support flow for a user-supplied file. Device compute varies, so
performance is less uniform than a server would give.

**Neutral.** *Amended by ADR-0051:* this read *"server-side colour operations exist
(`POST /v1/color/*`) for external API consumers. Our own clients do not use them."* There are <!-- retired-ok: Quotes the superseded consequence, which named the retired endpoint. -->
none, and there is no external consumer — every colour operation runs on the device, which is
what makes the transmit-nothing guarantee above structural rather than a policy.
<!-- retired-ok: Records the retired endpoint the consequence was about. -->

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Server-side processing** | Centralised logic, instant updates, uniform performance, and much easier debugging. Requires holding photographs of people's homes, breaks offline operation, blows the latency budget, and scales cost with usage |
| **Hybrid: on-device by default, server for hard cases** | Best of both in principle. In practice "hard cases" expands, and the privacy claim becomes conditional in a way users cannot evaluate. A conditional guarantee is not one |
| **On-device with opt-in cloud enhancement** | Preserves the default. Adds a second pipeline to build and test for a benefit we cannot currently name — the engine is not accuracy-limited by device compute |
| **Upload, process, delete immediately** | Common and easy to say. The image still transits our infrastructure, still lands in logs and backups, and "deleted immediately" is a promise rather than a property |

## Revisit when

- A capability genuinely requires server-side image processing **and** users would
  knowingly choose it — in which case it is an explicit, separate, opted-in feature, never
  a change to this default.
