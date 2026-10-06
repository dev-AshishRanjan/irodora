# ADR-0120 — The current page is a capsule, and a carousel rests where it is drawn

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-06 |
| **Feature** | F-235 |
| **Closes** | OQ-52 (the page dots' second channel, and the small fourth dot) |
| **Applies** | golden rules 13 and 14; R9-MOCKUP-FIDELITY §4 E3; WCAG 2.2 1.4.1, 1.4.11 and 2.5.7 |
| **Decided on** | the person's delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

F-235 builds the carousel three screens draw and the page dots one screen draws.

**`25`'s page dots** sit under its hero: four dots, the current one dark (#191A1A), two grey
(#BFBFB9), and a fourth drawn at half their size. Measured at 0.817 dp/px: the current dot 9 px, the
others 8 px, the small one 4 px, centres 18 px apart. Two things are undrawn:

- **What marks the current page besides its ink.** The 1 px between 9 and 8 is within the
  threshold's reading (±1 px), so `25` marks the current page by ink alone. ACCESSIBILITY §4 makes
  golden rule 13 total: *"every meaning carried by colour is also carried by at least one of: text,
  icon, shape, pattern, or position."* The other dots' grey is also 1.69:1 on the ground.
- **What the small dot means.** No screen says.

**The carousel** is drawn three ways: `20` centres one card with its neighbours' edges peeking 39.25 dp
in across 12.5 dp gaps, and records each neighbour as an action (`select:card.previous`, `.next`);
`22` and `23` run items from the screen's inset, the last clipped at the edge. No mockup draws
motion, so where a carousel comes to rest is undrawn too.

## Research

- **WCAG 2.2 SC 1.4.1 (Use of Color)** and **ACCESSIBILITY §4**: the state needs a second channel.
  Accessible-carousel guidance names the usual one: *"use a color-independent indicator, for
  example, a filled and unfilled dot"* ([Smashing Magazine, 2023](https://www.smashingmagazine.com/2023/02/guide-building-accessible-carousels/)),
  with the current slide also marked for assistive technology
  ([W3C APG, Carousel pattern](https://w3.org/WAI/ARIA/apg/patterns/carousel)).
- **WCAG 2.2 SC 1.4.11 (Non-text Contrast)**: 3:1 for a graphic a person reads. The dots are the only
  visible statement of how many pages there are and which is shown.
- **The scrolling-dots convention**: a page control that shows a window of dots, sliding with the
  current page, draws the dots toward the window's edge smaller to say the pages continue — Instagram's
  carousel and the page controls modelled on it ([ScrollingPageControl](https://cocoapods.org/pods/ScrollingPageControl)).
  More than about ten dots cannot be counted at a glance in any case.
- **WCAG 2.2 SC 2.5.7 (Dragging Movements)**: what a drag does must also be possible with a single
  pointer. A swipe between cards is a drag.
- **Platform scrollers** (`ScrollView`'s `snapToOffsets`, iOS paging, Android's `PagerSnapHelper`)
  all come to rest on an item boundary; a free scroll stops anywhere.

## Decision

### 1. The page dots (OQ-52)

1. **The current page is a capsule**: as tall as `25`'s current dot (7.5 dp) and twice as long, in
   `25`'s ink (`foreground`). Shape is the second channel, and the capsule is the one form of it that
   changes a single drawn element: filled-and-unfilled would redraw the three other dots as rings,
   thinner and fainter than the discs `25` draws.
2. **The other dots take `foreground.3`.** `25`'s grey is 1.69:1 on its ground (E3); `foreground.3`
   is the product's quiet neutral, and clears 3:1 on the ground in every palette (5.32:1 on Washi).
3. **At most four dots show** — `25` draws four — in a window that slides to keep the current page off
   its edges. **A dot at the window's edge with pages beyond it is drawn small** (3.5 dp). `25`'s small
   fourth dot is then the first window of five pages or more; with four or fewer, no dot is small.
4. **One element, named by the caller**, whose words must print the page and the total (*Colour 1 of
   6*); the dots refuse words that do not, as the step pill does.

### 2. The carousel

1. **A neighbour is a button**, named by the caller for what it shows. `20` records the neighbours as
   actions, and 2.5.7 asks for a single-pointer way to do what the swipe does. Its target is the peek
   and the gap toward the centre (`CAROUSEL_PEEK + CAROUSEL_GAP`, 51.75 dp), past both platforms'
   tap targets; `carousel.test` holds that.
2. **Items no one can see say nothing.** Only the current item and its two neighbours reach a screen
   reader; the neighbours as buttons, their content hidden behind their names.
3. **It rests where it is drawn.** The centred form snaps to an item's centre, the leading form to an
   item's start: each drawing is a rest composition, and a carousel that stopped between items would
   show one nobody drew. Whether it feels right is a device attestation.
4. **It registers `static`.** It chooses nothing of its own and is never disabled or busy, so the
   `interactive` kind's `disabled` and `loading` states would be invented; `navigation` is earned by a
   tablist, which it does not draw. Its one control, the neighbour, is checked where it is defined.

## Amended after F-235's review (2026-10-06)

- **A neighbour is drawn as `20` draws it: an outline** — the card's edge and `md` corner, no fill,
  no content, as tall as the row — and only the current item draws its node. The first build drew
  each neighbour as the caller's own item, filled, which no mockup draws (rule 14). A swipe now slides
  outlines until the carousel comes to rest and the new current item draws.
- **A focused neighbour draws the focus ring**, told by the caller which one has focus, as `TabBar`
  is (WCAG 2.4.7). The plan asked for it; the first build left it out.

**Evidence and its limits.** The dot inks (#191A1A, #BFBFB9) and sizes were read off a JPEG at
0.817 dp/px, with ΔE00 ≈ 2 of noise and ±1 px on each size. The decision does not rest on one
reading: the grey fails 3:1 by 1.3, far past the noise, and the 1 px between the current and the
other dots is within it, which is why size was not taken as the drawing's second channel.

## Consequences

**Good**

- The current page reads without colour, and every dot clears 3:1.
- The small dot means one thing, and a set of any size draws within four dots.
- The carousel can be operated without a swipe, and a screen reader meets only what is on screen.

**Bad**

- **`25`'s current dot becomes a capsule and its grey dots darken.** Both visible on the one screen
  that draws them; recorded as an E3 departure on `25.dots`.
- **A neighbour shows no content until it is the current item**, as `20` draws it; a person sees what
  it is only by its name, read aloud, or by bringing it to the centre.
- **Snapping is unverified until a device runs it** (no JDK on the workstation for Android).
- Nothing ships the dots to a screen yet: C2 adopts `01`'s layout, and `01` draws none. They live in
  the registry until a screen needs them.

**Neutral**

- `20.carousel`, `22.compat` and a new `23.palettes.row` are `ui:Carousel`; `25.dots` records the
  inactive ink as `text.tertiary` beside the drawn one.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| Keep `25`'s dots as drawn | Exact fidelity | Ink alone marks the page (rule 13), and the grey is 1.69:1 (E3) |
| A larger current dot | Changes one element, keeps the circle | Size within a family of circles is not one of §4's channels, and the drawn 1 px difference is unreadable |
| Filled current, unfilled others | The convention the guidance names | Redraws three of `25`'s four dots as rings, fainter than the discs drawn |
| The small dot as decoration | No rule to explain | A mark that sometimes appears and means nothing is noise a person tries to read |
| A carousel that scrolls freely | No motion decision | Comes to rest on compositions no mockup draws |
| An `adjustable` carousel container | One element to swipe up and down on | Groups the current item, so a screen reader loses its content |

## Revisit when

- A mockup draws the page dots with a stated active form or more than four pages.
- A screen ships the dots (C2 flipped, or a new screen draws them).
- A device run shows the snap fighting a person's swipe.
