# ADR-0106 — The serif is Gelasio, because the type the mockups draw is Georgia's, and Gelasio is Georgia's open-licence counterpart

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-24 |
| **Closes** | OQ-29 |
| **Feature** | F-226 (ships it); the measurement extends F-275's |
| **Decided by** | the implementing agent, **on the person's explicit delegation** (below) |

---

## Context

Every mockup that draws display type draws a serif — the wordmark on `00`, `01`, `14` and `25`,
`00`'s *Display 1* and *Title* samples, and `01`'s three-line tagline — and no mockup names the face.
F-226 ships it, and its first criterion requires a face "under the SIL OFL or an equally permissive
licence".

F-220 measured the installed serifs: `01`'s wordmark is closest to **Georgia Pro** (0.825), under a
commercial licence. F-275 fetched twenty open-licence families and scored them on the three
lower-case wordmarks: **Source Serif 4 Medium** led `01` (0.747), **Charis SIL** led `00` (0.762) and
`14` (0.793) while sitting 30th on `01`. The images disagreed, and OQ-29 asked a person to choose.

**The delegation.** Asked OQ-29 on 2026-09-24, the person answered: *"Whatever suits us, and are used
by the mockups. Be professional. Think before you decide"*; asked whether that extends to the other
open questions, *"Decide yourself. Think reason research before deciding."* So this decision is an
agent's, made on that instruction, and the evidence below is what it rests on.

**What F-275 left unmeasured.** Three wordmarks are three samples of one word. The mockups draw more
serif than that: `00`'s *Display 1* (72 px, the display step) and *Title* (22 px), and `01`'s tagline,
which F-275 skipped because it is three lines and the tool renders one. Each tagline line is one line,
so each was measured on its own.

**The measurement (2026-09-24).** The same tool (`mockups/tools/serif-match.ps1`) and the same twenty
files, re-fetched at F-275's pinned commit and verified against every sha256 in
[`serif-candidates.json`](../../mockups/tools/serif-candidates.json) — 109 candidates per crop. It
reproduces F-275's published figures exactly (`01`: Georgia Pro 0.825, Source Serif 4 Medium 0.747,
Gelasio SemiBold 0.732). Eight crops, mean mask overlap, and rank of 109 per crop:

| face | licence | mean of 8 | `00` · `01` · `14` wordmark | *Display 1* · *Title* | tagline 1 · 2 · 3 |
|---|---|---|---|---|---|
| **Gelasio SemiBold** | OFL | **0.671** (1st) | 0.699 · 0.732 · 0.615 (7 · 4 · 38) | **0.711** · 0.570 (**1** · 24) | **0.663** · 0.702 · 0.675 (**1** · 2 · 4) |
| Gelasio | OFL | 0.640 (2nd) | 0.592 · 0.719 · 0.570 | 0.664 · 0.535 | 0.660 · 0.669 · 0.709 (6 · 4 · 2) |
| Gelasio Medium | OFL | 0.638 (3rd) | 0.606 · 0.709 · 0.590 | 0.677 · 0.493 (2 · 48) | 0.663 · 0.640 · **0.730** (2 · 5 · **1**) |
| Georgia Pro | commercial | 0.637 (4th) | 0.653 · **0.825** · 0.599 (24 · **1** · 46) | 0.524 · 0.487 (39 · 50) | 0.662 · 0.673 · 0.671 |
| Source Serif 4 SemiBold | OFL | 0.606 (11th) | 0.734 · 0.713 · 0.670 | 0.442 · 0.603 (61 · 13) | 0.588 · 0.550 · 0.546 |
| Source Serif 4 Medium | OFL | 0.595 (15th) | 0.702 · 0.747 · 0.656 | 0.383 · 0.596 (74 · 16) | 0.571 · 0.569 · 0.539 |
| Charis SIL | OFL | 0.574 (25th) | **0.762** · 0.602 · **0.793** (**1** · 30 · **1**) | 0.262 · 0.626 (99 · 6) | 0.493 · 0.413 · 0.641 |

**The Gelasio family takes the top three places of 109**, above Georgia Pro — the face that wins
`01`'s wordmark outright. Gelasio is Eben Sorkin's design for Google Fonts, **metric-compatible with
Georgia**: it keeps Georgia's advance widths, which is what makes a Georgia document reflow
identically in it. That is the fact that explains the table. What the mockups draw at length — the
tagline, the display sample — is Georgia-shaped type. Gelasio is the open face built to stand in for
Georgia, so it matches where the drawing is long, and loses only where one short word is drawn
differently.

## Decision

1. **The serif is Gelasio** (SIL Open Font License 1.1, `google/fonts` `ofl/gelasio`), for the
   wordmark, *Display 1*, *Title* and every other surface the mockups draw in a serif. F-226 ships it
   with its `OFL.txt` and a `NOTICE.md` entry.
2. **The weight per role is F-226's measurement, not this record's.** SemiBold leads the mean. Regular
   and Medium are closer to the drawn widths: Regular's aspect on `01`'s wordmark is 4.34 against the
   drawn 4.31, and SemiBold's is 5.04. So stroke weight and width point to different instances.
   The tool renders a variable file through GDI+ named instances, and stroke weight read off a JPEG
   is thickened by the render's bloom. Neither is a good enough instrument to pick a weight from.
   F-226 measures stem width against the drawn stems, and records the weight it ships for each role
   with the number behind it.
3. **Georgia Pro is not licensed.** It is the closest face to one image, not to the set; buying an app-embedding
   licence is a purchase this project has not decided to make; and F-226's criterion requires an open
   licence.
4. **The Japanese serif is not decided here.** `20` and `26` draw a Mincho; F-226's second criterion
   ships one, and no Latin face answers it.

## Consequences

**Good.**
- One open-licence family, with no fee, no seat count and no embedding clause. It serves every serif
  role the mockups draw.
- It is the closest of 109 faces over the set, not over one crop, and it leads on the display sample
  and the tagline, the two places the product sets serif text at length.
- Metric compatibility with Georgia keeps the tagline's drawn line lengths and breaks, which is where
  `01` shows its type most.

**Bad.**
- **`14`'s splash and `00`'s *Title* sample are drawn in something else.** Gelasio ranks 38th and
  24th there, and Charis SIL or Lora would match `14` better. The splash will not reproduce its
  drawing's letterforms exactly, and the F-267 side-by-side comparison will show that. It is the cost of one face for a
  set that was not drawn in one.
- `01`'s wordmark is closer to Georgia Pro (0.825) than to any Gelasio instance (0.732). The wordmark
  most people see first is not the nearest possible match to its drawing.
- Upstream ships Gelasio as a variable `[wght]` file. React Native has no dependable variable-axis
  support on Android, so F-226 must ship static instances cut from it reproducibly. That is a build
  step with its own pin and check.
- Mask overlap is a shape score at one size, with each bounding box scaled independently in x and y.
  It says nothing about spacing, hinting or colour on the page, and it is not a person's judgement.

**Neutral.** F-275's pinned candidate list becomes the reproduction for this decision too; the
fetched files stay uncommitted except the one F-226 ships.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **Georgia Pro** under a commercial licence | The closest single face on any one crop — mask overlap 0.825 on `01`'s wordmark | Fourth over the set (39th on *Display 1*, 46th on `14`). A paid embedding licence is a purchase nobody has decided on. F-226 requires an open licence |
| **Source Serif 4** | Best open face on `01`'s wordmark (0.747). Optical sizes. Designed alongside Source Han Serif, which is Noto Serif JP, so it pairs with the Japanese serif by construction | Collapses on the display sample (0.383–0.442, 61st–74th) and trails on every tagline line. It matches the wordmark and not the type |
| **Charis SIL** | First on `00` and `14`, ahead of every installed face | 30th on `01`'s wordmark, 99th on *Display 1* (0.262), weak on the tagline. It matches two short words, not the display type |
| **Lora SemiBold** | Second on `00` and `14`, fourth on *Display 1* | 24th on `01`, 32nd–53rd on the tagline |
| **Two faces** — one for the wordmark, one for display | Each image could get its best match | The mockups present one brand serif; two faces is a design nobody drew, and a second licence and bundle for a word |

## Revisit when

- A mockup names the face, or the person supplies a drawing that does; or
- the person decides to license Georgia Pro, or any commercial face, for the app; or
- F-267's person-recorded side-by-side comparison says the display type reads as a different face from
  its mockup on `01`, `00` or `14`.

Reproduce: fetch the twenty files at the pinned commit per `serif-candidates.json`, then run the
eight commands listed in [`mockups/tools/README.md`](../../mockups/tools/README.md) with `-top 109`.
