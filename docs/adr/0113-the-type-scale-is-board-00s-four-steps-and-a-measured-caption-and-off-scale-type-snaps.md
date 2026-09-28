# ADR-0113 — The type scale is board `00`'s four steps and a measured caption

| | |
|---|---|
| **Status** | Accepted. Its first version also closed OQ-13; that closure is **withdrawn** (below), and OQ-13 is open |
| **Date** | 2026-09-28 |
| **Feature** | F-226 |
| **Closes** | OQ-12 (type below 14 dp). **Not** OQ-13 |
| **Builds on** | [ADR-0103](0103-the-scales-are-the-mockups-and-a-shadow-exists-only-where-one-is-drawn.md) (the other scales are the mockups') |
| **Decided by** | the implementing agent, **on the person's delegation** of 2026-09-24 (*"Decide yourself. Think reason research before deciding"*) — for OQ-12, which the mockups answer |

---

## Context

F-226's third criterion reads: *"The scale is board `00`'s — Display 1 72, Title 22 in the serif; Body
16, Label 14 in the sans"*. The manifest's scale was the pre-R9 one:

| step | display.1 | display.2 | title | body | small | xs | label |
|---|---|---|---|---|---|---|---|
| px | 72 | 34 | 22 | 15 | 13 | 11.5 | 10, weight 600, uppercase, 0.16 em |

Two open questions sat on the scale.

**OQ-12:** *"Type below 14 dp (`01`'s tab labels ≈ 10 dp, its card note ≈ 12 dp). A caption step, or 14
as the floor?"*
- The inventories answer it. They draw 121 `caption` elements across 17 images, including `01`'s tab
  labels on every screen (P5) and board `00`'s own seven swatch captions.
- Their measured ems below 12 dp are 92 readings across 10 images, from 8.6 to 11.9, **median 10.3**.
  `18`'s five illegible report-preview lines (5.5–7.5) are left out: they are type inside a drawn
  document, at thumbnail scale.
- "14 as the floor" would enlarge 121 drawn elements by 18–63 %. None of §4's categories forces
  that: WCAG 2.2 sets no minimum size, no gate does, and the app already shipped 10 and 11.5.

**OQ-13:** *"Measured type runs off the scale … The screens' sizes (P3), or §5's steps?"* **It is not
answered here.** The first version of this record answered it with §2's snap rule, calling §2 "the
definition of strict the person approved on 2026-09-10". F-226's review showed that premise is false:
- The snap sentence entered the fidelity contract on 2026-09-14 (`56a4f5f`), in the agent-written R9
  re-cut. What the person said on 2026-09-10 was *"no deviation"*.
- F-220 raised OQ-13 on 2026-09-15 (`504cb83`), after §2 already existed. So §2 was known then, and it
  was not taken as the answer.

OQ-13 asks whether the rule or the drawings govern, and the drawings would answer it one way (P3). The
delegation covers questions the mockups answer when read strictly. This one is answered only by
overriding what they draw, so it waits for the person. F-226 does not need it: its third criterion
names the steps.

## Decision

1. **The scale is five steps:**

   | step | dp | absorbs |
   |---|---|---|
   | `display1` | 72 | `display.1` |
   | `title` | 22 | `title`, and `display.2` (34 is nearer 22 than 72) |
   | `body` | 16 | `body` (15) |
   | `label` | 14 | `small` (13) |
   | `caption` | **10.3** | `xs` (11.5), and the old `label` (10, weight 600, uppercase) |

   - It REPLACES the old scale (ADR-0103's precedent). The old names are deleted, not kept with new
     meanings, so every straggler is a type error.
   - The old `label`'s weight of 600, its uppercase transform and its 0.16 em tracking go with it:
     no mockup draws uppercase labels as a step.
   - Each step keeps the leading and tracking of the step it absorbs. The serif's tracking is
     ADR-0112's.
   - Mapping the OLD steps onto the new ones is this feature's own rewrite of pre-R9 code, not an
     answer to OQ-13. How a SCREEN sets an element drawn off the scale is that screen's feature, once
     OQ-13 is answered.
2. **`caption` is the measured median of every `raw.emDp` below 12 dp** (OQ-12), and it is not typed.
   `type-scale.test.ts` recomputes it from the inventories. A remeasured inventory that moves the
   median fails that test, which is intended.
3. **~~Type drawn off the scale snaps to it, by §2~~ — WITHDRAWN** (see Context). The elements OQ-13
   is about, drawn more than 4 dp from their nearest step, are:

   | element | drawn | nearest step |
   |---|---|---|
   | `22`'s four stat figures | 45.3–47.4 | `title` 22 as the inventory records it (72 is nearer to one of them) |
   | `06.kanji` | 53 | `display1` 72 |
   | `26.hero.kanji` | 40.4 | `title` 22 |
   | `25.tagline` | 34.7 | `title` 22 |
   | `01.header.wordmark` | 34 | `title` 22 |
   | `25.hero.kanji` | 33.6 | `title` 22 |
   | `20.card.kanji` | 32.2 | `title` 22 |

   `25`'s two rows are listed for completeness: `25` governs the light palette only (P2, C2), so its
   drawn sizes set nothing. The features that build the others (F-230, F-242, F-247, F-253, F-258)
   carry OQ-13 and wait on it.
4. **Faces are per element, not per step** (ADR-0112). Board `00` shows *Display 1* and *Title* in the
   serif, but the screens draw 44 sans titles, and under P3 a screen wins for its own element. So
   the serif is available at `display1`, `title` and `body`, the steps where it is drawn. A serif
   `label` or `caption` is a type error.

## Consequences

**Good.**
- The scale is the one the board declares, plus the one step the screens draw that the board's
  labels do not name.
- `caption` is a measurement with a test behind it, not a number chosen to look reasonable.

**Bad.**
- **Pre-R9 screens change until they are rebuilt** (F-242 onward):
  - body 15 → 16;
  - `small` 13 → 14;
  - **`xs` 11.5 → 10.3, which is SMALLER**;
  - the old 10 px labels become 10.3 px, and lose their weight (600 → 400), their uppercase and their
    tracking;
  - `display.2` headings 34 → 22.
- **Section headers now look like the caption notes under them.** Several eyebrows and small headings
  used the old `label` ("Last reading", "Today", "Wardrobe", "More ways in", "Filters", the eyebrows
  in `layout.tsx`). They are now `caption`, weight 400, in `foreground.2`, the same as a note. They
  keep their heading role, but the visual hierarchy between them is gone.
  - On Home, the lead sample's name and the quiet one's were `display.2` and `title`. Both are now
    `title`, so the lead no longer leads.
  - F-242 and F-246 rebuild those screens to their mockups, and F-267 carries this.
- 10.3 dp is small. It is legal (WCAG 2.2 sets no minimum), and Dynamic Type still scales it to 200 %
  (`maxFontSizeMultiplier` 2). But it is smaller than the 11.5 some of this text was set at before.
- **This record once claimed an OQ it had no standing to close.** The claim rested on a date nobody
  checked. The correction is recorded here rather than rewritten out of history.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **14 as the floor** (OQ-12) | One fewer step; larger text | Enlarges 121 drawn elements by 18–63 % with no gate or golden rule forcing it. That is designing, not following |
| **Keep the old `label` as a bold caption** | Section headers stay distinct on pre-R9 screens | A step no mockup draws. The screens it serves are rebuilt to their mockups from F-242 on |
| **Add board `00`'s steps beside the old ones** | No pre-R9 screen changes | "The scale is board `00`'s" would be false, and two names per size is how a scale stops being one |

## Revisit when

- The person answers OQ-13; or
- F-273 completes the inventories and the recomputed caption median moves; or
- a mockup draws a size between two steps often enough to suggest a deliberate step the board does
  not label.
