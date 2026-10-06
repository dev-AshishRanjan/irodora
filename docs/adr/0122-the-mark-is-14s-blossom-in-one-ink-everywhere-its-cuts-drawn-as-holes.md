# ADR-0122 — The mark is 14's blossom, in one ink everywhere, its cuts drawn as holes

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-06 |
| **Feature** | F-230 |
| **Supersedes** | [ADR-0093](0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md) (the five-colour icon); F-165's six-disc mark |
| **Applies** | R9-MOCKUP-FIDELITY §6 C4 (the mark and its lockups); golden rules 13 and 14; [ADR-0112](0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md) (the wordmark's face) |
| **Decided on** | C4 and the person's instruction of 2026-09-10 (*"no deviation from the mockups — we strictly need to materialise the mockup in our code"*); where the drawings leave something open, the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

The mockups draw the mark four ways (C4): `00` a coral outline, `01` a filled white blossom beside
"Irodora", `14` a silver blossom on the icon and the splash, `25` "IRODORA 彩度". C4 takes the
geometry from `14`, the in-app lockup from `01` and the splash lockup from `14`; `00`'s and `25`'s
are not used.

The product's mark is something else: F-165's six discs — five petals around a separate eye, each
gap one interval — and ADR-0093 gave the **icon** five corpus colours while the app drew it in one.
`14` draws the icon's mark in one ink (`14.icon.tile.mark` binds `text.secondary`), and no mockup
draws a coloured mark except `27`'s loading state.

F-230 measured `14`'s mark (`mark.ps1`, `mark-fit.mjs`; calibrated through a JPEG at quality 85 to
0.3 px, five decoys refused). In px — `14`'s two columns at 1.3521 dp/px, `01`'s at 0.5:

| | splash (`14.splash.mark`) | icon (`14.icon.tile.mark`) | `01.header.mark` (cross-check) |
|---|---|---|---|
| petals, first | 5, straight up (−0.01°) | 5, −0.12° | 5, 0.01° |
| orbit · radius | 36.02 · 21.11 | 35.63 · 20.55 | 24.86 · 14.48 |
| tangency gap | 0.06 | 0.39 | 0.13 |
| hub | filled to the tangency | filled | filled |
| eye · ring cut to | 9.79 · 11.86 | 9.06 · 13.04 | 4.66 · 7.20 |
| stamens to · width | 28.16 · 2.30 | 28.14 · 3.81 | 16.85 · 2.74, a 3.8 px dot at each tip |
| seams (along each notch, ring to edge) | 2.56 | 4.34 | 2.78 |

So the drawing is: **five tangent petals over a hub filled out to their tangency, petal 1 straight
up; a ring cut around a centre disc; a stamen cut along each petal; a seam cut along each notch from
the ring to the edge.** Every cut shows the surface beneath — the splash's glow shows through it.

## Decision

1. **The mark is 14's blossom, drawn from code** (`MARK` in `brand.tsx`, read by the generator).
   Its proportions are the splash reading's, as fractions of the mark's reach, recomputed by
   `brand.test` with decoys (F-165's mark, four petals, six, no ring). The petals are tangent by
   construction: their radius is the tangency's, and the hub is the tangency radius.
2. **Where 14's two renders disagree, the splash governs.** They agree on the petals and the stamens'
   reach; the icon draws its cuts wider and softer, on a gradient tile at lower contrast (ink 152
   against a ground of 36). The splash is the mark itself, larger and at the higher contrast. The
   icon's reading is recorded beside it. `01`'s dots are not adopted: C4 takes the geometry from `14`.
3. **The cuts are holes.** The ring, the stamens and the seams are clipped out of the filled shape,
   never painted in a second colour: painting them would be a second ink, and wrong on any surface
   that is not flat (the splash's glow, the icon's tile, a card).
4. **One ink everywhere, the icon included.** `Mark` takes one of `MARK_INKS` — `foreground`,
   `foreground.2`, `foreground.3`, `inverse.foreground` — and `markSvg` one colour, by type. The
   icon and the adaptive layer are dark `foreground.2` (14's `text.secondary`) on the dark
   `background` the adaptive layer composes over, so iOS and Android show one image; the splashes
   are each theme's `foreground`; the themed layer is a silhouette Android tints. `--prove` reads
   every asset's bytes and requires one ink, with ADR-0093's icon as the decoy it must refuse.
5. **27's tinted loading mark is the one declared exception** (`27.lens-working.mark`, the manifest's
   C10 exception, minted by F-236). F-236 adds its token to `MARK_INKS` when it mints it.
6. **Until F-231 builds 14's tile** (its gradient and squircle), the icon is the mark on the flat dark
   ground. That is F-231's unbuilt criterion, not a departure.

## Consequences

**Good**

- The mark everywhere is the one the mockups draw, and it reads the same in any ink: shape, not
  colour, is what makes it recognisable (BRAND §7, golden rule 13).
- One renderer path for the app, the icon and the splash, all reading one geometry.

**Bad**

- **ADR-0093's answer to "a colour product whose icon has no colour" is gone.** C4 and the person's
  *"no deviation from the mockups"* answer it now; the icon's character comes from `14`'s tile, which
  F-231 builds, and until then the icon is plainer than the drawing.
- **The cuts vanish at small sizes.** At 16 px the stamens and seams are sub-pixel; the five lobes
  carry the mark there, and the tests claim only what survives.
- The icon's reading and the splash's differ beyond the instrument's error; one had to govern.

**Neutral**

- `PETALS`, the corpus pin and its proof case leave the generator.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| Keep ADR-0093's five-colour icon | Colour on the one surface with nothing to compete | `14` draws the icon's mark in one ink, and C4 takes the mark from `14` (rule 14) |
| Paint the cuts in the ground colour | Simpler SVG | A second ink, and wrong on the glow, the tile and every card |
| A small-size variant without stamens | Crisper at 16 px | No mockup draws one; the full mark degrades to its lobes on its own |
| Trace `14` as a bitmap | Exact to the JPEG | Breaks "drawn from code" (criterion 1) and E-116's one geometry |
| Take `01`'s anther dots | `01` draws them | C4 takes the geometry from `14`, which draws none |

## Revisit when

- A mockup draws the mark differently from `14`, or a coloured mark outside `27`.
- F-231 builds `14`'s tile, and the icon's ground changes with it.
