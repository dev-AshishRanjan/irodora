# ADR-0113 — The type scale is board `00`'s four steps and a measured caption, and type drawn off the scale snaps to it

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Feature** | F-226 |
| **Closes** | OQ-12 (type below 14 dp), OQ-13 (type drawn off the scale) |
| **Builds on** | [ADR-0103](0103-the-scales-are-the-mockups-and-a-shadow-exists-only-where-one-is-drawn.md) (the other scales are the mockups') |
| **Decided by** | the implementing agent, **on the person's delegation** of 2026-09-24 (*"Decide yourself. Think reason research before deciding"*) |

---

## Context

F-226's third criterion reads: *"The scale is board `00`'s — Display 1 72, Title 22 in the serif; Body
16, Label 14 in the sans"*. The manifest's scale was the pre-R9 one:

| step | display.1 | display.2 | title | body | small | xs | label |
|---|---|---|---|---|---|---|---|
| px | 72 | 34 | 22 | 15 | 13 | 11.5 | 10, uppercase, 0.16 em |

Two open questions sat on the scale.

**OQ-12:** *"Type below 14 dp (`01`'s tab labels ≈ 10 dp, its card note ≈ 12 dp). A caption step, or 14
as the floor?"*
- The inventories answer it. They draw 121 `caption` elements across 17 images, including `01`'s tab
  labels on every screen (P5) and board `00`'s own seven swatch captions.
- Their measured ems below 12 dp are 92 readings across 10 images, from 8.6 to 11.9, **median 10.3**.
  `18`'s five illegible report-preview lines (5.5–7.5) are left out as not design, under §2.
- "14 as the floor" would enlarge 121 drawn elements by 18–63 %. None of §4's categories forces
  that: WCAG 2.2 sets no minimum size, no gate does, and the app already ships 10 and 11.5.

**OQ-13:** *"Measured type runs off the scale … The screens' sizes (P3), or §5's steps?"* §2 of the
fidelity contract, titled *"What 'strict' means, measurably"*, is the definition of strict the person
approved on 2026-09-10. It says a measured value snaps to the nearest §5 step, the smaller on a tie,
and that siblings drawn alike take one step. The inventories already apply it: `raw.emDp` keeps each
element's own estimate, and `type.size` records the step.

## Decision

1. **The scale is five steps:**

   | step | dp | absorbs |
   |---|---|---|
   | `display1` | 72 | `display.1` |
   | `title` | 22 | `title`, and `display.2` (34 is nearer 22 than 72) |
   | `body` | 16 | `body` (15) |
   | `label` | 14 | `small` (13) |
   | `caption` | **10.3** | `xs` (11.5), and the old `label` (10) |

   - It REPLACES the old scale (ADR-0103's precedent). The old names are deleted, not kept with new
     meanings, so every straggler is a type error.
   - The old `label`'s uppercase transform and 0.16 em tracking go with it: no mockup draws
     uppercase labels as a step.
   - Each step keeps the leading and tracking of the step it absorbs. The serif's tracking is ADR-0112's.
2. **`caption` is the measured median of every `raw.emDp` below 12 dp** (OQ-12), and it is not typed:
   `type-scale.test.ts` recomputes it from the inventories. A remeasured inventory that moves the
   median fails that test, which is intended.
3. **Type drawn off the scale snaps to it, by §2** (OQ-13). The elements the snap moves by more than
   4 dp are these, listed so F-267's comparison looks at each:

   | element | drawn | step |
   |---|---|---|
   | `22`'s four stat figures | 45.3–47.4 | `title` 22 (siblings take one step) |
   | `06.kanji` | 53 | `display1` 72 |
   | `26.hero.kanji` | 40.4 | `title` 22 |
   | `25.tagline` | 34.7 | `title` 22 |
   | `01.header.wordmark` | 34 | `title` 22 |
   | `25.hero.kanji` | 33.6 | `title` 22 |
   | `20.card.kanji` | 32.2 | `title` 22 |

   **If the person prefers each screen's drawn sizes (P3), that amends §2 and F-226's third criterion.**
   Nothing here makes it harder: the steps are data, and the drawn sizes are kept in `raw.emDp`.
4. **Faces are per element, not per step** (ADR-0112). Board `00` shows *Display 1* and *Title* in the
   serif, but the screens draw 44 sans titles, and under P3 a screen wins for its own element. So
   the serif is available at `display1`, `title` and `body`, the steps where it is drawn. A serif
   `label` or `caption` is a type error.

## Consequences

**Good.**
- The scale is the one the board declares, plus the one step the screens draw that the board's labels
  do not name. Every size a mockup draws maps to a step by a rule the person approved.
- `caption` is a measurement with a test behind it, not a number chosen to look reasonable.

**Bad.**
- **Pre-R9 screens change size until they are rebuilt** (F-242 onward):
  - body 15 → 16;
  - `small` 13 → 14;
  - `xs` 11.5 → 10.3;
  - the old 10 px uppercase labels become 10.3 px, sentence case;
  - `display.2` headings 34 → 22.

  That is ADR-0103's cost again, taken for the same reason.
- **Seven elements are drawn well off their step** (the table above). The snap reads large display
  kanji and `22`'s figures smaller than drawn. A person comparing the screens will see it, and a P3
  answer would cost more steps.
- 10.3 dp is small. It is legal (WCAG 2.2 sets no minimum), and Dynamic Type still scales it to 200 %
  (`maxFontSizeMultiplier` 2). The mockups draw it and the app already shipped 10 and 11.5, so this
  does not make anything smaller than it was.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **14 as the floor** (OQ-12) | One fewer step; larger text | Enlarges 121 drawn elements by 18–63 % with no gate or golden rule forcing it. That is designing, not following |
| **Each screen's drawn sizes** (OQ-13, P3) | Every element exactly as drawn | Contradicts §2, the person's own definition of strict. It needs a step per drawn size (34, 40, 46, 53…), which is no scale at all. It remains the person's to choose, and this record says how |
| **Add board `00`'s steps beside the old ones** | No pre-R9 screen changes | "The scale is board `00`'s" would be false, and two names per size is how a scale stops being one |

## Revisit when

- The person answers OQ-13 the other way (P3), which amends §2; or
- F-273 completes the inventories and the recomputed caption median moves; or
- a mockup draws a size between two steps often enough that the snap hides a deliberate step.
