# E-239 — A relationship word claims a hue angle and nothing more

**Link:** `apps/mobile/src/goes-with.ts` → `19` (`GoesWith`), the corpus, the harmony engine, the lexicon
**Guard:** `goes-with.test` over all 120 anchors, with an angle table and an oracle of its own **Severity:** high **Feature:** F-252

---

## The rule (ADR-0168)

- Curated members first, then complementary, analogous, split, triadic and tetradic. Each companion
  is realised as the nearest corpus colour within ±9° of its requested hue, chroma at or above the
  lexicon's hue floor.
- *Complementary* on a row means the hue angle is 180° ± 9°. It says nothing about lightness or
  chroma.
- Under the floor the product names no hue, so a near-grey anchor has no geometric row (45 of 120,
  F-359).

## What it does not guard

- Whether a person reads *Complementary* as more than a hue angle: the capture's comparison and F-265.
- A second definition landing with F-349: the note there says 19 reads the engine's.
