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
- **D6. Segments sized by their words** (`fit: 'content'`), as `07` draws them. *Amended in
  increment 6:* the group spans the room the control is laid out in, **measured** (`onLayout` → its
  `minWidth`), and the segments share what their words leave. It does not grow into a scroller's
  content, which has no width until something says so — and which React Native's test mock draws
  without the row that would let the broken-flex-chain check (F-213) see it is one.
- **D7. The kimono** is outside the frame (§2, `07.json` notDesign), and no stroke of it falls inside
  `07.screen`. It is not built.
- **D8. A slot tile is a sample with its words and controls on it, never inside its accessible node**
  (increment 6). `Swatch` is an accessible pressable that groups what it holds into one node, so a
  control drawn on it would be one a screen reader cannot reach. The tile is a `Swatch` of a filled
  height (`height: 'fill'`, grown to the tile) **apart from its children** (`group={false}`): the
  sample is announced as an image beside them. On a ranked slot a press target lies under the words —
  which let a touch through and are read through its name — and Swap, Lock and the Locked badge are
  its siblings. The words are the sample's children, so every check that finds a text's ground by its
  ancestors judges them against the sample. *Amended after F-248's review, S4 and M7:* **one stop per
  tile.** The sample's own named node is the tile's press target (`Swatch group={false} onPress`), named
  with the slot's title, its colour, hex and provenance; the words drawn over it are hidden, so nothing
  is read twice. The colour in hand's tile and the anchor card's sample are images, named the same way,
  their lines hidden. The slot in hand is no longer announced as selected: a selected `Swatch` draws a
  frame `07` does not, and the slot in hand is told by its Swap and Lock, each named with the slot.
- **D9. The type steps, read** (increment 6): slot 2's *Swap* and *Lock* ink 18 px with a descender
  and 16 without (13.2 and 14.9 dp an em) — **label**, not the body increment 1 assumed; the compact
  *Swap* inks 16 px with its descender (11.7 dp) — **caption**; the pills 13 and 16 px (12.1 and
  11.7 dp) — caption; the two actions 16 and 18 px — label. The glyphs: the turn inks 18 px on slot 2
  and 15 on 3 and 4, the padlock 22, the back arrow 20, each sized by (ink − line) × 24 ÷ its path's
  extent as F-247's are. Each reading is in `07.mjs`.
- **D10. The action bar, read** (increment 8): its box starts at its 2 px rule (1261–1262 px), under
  the leaked label 07 prints above it, so the card → the bar is 32 px (21.8 dp, `lg`, the leaked
  label's space kept as F-246's rule keeps it), and the rule → the buttons 16 px (10.9 dp, `sm`). Its
  two sides, 14.3 and 11.6 dp, are siblings: `md` and `sm` tie, and the smaller is taken — `sm`. The
  save's words cannot be read apart from 400 (41% of its stems run 3 px, against 37% for the chosen
  segment's 400 in the same dark-on-light ink), so they take board 00's primary form, 500, as 06's
  *Wear It* records.

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
  note, a back word's weight, and `Swatch`'s filled height and `group={false}`); `glyph.lock` is
  minted.

## Revisit when

- The person's comparison finds an ink or a corner wrong.
