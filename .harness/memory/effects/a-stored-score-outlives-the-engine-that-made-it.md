# E-206 — A stored score outlives the engine that made it

**Link:** `OutfitScore` (`@irodora/recommendation`) → `outfit_component`, the lookbook's record
and read-back, `ScoreLines` **Guard:** `lookbook-record.test`'s replay sweep and message-key pin;
the historical lookbook fixture in `lookbook.test` and the screens registry **Severity:** high
**Feature:** F-238

---

## Why B changes when A does

Until F-238 a score was computed, shown and forgotten. A saved outfit keeps its score as computed
and is never recomputed (ADR-0136 D5). So the score's *shape* is now data on a person's phone that
every later build must render:

- six components by name;
- three directions;
- each factor's weight and contribution;
- the format of the message keys.

A change to any of them in the engine reaches every entry already saved.

## How the shape is kept from mattering

- **Slot and component are opaque text in the store**, so a fourth slot or a seventh component
  needs no migration.
- **The renderer rebuilds each sentence's key from the stored direction**, in the engine's own
  format, and a test pins the two together.
- **The entry is rendered from storage alone.** The subjects use a HISTORICAL entry, scorer `0.4.0`
  and rules `2026.07.1`, so a renderer that only understood this build's shape fails.
- **The envelope records the scorer's own version** (`RECOMMENDATION_VERSION`), so two different
  scores never carry identical versions.

## What it does not decide

How 13's five score rows map onto the six stored components is F-257's (with OQ-30). An old entry
renders the components it has, which is honest.
