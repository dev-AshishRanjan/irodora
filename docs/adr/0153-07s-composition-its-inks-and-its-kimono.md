# ADR-0153: 07's composition, its inks, and its kimono

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 |
| **Applies** | R9 §2, §4 E3, §6 C8/C10; [ADR-0110](0110-the-multicoloured-icons-are-followed-as-drawn-over-a-silhouette-that-reads-in-one-ink.md); ADR-0116; ADR-0121; the lessons *an ink gap loses each text's line inset* and *text over a drawing is a pairing the contrast gate never sees* |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`07` is a spec card at 0.6809 dp/px. Its horizontal composition is irregular (card insets from 0.7 to
17.7 dp), it draws controls on colour samples, a gold padlock, segments sized by their words, and
kimono line-art at its top right.

## Decision

- **D1. Intervals** are measured from `07.json`, each text's own line inset subtracted, and snapped by
  §2. Intervals tighter than the scale take `xs` and are named, with their cost recorded by
  `wear-fidelity.test`.
- **D2. The buttons on a sample.** Measured, slot 2's *Swap* and *Lock* are filled `#31363E`: the
  tonal level-3 `Button` (`surface.3` is `#323742`), its words on its own fill. Slots 3 and 4's
  compact *Swap* is outlined, its words and edge on the sample itself. Those take the ink the sample
  takes for text (C8, ADR-0116), so they pass 4.5:1 against it in every palette. A theme token would
  put dark words on a dark sample in Washi.
- **D3. The corners**, by `corner.ps1`:
  - the anchor card and the intelligence card are `md`;
  - the anchor swatch, the slot tiles, the buttons on them and the pills are `sm` (siblings drawn
    alike take one step: the tiles fit two nearer `md` and two nearer `sm`, so the smaller);
  - the occasion control is `sm`, its segments `sm` less their inset;
  - the two actions are pills.
- **D4. The header.** The back word (the colour's romaji), a 2 px rule, and the title, each at `body`
  500: they ink 26 px an em (17.7 dp), and their stems read heavier than the body-400 texts in the
  same ink. F-220's `raw.emDp` 26 was pixels.
- **D5. `glyph.lock` `#C8A145`**, in every palette, `nonText`, paired with nothing (the word carries
  the state). It is a token group carrying `07`, `15` and `16`'s padlocks.
- **D6. Segments sized by their words** (`fit: 'content'`), as `07` draws them.
- **D7. The kimono** is outside the frame (§2, `07.json` notDesign), and no stroke of it falls inside
  `07.screen`. It is not built.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| A theme token for the compact *Swap*'s words | Dark words on a dark sample in Washi |
| `status.warn` for the lock | A verdict colour |
| Equal segments | *Japanese-inspired* clipped at 384 dp |

## Evidence, and its limits

- **It rests on:** `07.json`; increment 1's readings, each recorded in `07.mjs`.
- **The limit:** a JPEG reading carries about ΔE00 2 and half a pixel of corner; the person's
  comparison judges the result.

## Consequences

- `@irodora/ui` gains additive forms (`Button on`, `ChoiceGroup` content-fit segments, `ActionBar`
  note, a back word's weight); `glyph.lock` is minted.

## Revisit when

- The person's comparison finds an ink or a corner wrong.
