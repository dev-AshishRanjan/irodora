# ADR-0165: What 10's and 16's controls do, the route's states, and what leaves the Studio

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-02 · **Feature** F-251 |
| **Supersedes in part** | the old Studio's role chips, Move up/down, Remove, search, Open and Start new (their capabilities kept below); F-151 c1 (with ADR-0162) |
| **Applies** | FR-49, FR-35, FR-51, FR-71; ADR-0067, ADR-0118, ADR-0128, ADR-0136, ADR-0152 D5, ADR-0156 D5; R9 §4 E4 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Decision
- **D1. Route.** `/atlas/palettes` is 10; `?view=custom`; `?draft=new|‹id›` and `?colours=` are 16. The platform
  header leaves. Back from 10 → `/atlas`; from 16 → the catalogue.
  - **As built (F-251's review, S1):** 16 is pushed over 10, so its Back and *Create & Save* go **back** to the
    catalogue beneath (a deep-linked draft with nothing beneath replaces itself with the catalogue). Navigating to the
    route again would reuse the screen on top and leave a second, stale catalogue under it. The catalogue reads the
    store again each time it comes into view; a palette it has not seen is listed and *My Custom Palettes* shown.
- **D2. 10.**
  - The segmented choice switches the view.
  - Create → `?draft=new`.
  - Apply → `offerCombination` (top the anchor, trouser the first non-accent, shoe the first accent) →
    `/wardrobe/outfit`; disabled with its reason without a profile.
  - Export Tokens → `/profile/export?palette|saved=…&format=tokens`.
  - Export Selected → 03's sheet, a single choice → Export.
  - A personal card's overflow → Edit and Delete. Edit is refused with its reason when the palette does not fit the
    slots (a role held twice), **or was built against another corpus version** (F-251's review, M4): the slots read this
    device's bundle, so editing it would re-bind its colours to today's values without saying so.
  - No personal palettes → 00's caption; the export bar says *Nothing in this view to export.* (the review, L9).
- **D3. 16's slots.**
  - Fixed by role (anchor, light, neutral, accent); rank is slot order; weights come from `deriveWeights`.
  - *Replace* puts a slot in hand, and the tray opens on the page holding its colour. Once *Replace* is pressed, its word reads *Choosing*, announced as selected, until a tile fills the
    slot (F-251’s review, M2) — an interaction 16 does not draw.
  - On opening, the first empty slot is in hand; on a full draft, the first one not locked — as 16 draws its tray with
    a tile chosen. A tile says, to a screen reader, which slot it fills or that it removes its colour.
  - A tile fills the slot in hand; choosing a colour another slot holds **moves** it (FR-49's reorder); the in-hand
    colour chosen again clears the slot.
  - A colour the person came with (08's A) arrives locked; *Locked* toggles off; a locked slot cannot be replaced or
    moved out of. *Locked* carries its on-state dot, as 16 draws *• [🔒 Locked]* (ADR-0163 D2).
  - 08's pair fills **slots 1 and 2** (F-251's review, M1), so the matrix's *Contrast Ratio (Slot 1 vs 2)* measures
    the pair the person was comparing; more colours than slots open no draft.
- **D4. The tray.** The corpus in the Atlas's order, seven a page, the chevrons paging.
- **D5. The saves.**
  - *Save Palette* saves and stays (the same id).
  - *Create & Save →* saves and goes to *My Custom Palettes*.
  - Both are disabled with `draftProblem`'s sentence in the bar's note; the note says *Saved to this device.* after a
    save.
  - Both go through `toStoreWrite`, so the schema decides.
- **D6. FR-35 (E4).** Under a separation of 20, a block under the matrix names the pair and the swap with its gain;
  *Replace — ‹the slot's role›* applies it, named by the role so its label carries no figure (FR-48). No status colour.
- **D7. The name field.** No visible label, as drawn. The label's words are the placeholder and the accessible name.
- **D8. The edit state's words (E4; F-251's review, M7).** Title *Edit Custom Palette*; action *Save & Return to
  Palettes*. No mockup draws the edit state.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| 16 as its own route | A route no index row names (E-126); 08's `colours` link breaks |
| Card selection for Export Selected | Marks a card in 10's rest state, which 10 does not draw |
| A Lock control on every slot | Three controls 16 does not draw |
| Refuse a held colour | No way to reorder (FR-49) |
| Drop FR-35 here | Its only surface disappears |
| A visible name label | A row 16 does not draw (3.3.2 risk recorded) |

## Evidence, and its limits
Device behaviour (expo-router search-param pushes, back, TalkBack) is unverified and attested.
