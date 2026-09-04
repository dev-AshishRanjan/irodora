# R6 — Editorial direction

| | |
|---|---|
| **Release** | R6 — "the app becomes a product" |
| **Inputs** | [`BRAND.md`](BRAND.md) · [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) · [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) · [`ACCESSIBILITY.md`](ACCESSIBILITY.md) |
| **Features** | F-140 … F-155 |
| **Date** | 2026-09-03 |

---

## 1. Why this document exists

The app was reported as looking unprofessional and low-effort, and the report is correct.
This document records what was actually wrong, so that sixteen features can be judged against
a stated direction instead of against taste.

**The finding that reframes everything: the design was never bad. It was never applied.**

[`design-system.manifest.json`](design-system.manifest.json) specifies an editorial fashion
product in some detail — a type scale from 72px to 10px, a spacing scale topping out at 96
with the note that 間 (*ma*) is a design element, tonal elevation with no shadows, a motion
system with an allow-list, and a colour ramp designed to survive being read without hue.

The application renders none of it:

| the manifest says | the app does |
|---|---|
| type from **72px** to 10px | opens every screen at **22px**; `display.1` and `display.2` used **zero times** |
| spacing to **96**, editorial rhythm | largest step used is **20**, twice; `xl2`…`xl5` used **zero times** |
| a radius scale of six steps | radius read **7 times** in the entire app |
| motion with durations and easings | **nothing animates** — no `Animated`, no transition, anywhere |
| forty HeroUI components available | **five** used; no sheet, dialog, popover, tab bar or card |
| a token system with **80** names | **36 of them declared unreached** — 45 % of the system |

Spacing is also written as numeric literals in 147 places rather than through `nativeSpacing`
— the gate confirms they all land on the scale, so those values agree with it by inspection
rather than by reference.

The home screen is ten identical secondary buttons in a scroll view, and
[`_layout.tsx`](../../apps/mobile/app/_layout.tsx) is a bare `<Stack>`, so the whole product
is push navigation over a button list.

**And every gate was green**, because each gap had been individually declared and justified in
[`unreached-tokens.json`](../../.harness/verification/unreached-tokens.json). That file is
addressed by [ADR-0088](../adr/0088-an-unreached-design-token-is-unfinished-work-not-a-declared-exemption.md).

> The [`visual-taste`](../../.harness/skills/visual-taste/SKILL.md) skill predicted this exact
> failure and named it: *"the first wireframe pass produced a correct-but-lifeless spec
> document, because 'the interface must not decorate with colour' was read as a licence to be
> austere rather than as a design direction."* It happened anyway, because no gate could
> enforce a skill.

---

## 2. The register

**Editorial fashion.** SSENSE, COS, Aesop, Net-a-Porter, Muji — near-monochrome interfaces
where the product carries the colour.

This was chosen over two alternatives that were seriously considered: a warm, playful,
colour-forward register in the manner of Blinkit or Zomato, and a split system with expressive
consumer surfaces and neutral instrument surfaces. Both were rejected for the same reason, and
it is a colour-science reason before it is a taste one — **saturated chrome adjacent to a
sample shifts the sample's perceived colour.** Simultaneous contrast is why `swatch.well` and
the two-tone keyline exist at all. An interface that decorates with colour is an interface
measuring against its own noise.

The register is not a retreat from the request. *Aesthetic, artistic, professional,
enterprise-grade, fashion-industry* is precisely what this register delivers — an entire
industry arrived at it independently, for our constraint.

**Where expressive colour lives instead:** the theme picker (F-153) and the device-seeded
theme (F-154). A person who wants a vivid app chooses a vivid seed, the chrome takes it, and
the well and keyline stay neutral. The product stays honest and the person gets their vibe.

---

## 3. The three dials, set per surface

Per the visual-taste skill, set consciously rather than inherited:

| Surface | Variance | Motion | Density |
|---|---|---|---|
| Colour page, Atlas | **high** — asymmetric, editorial | low | spacious |
| Home | high | low | spacious |
| Wardrobe | medium — a gallery grid | low | medium |
| Lens, Measure | **low** — task surfaces | minimal | medium |
| Compare, Finder, Studio | low | minimal | medium |
| Preferences, Export | low | minimal | medium |

---

## 4. Where boldness is spent

**Once, and in one place: the colour, at photograph scale.**

The swatch is currently 72px beside three lines of 13px grey text — so the artefact the
product exists to show is the smallest considered element on screen. Reversing that is the
single highest-leverage change in the release, and it is why F-147 and F-148 sit at the centre
of the sequence.

Everything else holds still. A page with three bold moves has none.

---

## 5. What does not move

These are constraints, not preferences, and no feature in R6 may relax one.

1. **Colour is never the only channel.** Anywhere. Ever.
2. **A swatch corner is bounded by the area it removes** ([ADR-0090](../adr/0090-a-swatch-corner-is-bounded-by-the-area-it-removes-not-fixed-at-zero.md)).
   This read "the swatch keeps `radius: 0`", on the reasoning that a corner removes sampled area
   from exactly the region the eye uses to judge a flat colour and that the effect grows as the
   swatch shrinks. The second half is why it is a RATIO now — 0.125, costing 1.34 % of the sample
   at every size — rather than zero. The bound stayed; the value moved.
3. **The swatch well, the two-tone keyline and the chart ramp stay neutral in every theme**,
   including a device-seeded one.
4. **Motion may never alter a colour mid-transition.** Intermediate frames of a cross-fade are
   plausible colours that never existed.
5. **No shadow.** Elevation is tonal. A shadow tints what it surrounds.
6. **Every claim stays honest.** The claims lint is binding on all new copy; an estimate is
   called an estimate.
7. **WCAG 2.2 AA, gated in both themes, both locales, and under CVD simulation.**
8. **No stereotype, no kawaii register, no body imagery, no gendered defaults**
   ([BRAND.md §4](BRAND.md#4-what-the-brand-is-not)).

---

## 6. The test that decides any disagreement

> **Put a real garment colour on screen inside this interface. Can you judge it accurately?**

If the chrome interferes — a tint, an adjacent accent, a shadow, a gradient, a rounded corner
on the sample — the surface has failed at the one thing this product exists to do, however
good it looks.

---

## 7. Sequence

Foundations first, because everything composes with them; the sweep last, because a screen
brought up to a standard that is still moving is a screen that gets done twice.

```
F-140  editorial scale reaches the screen   ─┐
F-141  the mark and the wordmark            ─┼─ foundations
F-142  icon and splash, proven in the build ─┘
F-143  the components (sheet, dialog, tabs…) ─┐
F-144  motion                                ─┴─ material
F-145  information architecture              ─┐
F-146  Home                                  ─┤
F-147  Atlas and the colour card             ─┼─ surfaces
F-148  the colour page                       ─┤
F-149  Lens · F-150 Wardrobe · F-151 Studio  ─┘
F-153  theme picker  ·  F-154 device colour   ── appearance
F-155  contemporary equivalents               ── the missing feature
F-152  the remaining surfaces                 ── the sweep
```

---

## 8. Pre-flight, before any surface is called done

From [`visual-taste`](../../.harness/skills/visual-taste/SKILL.md), reproduced because it is
the acceptance test for every surface feature in this release:

- [ ] Could this be any other product? If yes, name what makes it this one.
- [ ] Real type-scale contrast, or everything one or two steps apart?
- [ ] Is every structural device carrying information?
- [ ] Is the boldness in exactly one place?
- [ ] Both themes designed, not inverted?
- [ ] Every state present — focus-visible, active, disabled, loading, error, empty?
- [ ] No placeholder content, no half-finished sections.
- [ ] Contrast and CVD checked against the manifest, not eyeballed.
