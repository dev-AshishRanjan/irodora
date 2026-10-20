# E-207 — A badge is the shape of a recorded fact

**Link:** `recordedMaterial` (`apps/mobile/src/home.ts`) → `TextureBadge`, Home's tiles and their
names, the Wardrobe editor that writes `material`, F-256's chips, `01.json` and `25.json`
**Guard:** `home.test` (blank, spaces and null are no material); `home-states.test` (a badge exactly
where a material is recorded, its words in the tile's name, and none without); the inventory sweep
(five badges on `01.screen`); `texture-badge.test` **Severity:** medium **Feature:** F-242

---

## Why B changes when A does

`01` draws a woven mark on every wardrobe tile, and ADR-0137 gave it a meaning: the garment's
material is recorded. So the badge is not decoration. It is drawn exactly where `recordedMaterial`
returns a string, and the tile's accessible name says the same material in words.

Whatever writes `material` therefore decides two things on Home at once: whether the badge shows,
and what the tile announces. Today that is the Wardrobe editor's free text. F-256 builds `12`'s
chips, and a chip could store a code (`linen`) or an empty string. Either would change Home silently:

- a code is announced as the code, where a person expects the word;
- an empty string is no material, so a chip that saves `''` for "none" works, and one that saves a
  space or a placeholder word would draw a badge for nothing.

F-256's notes say this, and the tests above hold the reading side.

## What it does not guard

- **That a sighted person reads the mark as "material recorded".** `01` prints no word and ADR-0137
  adds none; it was not tested with people.
- **The mark's look on a device.** Its twelve cells are a count off a 28 px JPEG crop; F-242's
  capture attestation asks the person to compare one badge by hand, because the capture flow records
  no material.

Related: [[a-surface-feature-cannot-close-with-its-surface-unswept]].
