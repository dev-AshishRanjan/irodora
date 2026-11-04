# ADR-0168: What goes with a colour on 19 — corpus colours that stand in a hue relationship to it, to a stated tolerance

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-04 · **Feature** F-252 |
| **Supersedes in part, on `/atlas/with/[slug]` only** | F-194 c1 (all twelve relationships), F-198 c2 (profile weighting); both stand on 24's routes until F-259 |
| **Applies** | FR-6, FR-73, FR-10; ADR-0045 (hue survives mapping), ADR-0158 (one ranking route), F-196; R9 §4 E1 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
19 draws one named corpus colour per row, with its relationship to the anchor and a *Wear* that needs a
slug. The harmony engine generates companions. Nothing in the product classifies the relationship of two
given colours (F-349, backlog).

## Decision
- **D1. Curated rows first.** Each curated combination holding the anchor (`combinationsContaining`), by
  slug; its other members by rank. These are FR-73's curated sets, placed first as F-196 placed them.
- **D2. Geometric rows.** Five relationships, in this order:
  - complementary (180°);
  - analogous (−30°, then +30°);
  - split (150°, then 210°);
  - triadic (120°, then 240°);
  - tetradic (90°, then 270°; its 180° is complementary's, realised once).

  Each companion `generateHarmony` produces, the source dropped by value, yields at most one row. The
  row is the first entry by `nearestByOklch(companion)` that meets all of:
  - it is not the anchor, and not already a row;
  - its chroma is at least the floor (D4);
  - its hue lies within ±9° of the companion's requested hue (`hueDistance`).

  The order is 19's drawn order for the first three. Triadic follows the README's list; tetradic, which
  the README omits, comes last.
- **D3. The tolerance, ±9°.** This is half the 18° single-hue sector of Matsuda's templates (Cohen-Or et
  al. 2006, as reproduced). The five windows are disjoint, so no corpus colour is two relationships at
  once.
- **D4. The floor.** The published lexicon's hue-term chroma floor, read from `lexicon()`, never
  retyped: 0.039 for 2026.08.1. Below it the product calls a colour grey or neutral and names no hue, so
  an anchor below it has no geometric rows. Its curated rows still show, and 00's caption says why
  (ADR-0171 D6).
- **D5. What the word claims.** The hue angle between the two colours lies within ±9° of the
  relationship's angle. It claims nothing about lightness or chroma.
- **D6. Not offered here:**
  - the six lightness and chroma kinds — a corpus colour realises them in two dimensions at once, so no
    single stated tolerance exists;
  - *warm–cool*, whose targets are absolute hues (55°, 245°), not angles from the anchor;
  - personal weighting. 19 draws nothing that could say an order was weighted, and 07 prints the fit,
    naming whose profile (ADR-0150).

  All seven kinds stay reachable on 24's routes until F-259.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Generated companions as rows | No name and no slug: *Wear* cannot act, and a name would be the nearest entry's (E-103's refusal) |
| The nearest entry to each companion, with no tolerance | A *Complementary* row any number of degrees off (rule 11) |
| ±15° (half the generator's 30° spread) | Wider than any published single-hue sector. The census: the same 45 anchors with none, and 6–8 rows for the rest instead of 5–7 |
| `NEAR_NEUTRAL_CHROMA` (0.02) as the floor | Hue relationships stated for 22 colours the lexicon calls grey (45 under 0.039, 23 under 0.02) |
| All entries in each window | A menu, not an answer (F-194) |
| Weight by the profile | An unexplained order; 19 draws no note |

## Consequences
- **45 of 120 anchors have no geometric row**, because each is under the floor. A person may want
  something for an achromatic colour — **F-359** carries that question. Build still answers on the same
  screen.
- `goes-with.ts` holds the rule; `goes-with.test` holds every anchor to it.

## Evidence, and its limits
**The census** (corpus 2026.09.3, lexicon 2026.08.1, floor 0.039, F-252's increment 1):

- **Under the floor:** 45 anchors. Every one of them, and no other, has no geometric row.
- **Geometric rows per anchor at ±9°:** 0 for 45 anchors, 5 for 3, 6 for 30, 7 for 42.
- **At ±15°:** 0 for 45, 6 for 16, 7 for 46, 8 for 13.
- **Curated rows:** 11 anchors have them.
- **The fixture and capture anchor, *aki-batake*,** opens as 19 draws: complementary *fuyu-umi* (ΔE00 36.04);
  analogous *tsuchi-gawara* (9.24) and *ko-more-bi* (28.65); split *oki-nagi* (35.29) and *fuyu-kage*
  (35.18); then triadic *sabi-do* (31.73) and tetradic *ja-mon* (28.16).

**Limits:**

- The 18° sector is defined on HSV hue, not OKLCh, and was read in secondary sources only.
- Ties at the pick follow `nearestByOklch`'s order; `goes-with.test` holds that none occurs in this corpus.
- ⇄ The tolerance and the floor are the person's to flip.

## Revisit when
F-349 lands a classifier (19 reads it), or a person answers F-359.
