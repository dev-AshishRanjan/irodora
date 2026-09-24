# ADR-0110 — The multicoloured icons are followed as drawn, over a silhouette that still reads in one ink

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-24 |
| **Closes** | OQ-15, OQ-37, and by name OQ-20 (`06`'s green check) and OQ-21 (`11`'s yellow bulb), which ask the same question of one icon each |
| **Feature** | F-225 (declares the chroma), then the surfaces that draw each icon |
| **Decided by** | the implementing agent, **on the person's explicit delegation** (below) |

---

## Context

Conflict C10 lists the chroma the mockups draw in chrome and follows it: `02`'s gold HUD, `04`/`12`'s
green verdicts, `24`'s tinted badges, `27`'s state art, `23`'s slider tracks and pill, `13`'s tinted
rows. It does not list the icons drawn in colour. OQ-15 asked about those as a set (`00 03 13 16 24`).
OQ-37, raised by the icon set (F-228), asked about each one:

| icon | where | drawn |
|---|---|---|
| `colour-wheel`, `palette-solid` | `00`'s icon buttons | a full hue disc; a palette with coloured wells |
| `hue-ring` | `03`'s gamut chip | a full hue ring |
| `seal-check` | `06`'s editorial-review line | green |
| `lock-solid` | `07`'s slot lock, `15`'s security badge, `16`'s locked slot | gold |
| `bulb` | `11`'s wardrobe-gap card | yellow |
| `score-harmony` | `13`'s harmony score row | three overlapping circles, red, green and blue |
| `sparkle` | `13`'s capsule heading | gold |
| `contrast` | `15`'s CVD badge | a disc split blue and olive |

Two of them (`13`'s circles and `15`'s split disc) are told apart in the image **only** by colour. So
the question decided their shape as well, and F-228 drew them as the nearest one-ink form and blocked
their surfaces.

**The delegation.** On 2026-09-24 the person answered OQ-29, OQ-35 and OQ-36 with *"Follow mockup
strictly. Decide yourself. Think reason research before deciding"*, and extended it to the other open
questions the same way (R9-MOCKUP-FIDELITY §11).

**Looked at, not only measured (2026-09-24).** Each icon was cropped and enlarged from its image, and its tinted pixels were averaged ([`mockups/tools/tint.ps1`](../../mockups/tools/tint.ps1): only pixels whose channel spread is at least 40, so the ground does not dilute them). Two of the questions' own descriptions were wrong. **`24`'s camera is drawn WHITE**, the ink every chip glyph takes. OQ-15 called it gold, so it takes no exception and leaves this list. **`15`'s split disc is blue and OLIVE** (≈ `#44628A` / `#787F57`), not amber. `13`'s circles are an additive red, green and blue diagram (≈ `#B0514E` · `#83A665` · `#535FA0`), with their overlaps mixed. The others read: `07`'s lock ≈ `#D5AB4A`, `13`'s sparkle ≈ `#AF8E45`, `06`'s seal ≈ `#50A567`, `11`'s bulb ≈ `#EFE4B6`. `15`'s and `16`'s small locks read desaturated (≈ `#AB9F62`), which is JPEG blending at that size, not a second gold. Values are F-225's to declare, each ± ΔE00 ≈ 2.

**What the research found.** In every case the meaning the icon carries is already carried by
something other than its colour:
- **Shape.** F-228 guarantees silhouette (NFR-9): every glyph differs in shape from its neighbours and
  reads in one ink, at 16 dp, under any deficiency. The icon buttons on `00` and the lock on `07` rest
  on that.
- **Text beside it** (the inventories bind a label on each surface): the gamut chip's words, the
  review line, the security and CVD badges' words, the gap card's title, the score row's label and
  figure, the capsule heading, and nothing more.

So drawing the colours adds no information that exists only in colour. Golden rule 13 is satisfied by
what is already there, and golden rule 14 asks for the colours.

## Decision

1. **Every icon above is drawn in the colours its governing mockup draws.** Each colour is a declared
   chroma-ceiling exception in the manifest with its element and reason, as C10's are. F-225 declares
   them. The single-tint icons (gold, yellow, green) take a tint token measured from the image. The
   two spectrum drawings (`00`'s wheel, `03`'s ring) are drawn as a hue spectrum and declared as one
   exception each. `00`'s palette wells, `13`'s circles and `15`'s split disc take the colours drawn.
2. **The silhouette stays, and colour is laid over it.** Each glyph keeps its one-ink drawing as its
   outline, so `13`'s harmony icon is three overlapping OUTLINED circles filled red, green and blue,
   and `15`'s badge is the ring-and-crescent silhouette filled blue and olive. Rendered in one ink,
   in greyscale or through any CVD simulation, each is still the shape F-228 registered. That is what
   unblocks the two surfaces F-228 held back.
3. **Colour is never the channel.** Wherever one of these icons appears, the text or shape that
   carries its meaning is required beside it. A surface that drops the label drops the icon's right
   to its colour.
4. C10 in R9-MOCKUP-FIDELITY §6 is extended by this list. It is no longer a separate question.

## Consequences

**Good.**
- The surfaces look as drawn: `13`'s score row, `15`'s badge row and `00`'s controls are no longer
  approximations waiting on a question.
- Nothing about meaning changes: every icon reads by shape and by text, exactly as before.

**Bad.**
- **The chrome gains more chroma**, on a product whose brief is monochrome and whose samples are the
  colours that matter. A gold lock or a spectrum wheel sits near a sample on some screens. Each
  exception is declared, and none sits inside a sample's well.
- **Two spectrum drawings and three multi-colour ones cannot be one-ink glyphs.** The registry gains a
  way to draw a glyph in more than one colour, which is a larger surface than "every glyph in its
  caller's ink" and needs its own tests.
- Tint values are read off JPEGs, with the usual ΔE00 ≈ 2 uncertainty (§5).

**Neutral.** The glyph shapes do not change. Only a fill is added where one is drawn.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **Monochrome, every icon in ink** | The brief's purest reading, and no new exceptions | Leaves six screens not as drawn, with nothing forcing the departure. Rules 11–13 and the gates all allow the colours, so golden rule 14 says draw them |
| **Colour only where the shape cannot carry it** (the circles and the split disc) | Fewer exceptions | Draws gold on `02`'s HUD (C10) and not on `07`'s lock, inconsistently, with no rule behind the line |
| **Recolour to existing tokens** (status green, accent gold) | No new tints | Changes what is drawn, and it borrows the status colours' meaning for icons that report no status |

## Revisit when

- A person comparing the surfaces with their mockups (F-267) finds the colour draws the eye from a
  sample; or
- a CVD review finds an icon whose colour is carrying meaning its shape and text do not.
