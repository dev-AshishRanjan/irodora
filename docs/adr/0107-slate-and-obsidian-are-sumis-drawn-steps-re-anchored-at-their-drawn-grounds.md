# ADR-0107 — Slate Graphite and Obsidian Noir are Sumi Charcoal's drawn steps re-anchored at their own drawn grounds, and a pairing that fails moves the E3 way

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-24 |
| **Closes** | OQ-36 |
| **Feature** | F-225 (implements it); the numbers are F-289's |
| **Decided by** | the implementing agent, **on the person's explicit delegation** (below) |

---

## Context

Mockup `15` draws four theme tiles — Sumi Charcoal, Slate Graphite, Obsidian Noir, Washi Minimal — and
the README specifies two of them in full (Sumi dark, Washi light). Slate and Obsidian are each drawn as
**one swatch**: `#2C323A` read from the render (no hex is printed), and `#101114` printed on its tile.
Their levels, borders and text roles are drawn nowhere. F-225 must ship all four and pass gates 9 and 10
over every declared pairing in every theme, so each theme needs a full ramp. OQ-36 asked whether to
derive the ramps, have them supplied, or ship a ground change only — and whether Slate's swatch is its
ground or its card.

**The delegation.** Asked OQ-36 on 2026-09-24, the person answered: *"Follow mockup strictly. Decide
yourself. Think reason research before deciding."*

**Ground or card — the mockup answers it.** F-220's inventory binds every tile's swatch to
`static:themes.<name>.ground`. The two themes whose values *are* known check that reading. Sumi's
swatch reads `#171A1E` against its ground `#15171B`, where its card is `#20232A`. Washi's reads
`#F3F2ED` against its ground `#F6F5F2`, where its card is `#FFFFFF`. Both read at the ground and far
from the card. Obsidian's printed `#101114` is below Sumi's ground, which only a ground can be. So `15`
draws a theme by its ground, and Slate's swatch is Slate's ground.

**What the derivation costs — measured by F-289**
(`node mockups/tools/derive-theme.mjs`, reviewed as arithmetic-exact, re-run 2026-09-24 with the same
result): every step above the ground is re-anchored, Sumi's OKLab lightness step (+0.052, +0.089,
+0.133), chroma and hue carried from Sumi's corresponding level.

| | ground | level 1 | level 2 | level 3 |
|---|---|---|---|---|
| Sumi Charcoal (drawn) | `#15171B` | `#20232A` | `#282C35` | `#323742` |
| Slate Graphite | `#2C323A` | `#3B3F46` | `#444952` | `#4F5460` |
| Obsidian Noir | `#101114` | `#1A1D24` | `#22262E` | `#2B303B` |

Obsidian introduces **no** failing pairing. Slate introduces **seven**: `foreground.2` on level 2
(4.12 against 4.5), `border.strong` on the ground (2.17 against 3), and five on `ring` and `status.*`,
tokens §5 never specified and F-225 re-tunes for every theme anyway. Sumi itself fails four:
`border.strong` on levels 1–3 and on `swatch.well`. That is F-225's work on the drawn palette, not this
decision's. The count for Slate moves with its own read error (6 to 11 across ΔE00 ±1.6) and the
qualitative result does not.

## Decision

1. **Each tile's swatch is its theme's ground.** Slate Graphite's ground is `#2C323A`, as read.
   Obsidian Noir's is `#101114`, as printed.
2. **Their levels are Sumi's drawn steps, re-anchored.** Each level sits Sumi's OKLab lightness step
   above its own ground, with Sumi's chroma and hue for that level. That is F-289's rule, implemented
   in `mockups/tools/derive-theme.mjs`. F-225 generates the two ramps from that rule, not by hand, and
   a check fails if the shipped values drift from what the rule produces.
3. **Every other role starts at Sumi's value** — text, borders, keyline, primary action. All three
   dark tiles are captioned as monochrome dark themes, and Sumi is the only one whose roles are drawn.
4. **A pairing that fails in a theme moves the E3 way, in that theme only.** That means the smallest
   OKLab lightness move, with hue and chroma held, that passes on the worst surface the token is
   drawn on. It is listed per theme in R9-MOCKUP-FIDELITY §4 E3, beside the three moves already there.
   No threshold is lowered; a blocking gate forcing a departure is one of the listed reasons golden
   rule 14 admits.
5. **Slate's read error is carried, not corrected.** The render's bias is not consistent enough to
   correct for: Sumi reads lighter than its value, Washi darker, Obsidian true. So `#2C323A` stands, and §5
   states its ΔE00 ≈ 2 uncertainty.

## Consequences

**Good.**
- All four tiles `15` draws ship. Nothing is designed beyond what the mockup already draws: its one
  dark ramp's steps, moved to grounds the mockup also draws.
- The ramps come from a script with a stated rule, so the next person can reproduce them, argue with
  the rule rather than the numbers, and see exactly which values the gates moved.
- Equal OKLab lightness steps are equal perceived steps. So cards lift off the ground in Slate and
  Obsidian by the same amount they visibly lift off it in Sumi.

**Bad.**
- **Slate spends contrast.** Its lighter ground puts its secondary text and strong border on forced
  moves that Sumi and Obsidian do not need. Slate will look slightly brighter in its text than a
  designer might have drawn it.
- **Slate's ground is a reading**, uncertain by about ΔE00 2, and the number of forced moves depends on
  it (6–11). A printed value would settle it; none exists.
- Carrying Sumi's hue into Slate's levels keeps them at h ≈ 264°. A person drawing "cool grey" might
  have cooled them further. That would be a design, and nobody has drawn one.

**Neutral.** F-225 still owes the re-tune of `ring`, `status.*`, `accent`, `chart.*` and `swatch.well`
for every theme, Sumi included. This record neither adds to that nor removes it.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **Ground change only** — Sumi's levels on each new ground | Nothing derived at all | Slate's ground (L 0.315) sits above Sumi's level 1 and level 2, so cards would be darker than the page they sit on, an inverted elevation nothing draws. On Obsidian it widens the ground-to-card step to a size nobody drew |
| **Slate's swatch is its card** | A darker Slate ground, so fewer forced moves | Contradicts the reading the two fully specified themes give, and the inventory's binding. The mockup draws a theme by its ground |
| **Steps as luminance ratios**, not lightness differences | Preserves each level's contrast ratio against the ground | On a lighter ground it makes larger lightness jumps than Sumi's, so cards would lift visibly more in Slate than in the theme that is drawn. OKLab L is the perceptual axis the token system already works in |
| **Values supplied by a person** | A designed Slate and Obsidian | The person delegated this decision instead. Supplied values would supersede the derivation (below) |
| **Ship Obsidian, hold Slate back** | Zero forced moves for everything shipped | A drawn tile left out, which golden rule 14 forbids. Slate's cost is a handful of gate-forced moves, which is what the rule already allows |

## Revisit when

- A mockup draws a Slate or Obsidian surface (a card, a border, text on either ground): the drawn
  values supersede the derived ones; or
- a printed hex for Slate Graphite appears in any mockup or README; or
- F-267's person-recorded comparison finds either theme wrong beside `15`.
