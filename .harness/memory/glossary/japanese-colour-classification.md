---
kind: glossary
title: The five colour classifications, and why conflating them is the failure to avoid
confidence: 1.0
created: 2026-08-13
scope: [content, apps/mobile]
links: [[wada-public-domain-is-not-the-same-as-free-to-ingest]]
---

# The five colour classifications

`classification` is a **required, displayed** field on every corpus entry (FR-23). It is the
field that keeps the corpus honest, and the one most likely to be filled in carelessly.

| Value | Means | Evidence required |
|---|---|---|
| `historical` | Attested in a dated source with a documented material or dye | A primary source with a date |
| `traditional` | An established named colour in the received canon | Multiple independent sources |
| `modern-japanese` | Contemporary usage documented in current practice | Documented current usage |
| `japanese-inspired` | **Our editorial work** | Editorial rationale |
| `editorial` | Curated for use, no historical claim | Editorial rationale |

## The failure this prevents

**Presenting our own curation as historical.**

It is the same dishonesty as copying someone else's data, pointed the other way — and it is
easier to commit, because it requires no external action. Someone builds a beautiful palette
of muted indigos, it *feels* traditional, and it ships labelled `traditional`.

The UI switches on this field and the field is not optional, so the renderer cannot present
an inspired palette as historical. That is the mechanism; the discipline is filling it in
truthfully.

## Terms behind the classifications

**伝統色 (dentōshoku)** — traditional Japanese colours. Names typically derive from the
plant, animal, mineral or dye that produced them, so a name often records a **material
process** rather than a coordinate. 藍鼠 (*ai-nezumi*) names indigo and mouse-grey, not a
hex value.

**襲の色目 (kasane no irome)** — the Heian system of seasonal colour combinations formed by
layered garments. The historical precedent for what this product does, and the source of the
rejected brand name.

**藍 (ai)** — indigo, and the dye tradition around it. Its many named gradations —
藍鼠 *ai-nezumi*, 褐色 *kachi-iro*, 納戸色 *nando-iro* — are a large part of why a naive
"navy" label is inadequate and why the corpus has value at all.

**生成り (kinari)** — the colour of undyed cloth. A colour defined by the **absence** of a
process, which is a good illustration of why these names are not coordinates.

## The language rule that follows

A rendered hex is a modern approximation of a colour historically produced by a dye on a
fibre under daylight.

**Never assert that a hex value *is* a historical colour.** "Closest digital reference",
always — enforced by the claims lint (NFR-21), because asserting identity would be false and
disrespectful to the material.
