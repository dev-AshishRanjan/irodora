---
kind: decision
title: Irodora — the name, why it was chosen, and the namespace it holds
confidence: 1.0
created: 2026-08-13
scope: [root]
links: [[stack-and-architecture]]
---

# Irodora

Settled 2026-08-13, with the user, after checking availability across a shortlist.

## The name

**Irodora** — from 彩り (*irodori*), "the arrangement of colours."

Not 色 (*iro*, colour) alone. *Irodori* is colour **arranged** — the deliberate placement of
colours in relation to each other, used for the colours of a season, the arrangement of a
meal, the composition of a garment. That is exactly what the product does: it is not about
a colour, it is about colours *together*.

Coined rather than borrowed: 彩り is taken many times over, and a real word carries someone
else's meaning. *Irodora* keeps the *iro* root legible to anyone with any Japanese while
being ours.

Pronounced ee-roh-DOR-ah. Four syllables, open vowels, no consonant clusters — it survives
English, Japanese and most European languages unchanged.

## The namespace, verified free before locking

```
irodora.com  .io  .app  .co  .net  .org  .design
npm scope    @irodora
GitHub org   irodora
```

No trademark collision surfaced. **This is why the shortlist collapsed to one** — the other
candidates (Kasane, Iroscape, Irozora) each failed on the exact-match `.com`, or on spelling
recall.

## Rejected, and worth recording

**Kasane** (襲) was the strongest *concept*: 襲の色目 *kasane no irome* is the Heian system of
seasonal colour combinations formed by layered garments — the literal historical precedent
for what this product does.

`kasane.com` was taken. For a consumer brand, shipping on `kasaneapp.com` was judged the
worse trade. The concept survives in the glossary and in the editorial voice.

## Product surfaces

Irodora · Irodora Pro · Irodora Studio · Irodora API.

**Never** "the Irodora app". **Never** "Irodora AI". Never an acronym.

## The positioning line the name has to support

> A colour intelligence platform for what you wear.

Not "Japanese fashion AI". Japanese colour culture is the distinctive content foundation,
not the ceiling — the name had to leave room for general fashion, professional styling,
textiles and design. A name meaning "colour, arranged" does; a name meaning a specific
Japanese colour would not.

## On incorporation

Replace "Irodora" in the [`LICENSE`](../../../LICENSE) copyright line with the registered
entity name, and record the change in `docs/adr/`.
